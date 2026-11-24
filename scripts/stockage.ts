// Fichiers produits par les scripts, rangés dans donnees/ (ignoré par git)
import fs from "fs";
import path from "path";
import { DOSSIER_DONNEES } from "./comptes";
import { FichierLot, Immeuble } from "./formats";
import { empreinteImmeuble, nouveauSel } from "./hachage";

// Les formats sont dans formats.ts (sans fs, utilisables par le web)
export type { DocumentSigne, FichierLot, Immeuble, Recu } from "./formats";

export const FICHIER_EN_ATTENTE = path.join(DOSSIER_DONNEES, "en-attente.json");
export const DOSSIER_RECUS = path.join(DOSSIER_DONNEES, "recus");
export const DOSSIER_REGISTRES = path.join(DOSSIER_DONNEES, "registres");
export const DOSSIER_LOTS = path.join(DOSSIER_DONNEES, "lots");
export const DOSSIER_IMMEUBLES = path.join(DOSSIER_DONNEES, "immeubles");

// Dans le prototype, ce fichier remplace l'échange entre le courtier et l'émetteur.
// Créé au premier usage, puis toujours relu : le même immeuble garde le même sel.
export function immeubleDe(cadastre: string): Immeuble {
  const fichier = path.join(DOSSIER_IMMEUBLES, `${cadastre}.json`);
  const existant = lireJson<Immeuble | null>(fichier, null);
  if (existant) return existant;
  const sel = nouveauSel();
  const nouveau = { cadastre, sel, immeuble: empreinteImmeuble(cadastre, sel) };
  ecrireJson(fichier, nouveau);
  return nouveau;
}

export function fichierLot(numeroLot: number) {
  return path.join(DOSSIER_LOTS, `lot-${numeroLot}.json`);
}

export function lireJson<T>(fichier: string, defaut: T): T {
  if (!fs.existsSync(fichier)) return defaut;
  return JSON.parse(fs.readFileSync(fichier, "utf8"));
}

export function ecrireJson(fichier: string, contenu: unknown) {
  fs.mkdirSync(path.dirname(fichier), { recursive: true });
  fs.writeFileSync(fichier, JSON.stringify(contenu, null, 2));
}
