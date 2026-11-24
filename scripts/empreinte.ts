// Calcule l'empreinte salée d'un fichier : keccak256(sel || contenu)
import fs from "fs";
import { empreinteOctets, nouveauSel } from "./hachage";

export { empreinteImmeuble, empreinteOctets, nouveauSel } from "./hachage";

export function empreinte(cheminFichier: string, sel: string): string {
  return empreinteOctets(sel, fs.readFileSync(cheminFichier));
}

// Utilisation : npx ts-node scripts/empreinte.ts <fichier> [sel]
if (require.main === module) {
  const fichier = process.argv[2];
  const sel = process.argv[3] ?? nouveauSel();
  console.log("Fichier   :", fichier);
  console.log("Sel       :", sel);
  console.log("Empreinte :", empreinte(fichier, sel));
}
