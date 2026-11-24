// Calculs d'empreintes sans accès aux fichiers : utilisables par Node et par le navigateur
import { ethers } from "ethers";

// Sel : 32 octets aléatoires, remis avec le document
export function nouveauSel(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

// Empreinte salée d'un contenu déjà lu : keccak256(sel || contenu)
export function empreinteOctets(sel: string, contenu: Uint8Array): string {
  return ethers.keccak256(ethers.concat([sel, contenu]));
}

// D14 : identifiant de l'immeuble. Le sel empêche de retrouver le cadastre
// en essayant tous les numéros (quelques millions seulement).
export function empreinteImmeuble(cadastre: string, sel: string): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["string", "bytes32"], [cadastre, sel]),
  );
}
