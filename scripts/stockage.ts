// Fichiers produits par les scripts, rangés dans donnees/ (ignoré par git)
import fs from "fs";
import path from "path";
import { DOSSIER_DONNEES } from "./comptes";
import { DocumentLot, TypeDocument } from "./lots";
import { empreinteImmeuble, nouveauSel } from "./empreinte";

// Un document avec la signature de son émetteur (D7)
export interface DocumentSigne extends DocumentLot {
  signature: string;
}

// Reçu remis avec le PDF (D10). Pas de preuve figée : elle change à chaque lot.
export interface Recu {
  document: string; // nom du fichier, pour information
  sel: string;
  empreinte: string; // pour information : le vérificateur la recalcule à partir du PDF
  emetteur: string;
  typeDocument: TypeDocument;
  immeuble: string; // empreinte salée du cadastre (D14), pas le cadastre lui-même
  statut: number;
  dateStatut: number;
  dateExpiration: number;
  signature: string;
  chainId: number;
  proofAnchor: string;
}

export const FICHIER_EN_ATTENTE = path.join(DOSSIER_DONNEES, "en-attente.json");
export const DOSSIER_RECUS = path.join(DOSSIER_DONNEES, "recus");
export const DOSSIER_REGISTRES = path.join(DOSSIER_DONNEES, "registres");
export const DOSSIER_LOTS = path.join(DOSSIER_DONNEES, "lots");
export const DOSSIER_IMMEUBLES = path.join(DOSSIER_DONNEES, "immeubles");

// D14 : ce que le courtier remet à l'émetteur et au notaire. Jamais publié.
export interface Immeuble {
  cadastre: string;
  sel: string;
  immeuble: string; // keccak256(cadastre, sel) : seule valeur qui va dans la feuille
}

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

// Fichier public d'un lot (D10) : toutes ses feuilles et leurs signatures
export interface FichierLot {
  numeroLot: number;
  racine: string;
  dateScellement: number;
  chainId: number;
  proofAnchor: string;
  documents: DocumentSigne[];
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
