// Serveur de développement : pages React, relais vers la chaîne, fichiers publics.
// Aucune logique métier ici (ADR 0001).
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { immeubleOuCreer, lireImmeuble } from "../scripts/immeubles";

const DONNEES = path.resolve(__dirname, "../donnees");
const IMMEUBLES = path.join(DONNEES, "immeubles");

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

export default defineConfig({
  root: __dirname,
  plugins: [react(), fichiersPublics(), registreImmeubles()],
  server: {
    port: 5173,
    // Relais vers la chaîne locale : le navigateur reste sur la même origine (pas de CORS)
    proxy: { "/rpc": { target: "http://127.0.0.1:8545", rewrite: () => "/" } },
  },
});
