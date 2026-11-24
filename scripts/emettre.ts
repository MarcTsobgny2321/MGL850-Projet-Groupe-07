// Étape 3, morceau 2 : un émetteur émet (ou annule) un document.
// Usage :
//   npm run emettre -- exemples/rapport_inspection.pdf inspecteur 1234567 [durée en jours]
//   (1234567 : numéro de lot du cadastre de l'immeuble, fictif)
//   npm run emettre -- --annuler donnees/recus/rapport_inspection.json
import path from "path";
import { compte, lireDeploiement, maintenantChaine, Role, INDICES } from "./comptes";
import { empreinte, nouveauSel } from "./empreinte";
import { Statut, TypeDocument } from "./lots";
import { signer } from "./signature";
import {
  DocumentSigne,
  Recu,
  FICHIER_EN_ATTENTE,
  immeubleDe,
  DOSSIER_RECUS,
  DOSSIER_REGISTRES,
  lireJson,
  ecrireJson,
} from "./stockage";

// Ajoute le document à la file du service de scellement
function mettreEnAttente(doc: DocumentSigne) {
  const file = lireJson<DocumentSigne[]>(FICHIER_EN_ATTENTE, []);
  file.push(doc);
  ecrireJson(FICHIER_EN_ATTENTE, file);
}

const JOUR = 24 * 3600;

// Simplification : chaque émetteur du prototype produit un seul type de document
const TYPE_PAR_ROLE: Partial<Record<Role, TypeDocument>> = {
  inspecteur: TypeDocument.INSPECTION,
  syndicat: TypeDocument.ATTESTATION_SYNDICAT,
};

// Les champs qui ne changent pas entre l'émission et l'annulation
interface Base {
  empreinte: string;
  typeDocument: TypeDocument;
  immeuble: string;
  dateExpiration: number;
}

async function signerDocument(role: Role, base: Base, statut: Statut): Promise<DocumentSigne> {
  const emetteur = await compte(role);
  // dateStatut : l'horloge de la chaîne, pour rester cohérent avec les dates des lots
  const dateStatut = await maintenantChaine();
  const champs = { ...base, statut, dateStatut };
  const signature = await signer(emetteur, champs);
  return { ...champs, emetteur: emetteur.address, signature };
}

async function emettre(fichierPdf: string, role: Role, cadastre: string, jours: number) {
  const typeDocument = TYPE_PAR_ROLE[role];
  if (!typeDocument) throw new Error(`${role} n'émet aucun type de document`);

  const sel = nouveauSel();
  // Durée de validité juridique fixée par l'émetteur. 0 : pas d'expiration
  const dateExpiration = jours > 0 ? (await maintenantChaine()) + jours * JOUR : 0;
  const base = {
    empreinte: empreinte(fichierPdf, sel),
    typeDocument,
    immeuble: immeubleDe(cadastre).immeuble,
    dateExpiration,
  };
  const doc = await signerDocument(role, base, Statut.VALIDE);
  mettreEnAttente(doc);

  const nom = path.basename(fichierPdf, ".pdf");
  const { chainId, proofAnchor } = lireDeploiement();
  const recu: Recu = { document: path.basename(fichierPdf), sel, ...doc, chainId, proofAnchor };
  ecrireJson(path.join(DOSSIER_RECUS, `${nom}.json`), recu);
  // D6 : l'émetteur garde une copie du sel dans son propre registre
  ecrireJson(path.join(DOSSIER_REGISTRES, role, `${nom}.json`), recu);

  console.log(`${role} a émis ${recu.document} (statut VALIDE)`);
  console.log(`Reçu : ${DOSSIER_RECUS}/${nom}.json`);
  console.log("En attente du prochain lot (npm run sceller)");
}

async function annuler(fichierRecu: string) {
  const recu = lireJson<Recu | null>(fichierRecu, null);
  if (!recu) throw new Error(`Reçu introuvable : ${fichierRecu}`);

  // Retrouve le rôle de l'émetteur à partir de son adresse
  const roles = Object.keys(INDICES) as Role[];
  let role: Role | undefined;
  for (const r of roles) {
    if ((await compte(r)).address === recu.emetteur) role = r;
  }
  if (!role) throw new Error("Émetteur du reçu inconnu");

  // L'annulation reprend les champs d'origine : seuls le statut et sa date changent
  const base = {
    empreinte: recu.empreinte,
    typeDocument: recu.typeDocument,
    immeuble: recu.immeuble,
    dateExpiration: recu.dateExpiration,
  };
  const doc = await signerDocument(role, base, Statut.ANNULE);
  mettreEnAttente(doc);
  console.log(`${role} a annulé ${recu.document} (en attente du prochain lot)`);
}

async function main() {
  const [premier, second, troisieme, quatrieme] = process.argv.slice(2);
  if (premier === "--annuler" && second) return annuler(second);
  if (premier && second && second in INDICES && troisieme) {
    return emettre(premier, second as Role, troisieme, Number(quatrieme ?? 0));
  }
  console.log("Usage : npm run emettre -- <fichier.pdf> <inspecteur|syndicat> <cadastre> [jours]");
  console.log("        npm run emettre -- --annuler <reçu.json>");
  process.exitCode = 1;
}

main().catch((erreur) => {
  console.error(erreur.message ?? erreur);
  process.exitCode = 1;
});
