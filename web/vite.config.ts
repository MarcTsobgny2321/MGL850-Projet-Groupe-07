// Serveur de développement : pages React, relais vers la chaîne, fichiers publics.
// Aucune logique métier ici (ADR 0001).
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";
import { IncomingMessage } from "http";
import { immeubleOuCreer, lireImmeuble } from "../scripts/immeubles";

const DONNEES = path.resolve(__dirname, "../donnees");
const IMMEUBLES = path.join(DONNEES, "immeubles");
const RACINE = path.resolve(__dirname, "..");
const TAILLE_PDF_MAX = 20 * 1024 * 1024;
const executerFichier = promisify(execFile);

// Seuls les fichiers publics sont servis : jamais recus/, registres/ ni immeubles/
const PUBLICS = /^\/donnees\/(deploiement\.json|lots\/lot-\d+\.json)$/;

function fichiersPublics(): Plugin {
  return {
    name: "fichiers-publics",
    configureServer(serveur) {
      serveur.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!PUBLICS.test(url)) return next();
        const fichier = path.join(DONNEES, url.replace("/donnees/", ""));
        if (!fs.existsSync(fichier)) {
          res.statusCode = 404;
          return res.end();
        }
        res.setHeader("Content-Type", "application/json");
        res.end(fs.readFileSync(fichier));
      });
    },
  };
}

// Simule le logiciel privé du courtier (ADR 0001) : seule exception aux fichiers publics.
// GET lit sans jamais créer ; POST crée le sel à l'ouverture d'un dossier.
function registreImmeubles(): Plugin {
  return {
    name: "registre-immeubles",
    configureServer(serveur) {
      serveur.middlewares.use((req, res, next) => {
        const m = /^\/api\/immeuble\/([^/?]+)$/.exec(req.url ?? "");
        if (!m) return next();
        res.setHeader("Content-Type", "application/json");
        try {
          const immeuble = req.method === "POST" ? immeubleOuCreer(IMMEUBLES, m[1]) : lireImmeuble(IMMEUBLES, m[1]);
          if (!immeuble) res.statusCode = 404;
          res.end(JSON.stringify(immeuble));
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ erreur: (e as Error).message }));
        }
      });
    },
  };
}

class ErreurRequete extends Error {
  constructor(readonly statut: number, message: string) {
    super(message);
  }
}

async function lirePdf(req: IncomingMessage): Promise<Buffer> {
  const morceaux: Buffer[] = [];
  let taille = 0;

  for await (const morceau of req) {
    const buffer = Buffer.isBuffer(morceau) ? morceau : Buffer.from(morceau);
    taille += buffer.length;
    if (taille > TAILLE_PDF_MAX) {
      req.resume();
      throw new ErreurRequete(413, "Le PDF dépasse la limite de 20 Mo.");
    }
    morceaux.push(buffer);
  }

  if (taille === 0) throw new ErreurRequete(400, "Aucun PDF reçu.");
  const pdf = Buffer.concat(morceaux);
  if (!pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new ErreurRequete(400, "Le fichier reçu n'est pas un PDF valide.");
  }
  return pdf;
}

async function lancerScript(nom: string, argumentsScript: string[]) {
  try {
    return await executerFichier(
      process.execPath,
      ["-r", "ts-node/register", path.join(RACINE, "scripts", nom), ...argumentsScript],
      { cwd: RACINE, maxBuffer: 1024 * 1024 },
    );
  } catch (e) {
    if (e instanceof Error && "stderr" in e && typeof e.stderr === "string" && e.stderr.trim()) {
      throw new Error(e.stderr.trim());
    }
    throw e;
  }
}

