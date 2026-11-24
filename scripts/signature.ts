// Signature d'un document par son émetteur (décision D7)
import { ethers } from "ethers";
import { DocumentLot } from "./lots";

// Les champs signés : tous ceux de la feuille sauf l'émetteur, retrouvé par la signature
export type ChampsSignes = Omit<DocumentLot, "emetteur">;

// Doit donner exactement le même résultat que messageASigner dans ProofAnchor.sol.
export function messageASigner(c: ChampsSignes): string {
  const encodage = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "uint8", "bytes32", "uint8", "uint64", "uint64"],
    [c.empreinte, c.typeDocument, c.immeuble, c.statut, c.dateStatut, c.dateExpiration],
  );
  return ethers.keccak256(encodage);
}

// signMessage applique le préfixe EIP-191 avant de signer
export async function signer(
  emetteur: ethers.Signer,
  champs: ChampsSignes,
): Promise<string> {
  return emetteur.signMessage(ethers.getBytes(messageASigner(champs)));
}
