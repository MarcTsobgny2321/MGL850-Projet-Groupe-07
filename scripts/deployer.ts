// Déploie ProofAnchor et TransactionWorkflow, et reconnaît les émetteurs de la démo.
// Usage : npm run chaine (terminal 1), puis npm run deployer (terminal 2)
import fs from "fs";
import { ProofAnchor__factory, TransactionWorkflow__factory } from "../typechain-types";
import {
  compte,
  fournisseur,
  DOSSIER_DONNEES,
  FICHIER_DEPLOIEMENT,
  Deploiement,
} from "./comptes";

async function main() {
  const admin = await compte("admin");
  const scelleur = await compte("scelleur");
  const inspecteur = await compte("inspecteur");
  const syndicat = await compte("syndicat");

  const ancre = await new ProofAnchor__factory(admin).deploy(
    admin.address,
    scelleur.address,
  );
  await ancre.waitForDeployment();
  const adresse = await ancre.getAddress();
  console.log("ProofAnchor déployé à", adresse);

  for (const emetteur of [inspecteur, syndicat]) {
    const tx = await ancre.ajouterEmetteur(emetteur.address);
    await tx.wait(); // attendre que la transaction soit dans un bloc
    console.log("Émetteur reconnu :", emetteur.address);
  }

  // Le dossier de vente connaît ProofAnchor dès sa création (immutable)
  const flux = await new TransactionWorkflow__factory(admin).deploy(adresse);
  await flux.waitForDeployment();
  const adresseFlux = await flux.getAddress();
  console.log("TransactionWorkflow déployé à", adresseFlux);

  // Les autres scripts lisent ce fichier pour savoir où est le contrat
  const { chainId } = await fournisseur.getNetwork();
  const deploiement: Deploiement = {
    chainId: Number(chainId),
    proofAnchor: adresse,
    transactionWorkflow: adresseFlux,
  };
  // Nouveau déploiement : on repart de zéro (anciens lots et reçus effacés)
  fs.rmSync(DOSSIER_DONNEES, { recursive: true, force: true });
  fs.mkdirSync(DOSSIER_DONNEES, { recursive: true });
  fs.writeFileSync(FICHIER_DEPLOIEMENT, JSON.stringify(deploiement, null, 2));
  console.log("Écrit :", FICHIER_DEPLOIEMENT);
}

main().catch((erreur) => {
  console.error(erreur.message ?? erreur);
  process.exitCode = 1;
});
