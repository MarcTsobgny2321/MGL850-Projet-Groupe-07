// Calcule l'empreinte salée d'un fichier : keccak256(sel || contenu)
import fs from "fs";
import { empreinteOctets } from "./hachage";

export { empreinteImmeuble, empreinteOctets, nouveauSel } from "./hachage";

export function empreinte(cheminFichier: string, sel: string): string {
  return empreinteOctets(sel, fs.readFileSync(cheminFichier));
}
