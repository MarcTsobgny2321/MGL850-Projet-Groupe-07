// Frontière entre l'interface et la chaîne (ADR 0003).
// Les pages ne connaissent que ces types : jamais de bigint, de struct ni d'erreur ethers.
import type { Recu } from "../../../scripts/formats";

export type { Recu };

export type EtatDossier = "EnAttenteAccord" | "Actif" | "Ferme" | "FermeNonConforme";

export interface Compte {
  role: string;
  adresse: string;
}

export interface DocumentDuDossier {
  type: string;
  emetteur: Compte;
  deposant: Compte;
  dateLimite: number; // secondes
  dateDepot?: number;
  enRetard: boolean;
  expire: boolean;
}

export interface Dossier {
  id: number;
  etat: EtatDossier;
  immeuble: string;
  courtier: Compte;
  vendeur: Compte;
  acheteur: Compte;
  notaire: Compte;
  accordVendeur: boolean;
  accordAcheteur: boolean;
  documents: DocumentDuDossier[];
  conformeSiFermeMaintenant: boolean;
}

// Une étape de la vérification ; ok à false marque celle qui a échoué
export interface Etape {
  nom: string;
  valeur: string;
  ok: boolean;
}

export interface Verification {
  valide: boolean;
  date: number;
  raison?: string;
  etapes: Etape[];
}

export interface Infos {
  proofAnchor: string;
  transactionWorkflow: string;
  nbLots: number;
  nbDossiers: number;
  heureChaine: number;
}

export interface Plateforme {
  infos(): Promise<Infos>;
  comptes(): Promise<Compte[]>;
  verifier(pdf: Uint8Array, recu: Recu, date?: number, cadastre?: string): Promise<Verification>;
  listerDossiers(): Promise<Dossier[]>;
  lireDossier(id: number): Promise<Dossier>;
  pour(compte: Compte): ActionsDossier; // actions signées par ce compte
}

export interface ActionsDossier {
  ouvrir(cadastre: string, jours: number): Promise<number>;
  approuver(id: number): Promise<void>;
  deposer(id: number, pdf: Uint8Array, recu: Recu): Promise<void>;
  fermer(id: number): Promise<EtatDossier>;
}

// Refus d'un contrat (message du require), traduit une seule fois par l'implémentation
export class RefusContrat extends Error {}
