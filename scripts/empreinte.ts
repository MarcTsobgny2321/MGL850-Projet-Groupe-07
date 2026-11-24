// Calcule l'empreinte salée d'un fichier : keccak256(sel || contenu)
import fs from "fs";
import { ethers } from "ethers";

// Sel : 32 octets aléatoires, remis avec le document
export function nouveauSel(): string {
  console.debug("Nouveau sel généré");
  return ethers.hexlify(ethers.randomBytes(32));
}

export function empreinte(cheminFichier: string, sel: string): string {
  const contenu = fs.readFileSync(cheminFichier);
  return ethers.keccak256(ethers.concat([sel, contenu]));
}

// D14 : identifiant de l'immeuble. Le sel empêche de retrouver le cadastre
// en essayant tous les numéros (quelques millions seulement).
export function empreinteImmeuble(cadastre: string, sel: string): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["string", "bytes32"], [cadastre, sel]),
  );
}

// Utilisation : npx ts-node scripts/empreinte.ts <fichier> [sel]
if (require.main === module) {
  const fichier = process.argv[2];
  const sel = process.argv[3] ?? nouveauSel();
  const stringEmpreinte = empreinte(fichier, sel);
  console.log("Fichier   :", fichier);
  console.log("Sel       :", sel);
  console.log("Empreinte :", stringEmpreinte);
}
