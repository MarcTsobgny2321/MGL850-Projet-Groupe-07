// Formats des fichiers échangés (reçu, fichier public d'un lot, immeuble).
// Aucun accès aux fichiers ici : utilisable par les scripts et par le web.
import { DocumentLot, TypeDocument } from "./lots";

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

// Fichier public d'un lot (D10) : toutes ses feuilles et leurs signatures
export interface FichierLot {
  numeroLot: number;
  racine: string;
  dateScellement: number;
  chainId: number;
  proofAnchor: string;
  documents: DocumentSigne[];
}

// D14 : ce que le courtier remet à l'émetteur et au notaire. Jamais publié.
export interface Immeuble {
  cadastre: string;
  sel: string;
  immeuble: string; // keccak256(cadastre, sel) : seule valeur qui va dans la feuille
}
