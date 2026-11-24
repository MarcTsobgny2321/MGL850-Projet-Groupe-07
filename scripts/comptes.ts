// Connexion à la chaîne locale (npm run chaine) et rôle de chaque compte de test.
// Les comptes sont les mêmes à chaque lancement de la chaîne.
import fs from "fs";
import { ethers } from "ethers";
import { ProofAnchor__factory, TransactionWorkflow__factory } from "../typechain-types";

export const URL_CHAINE = "http://127.0.0.1:8545";
export const fournisseur = new ethers.JsonRpcProvider(URL_CHAINE);

import { INDICES, Role } from "./roles";

export { INDICES };
export type { Role };

export function compte(role: Role) {
  return fournisseur.getSigner(INDICES[role]);
}

// Le rôle d'une adresse, pour afficher des noms plutôt que des adresses
export async function roleDe(adresse: string): Promise<Role | undefined> {
  for (const role of Object.keys(INDICES) as Role[]) {
    if ((await compte(role)).address === adresse) return role;
  }
  return undefined;
}

export const DOSSIER_DONNEES = "donnees";
export const FICHIER_DEPLOIEMENT = `${DOSSIER_DONNEES}/deploiement.json`;

export interface Deploiement {
  chainId: number;
  proofAnchor: string;
  transactionWorkflow: string;
}

export function lireDeploiement(): Deploiement {
  if (!fs.existsSync(FICHIER_DEPLOIEMENT)) {
    throw new Error("Aucun déploiement : lancer d'abord npm run deployer");
  }
  return JSON.parse(fs.readFileSync(FICHIER_DEPLOIEMENT, "utf8"));
}

// Le contrat déployé, utilisé par le compte donné
export async function proofAnchor(role: Role) {
  const { proofAnchor } = lireDeploiement();
  return ProofAnchor__factory.connect(proofAnchor, await compte(role));
}

export async function transactionWorkflow(role: Role) {
  const { transactionWorkflow } = lireDeploiement();
  return TransactionWorkflow__factory.connect(transactionWorkflow, await compte(role));
}

// Date du dernier bloc : l'horloge de la chaîne, pas celle de l'ordinateur
export async function maintenantChaine(): Promise<number> {
  const bloc = await fournisseur.getBlock("latest");
  return bloc!.timestamp;
}
