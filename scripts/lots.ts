// Construit un lot d'ancrage : feuilles -> arbre de Merkle -> racine + preuves
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

// Format d'une feuille : (empreinte, émetteur, type, immeuble, statut, dateStatut, dateExpiration)
export const FORMAT_FEUILLE = [
  "bytes32", "address", "uint8", "bytes32", "uint8", "uint64", "uint64",
];

// D14 : type du document, signé par l'émetteur
export enum TypeDocument {
  INSPECTION = 1,
  ATTESTATION_SYNDICAT = 2,
}

export enum Statut {
  VALIDE = 1,
  SUSPENDU = 2,
  ANNULE = 3,
}

export interface DocumentLot {
  empreinte: string; // bytes32 en hexadécimal
  emetteur: string; // adresse de l'émetteur
  typeDocument: TypeDocument;
  immeuble: string; // bytes32 : keccak256(cadastre, selImmeuble), voir empreinte.ts
  statut: Statut;
  dateStatut: number; // date à partir de laquelle le statut s'applique (ex. annulé le 20 nov.), en secondes
  dateExpiration: number; // fin de validité juridique, en secondes. 0 : pas d'expiration
}

export interface DocumentAvecPreuve extends DocumentLot {
  preuve: string[];
}

type Feuille = [string, string, number, string, number, number, number];

export function versFeuille(d: DocumentLot): Feuille {
  return [
    d.empreinte, d.emetteur, d.typeDocument, d.immeuble,
    d.statut, d.dateStatut, d.dateExpiration,
  ];
}

export function construireLot(documents: DocumentLot[]) {
  const arbre = StandardMerkleTree.of(
    documents.map(versFeuille),
    FORMAT_FEUILLE,
  );

  const preuves: DocumentAvecPreuve[] = documents.map((d, i) => ({
    ...d,
    preuve: arbre.getProof(i),
  }));

  return { racine: arbre.root, preuves, arbre };
}

// Vérifie hors chaîne qu'un document fait partie du lot
export function verifier(
  racine: string,
  document: DocumentLot,
  preuve: string[],
): boolean {
  return StandardMerkleTree.verify(
    racine,
    FORMAT_FEUILLE,
    versFeuille(document),
    preuve,
  );
}