// Démo locale seulement : les clés des émetteurs sont des comptes de test Hardhat.
function emissionDocuments(): Plugin {
  let emissionsEnFile: Promise<unknown> = Promise.resolve();

  return {
    name: "emission-documents",
    configureServer(serveur) {
      serveur.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (url.pathname !== "/api/emission") return next();

        res.setHeader("Content-Type", "application/json");
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Allow", "POST");
          return res.end(JSON.stringify({ erreur: "Méthode non autorisée." }));
        }

        try {
          if (!req.headers["content-type"]?.startsWith("application/pdf")) {
            throw new ErreurRequete(415, "Le contenu doit être un PDF.");
          }

          const role = url.searchParams.get("role");
          if (role !== "inspecteur" && role !== "syndicat") {
            throw new ErreurRequete(400, "Choisir un émetteur valide.");
          }

          const cadastre = url.searchParams.get("cadastre") ?? "";
          if (!/^\d{1,12}$/.test(cadastre)) {
            throw new ErreurRequete(400, "Le numéro de cadastre doit contenir de 1 à 12 chiffres.");
          }

          const parametreJours = url.searchParams.get("jours");
          const jours = Number(parametreJours);
          if (parametreJours === null || !Number.isInteger(jours) || jours < 0 || jours > 3650) {
            throw new ErreurRequete(400, "La durée doit être un nombre entier entre 0 et 3650 jours.");
          }

          const nomParametre = url.searchParams.get("nom") ?? "document.pdf";
          const nomDocument = path.basename(nomParametre.replace(/\\/g, "/"))
            .replace(/[\u0000-\u001f]/g, "")
            .slice(0, 255);
          if (!nomDocument.toLowerCase().endsWith(".pdf")) {
            throw new ErreurRequete(400, "Le nom du document doit se terminer par .pdf.");
          }

          const pdf = await lirePdf(req);
          const operation = emissionsEnFile.then(async () => {
            const identifiant = `emission-${randomUUID()}`;
            const fichierTemporaire = path.join(os.tmpdir(), `${identifiant}.pdf`);
            try {
              await fs.promises.writeFile(fichierTemporaire, pdf, { mode: 0o600 });
              await lancerScript("emettre.ts", [fichierTemporaire, role, cadastre, String(jours)]);

              const fichierRecu = path.join(DONNEES, "recus", `${identifiant}.json`);
              const recu = JSON.parse(await fs.promises.readFile(fichierRecu, "utf8"));
              recu.document = nomDocument;
              await fs.promises.writeFile(fichierRecu, JSON.stringify(recu, null, 2));

              const scellement = await lancerScript("sceller.ts", []);
              const numeroLot = Number(/Lot (\d+) scellé/.exec(scellement.stdout)?.[1]);
              if (!numeroLot) {
                const refus = scellement.stdout.split("\n").find((ligne: string) => ligne.includes("Refusé"));
                throw new Error(refus
                  ? `Le document a été refusé au scellement : ${refus.trim()}`
                  : "Le scellement du lot n'a pas abouti.");
              }

              const fichierLot = path.join(DONNEES, "lots", `lot-${numeroLot}.json`);
              const lot = JSON.parse(await fs.promises.readFile(fichierLot, "utf8"));
              const documentScelle = lot.documents.some((doc: { empreinte: string }) => doc.empreinte === recu.empreinte);
              if (!documentScelle) throw new Error("Le lot scellé ne contient pas le document émis.");

              return { recu, numeroLot, dateScellement: lot.dateScellement };
            } finally {
              await fs.promises.rm(fichierTemporaire, { force: true });
            }
          });
          emissionsEnFile = operation.then(() => undefined, () => undefined);
          res.end(JSON.stringify(await operation));
        } catch (e) {
          const statut = e instanceof ErreurRequete ? e.statut : 500;
          const message = e instanceof Error ? e.message : String(e);
          console.error(`Émission web échouée : ${message}`);
          res.statusCode = statut;
          res.end(JSON.stringify({ erreur: message }));
        }
      });
    },
  };
}

export default defineConfig({
  root: __dirname,
  plugins: [react(), fichiersPublics(), registreImmeubles(), emissionDocuments()],
  server: {
    port: 5173,
    // Relais vers la chaîne locale : le navigateur reste sur la même origine (pas de CORS)
    proxy: { "/rpc": { target: "http://127.0.0.1:8545", rewrite: () => "/" } },
  },
});
