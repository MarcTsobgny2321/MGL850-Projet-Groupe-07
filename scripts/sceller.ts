// Étape 3, morceau 3 : le service de scellement construit le lot et scelle sa racine.
// Usage : npm run sceller
import path from "path";
import { lireDeploiement, proofAnchor } from "./comptes";
import { construireLot, Statut } from "./lots";
import {
  DocumentSigne,
  FICHIER_EN_ATTENTE,
  DOSSIER_LOTS,
  FichierLot,
  fichierLot,
  lireJson,
  ecrireJson,
} from "./stockage";

type Contrat = Awaited<ReturnType<typeof proofAnchor>>;

// Raison du refus d'une ligne de la file, ou null si elle est acceptée
async function raisonRefus(
  ancre: Contrat,
  doc: DocumentSigne,
  actuel: DocumentSigne | undefined,
  dateDernierLot: number,
): Promise<string | null> {
  if (!(await ancre.signatureValide(doc, doc.signature))) {
    return "signature invalide";
  }
  // D8 : l'émetteur doit être reconnu à la date du statut
  if (!(await ancre.estReconnuA(doc.emetteur, doc.dateStatut))) {
    return "émetteur non reconnu à cette date";
  }
  // D8 : pas de statut antidaté avant le dernier lot
  if (doc.dateStatut < dateDernierLot) {
    return "dateStatut antérieure au dernier lot";
  }
  if (actuel) {
    // Seul l'émetteur d'origine peut changer le statut de son document
    if (actuel.emetteur !== doc.emetteur) return "autre émetteur que celui d'origine";
    // D13 : un document annulé ne redevient jamais valide
    if (actuel.statut === Statut.ANNULE) return "document déjà annulé (D13)";
    if (doc.dateStatut < actuel.dateStatut) return "plus ancien que le statut actuel";
  }
  return null;
}

async function main() {
  const ancre = await proofAnchor("scelleur");
  const file = lireJson<DocumentSigne[]>(FICHIER_EN_ATTENTE, []);
  if (file.length === 0) {
    console.log("Aucun document en attente : rien à sceller.");
    return;
  }

  // Point de départ : l'état du dernier lot (le lot est une photo complète)
  const dernier = Number(await ancre.dernierLot());
  const etat = new Map<string, DocumentSigne>();
  let dateDernierLot = 0;
  if (dernier > 0) {
    const precedent = lireJson<FichierLot | null>(fichierLot(dernier), null);
    if (!precedent) throw new Error(`Fichier du lot ${dernier} introuvable`);
    for (const doc of precedent.documents) etat.set(doc.empreinte, doc);
    dateDernierLot = precedent.dateScellement;
  }

  // Applique la file dans l'ordre d'arrivée : le dernier statut accepté remplace l'ancien
  let acceptes = 0;
  for (const doc of file) {
    const refus = await raisonRefus(ancre, doc, etat.get(doc.empreinte), dateDernierLot);
    const nom = `${doc.empreinte.slice(0, 10)}… statut ${Statut[doc.statut]}`;
    if (refus) {
      console.log(`Refusé  ${nom} : ${refus}`);
    } else {
      etat.set(doc.empreinte, doc);
      acceptes++;
      console.log(`Accepté ${nom}`);
    }
  }

  // Sans changement, le lot serait identique au précédent : on ne paie pas de gaz pour rien
  if (acceptes === 0) {
    ecrireJson(FICHIER_EN_ATTENTE, []);
    console.log("Aucun changement accepté : pas de nouveau lot. File vidée.");
    return;
  }
  const documents = [...etat.values()];

  const { racine } = construireLot(documents);
  const tx = await ancre.anchor(racine);
  await tx.wait(); // la racine est dans un bloc

  // Relit ce que le contrat a enregistré (numéro et date viennent de la chaîne)
  const numeroLot = Number(await ancre.dernierLot());
  const lot = await ancre.lots(numeroLot);

  // D10 : feuilles publiées, avec les signatures pour que tout le monde puisse les contrôler
  const deploiement = lireDeploiement();
  const contenu: FichierLot = {
    numeroLot,
    racine,
    dateScellement: Number(lot.dateScellement),
    chainId: deploiement.chainId,
    proofAnchor: deploiement.proofAnchor,
    documents,
  };
  ecrireJson(fichierLot(numeroLot), contenu);
  ecrireJson(FICHIER_EN_ATTENTE, []); // la file est vidée seulement après le scellement

  console.log(`Lot ${numeroLot} scellé : ${documents.length} document(s)`);
  console.log(`Racine : ${racine}`);
  console.log(`Publié : ${path.join(DOSSIER_LOTS, `lot-${numeroLot}.json`)}`);
}

main().catch((erreur) => {
  console.error(erreur.message ?? erreur);
  process.exitCode = 1;
});
