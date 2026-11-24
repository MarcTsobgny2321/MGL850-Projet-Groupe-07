// Fichiers produits par les scripts, rangés dans donnees/ (ignoré par git)
import fs from "fs";
import path from "path";
import { DOSSIER_DONNEES } from "./comptes";
import { FichierLot, Immeuble } from "./formats";
import { immeubleOuCreer } from "./immeubles";

// Les formats sont dans formats.ts (sans fs, utilisables par le web)
export type { DocumentSigne, FichierLot, Immeuble, Recu } from "./formats";

export const FICHIER_EN_ATTENTE = path.join(DOSSIER_DONNEES, "en-attente.json");
export const DOSSIER_RECUS = path.join(DOSSIER_DONNEES, "recus");
export const DOSSIER_REGISTRES = path.join(DOSSIER_DONNEES, "registres");
export const DOSSIER_LOTS = path.join(DOSSIER_DONNEES, "lots");
export const DOSSIER_IMMEUBLES = path.join(DOSSIER_DONNEES, "immeubles");

// Dans le prototype, ce fichier remplace l'échange entre le courtier et l'émetteur (immeubles.ts)
export function immeubleDe(cadastre: string): Immeuble {
  return immeubleOuCreer(DOSSIER_IMMEUBLES, cadastre);
}

export function fichierLot(numeroLot: number) {
  return path.join(DOSSIER_LOTS, `lot-${numeroLot}.json`);
}

// Lecture d'un lot depuis le disque, pour preuveDuDocument (preuve.ts)
export async function lireLotLocal(numeroLot: number): Promise<FichierLot | null> {
  return lireJson<FichierLot | null>(fichierLot(numeroLot), null);
}

export function lireJson<T>(fichier: string, defaut: T): T {
  if (!fs.existsSync(fichier)) return defaut;
  return JSON.parse(fs.readFileSync(fichier, "utf8"));
}

export function ecrireJson(fichier: string, contenu: unknown) {
  fs.mkdirSync(path.dirname(fichier), { recursive: true });
  fs.writeFileSync(fichier, JSON.stringify(contenu, null, 2));
}
