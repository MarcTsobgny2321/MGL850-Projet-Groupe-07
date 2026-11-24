// Le notaire vérifie un PDF à une date, avec son reçu.
// Usage :
//   npm run verifier -- <fichier.pdf> <reçu.json> [--date 2026-11-24T12:00] [--cadastre 1234567]
// Sans --date : maintenant (horloge de la chaîne).
import path from "path";
import { fournisseur, lireDeploiement, maintenantChaine } from "./comptes";
import { ProofAnchor__factory } from "../typechain-types";
import { empreinte } from "./empreinte";
import { Statut, TypeDocument } from "./lots";
import { preuveDuDocument } from "./preuve";
import { DOSSIER_IMMEUBLES, Immeuble, Recu, lireJson } from "./stockage";

// Lecture seule : aucun compte n'est nécessaire, donc aucun gaz
function contratEnLecture() {
  return ProofAnchor__factory.connect(lireDeploiement().proofAnchor, fournisseur);
}

function lireOption(nom: string): string | undefined {
  const i = process.argv.indexOf(nom);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// Heure locale, comme --date
const dateLisible = (s: number) =>
  new Date(s * 1000).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" });

async function main() {
  const [fichierPdf, fichierRecu] = process.argv.slice(2);
  if (!fichierPdf || !fichierRecu || fichierPdf.startsWith("--")) {
    console.log("Usage : npm run verifier -- <fichier.pdf> <reçu.json> [--date AAAA-MM-JJTHH:MM] [--cadastre N]");
    process.exitCode = 1;
    return;
  }
  const recu = lireJson<Recu | null>(fichierRecu, null);
  if (!recu) throw new Error(`Reçu introuvable : ${fichierRecu}`);

  const ancre = contratEnLecture();
  const optionDate = lireOption("--date");
  const date = optionDate ? Math.floor(Date.parse(optionDate) / 1000) : await maintenantChaine();
  if (Number.isNaN(date)) throw new Error(`Date illisible : ${optionDate}`);

  // 1. L'empreinte vient du PDF reçu, pas du reçu : c'est ce qui prouve que le PDF est intact
  const emp = empreinte(fichierPdf, recu.sel);
  console.log(`Document   : ${path.basename(fichierPdf)}`);
  console.log(`Empreinte  : ${emp}`);
  console.log(`Date       : ${dateLisible(date)}`);

  // 2 à 4. Lot en vigueur lu sur la chaîne, fichier comparé à la racine, feuille du lot (preuve.ts)
  const r = await preuveDuDocument(ancre, emp, date);
  if (!r.trouve) return conclure(false, r.raison);
  const { numeroLot, lot, doc, preuve } = r;
  console.log(`Lot        : ${numeroLot}, scellé le ${dateLisible(lot.dateScellement)}`);
  console.log(`Type       : ${TypeDocument[doc.typeDocument]}`);
  console.log(`Statut     : ${Statut[doc.statut]} depuis le ${dateLisible(doc.dateStatut)}`);
  console.log(`Expiration : ${doc.dateExpiration ? dateLisible(doc.dateExpiration) : "aucune"}`);

  // 5. Le notaire peut aussi confirmer l'immeuble s'il a reçu le cadastre et son sel (D14)
  const cadastre = lireOption("--cadastre");
  if (cadastre) {
    const imm = lireJson<Immeuble | null>(path.join(DOSSIER_IMMEUBLES, `${cadastre}.json`), null);
    if (!imm) return conclure(false, `aucun sel connu pour le cadastre ${cadastre}`);
    if (imm.immeuble !== doc.immeuble) return conclure(false, `le document ne concerne pas le cadastre ${cadastre}`);
    console.log(`Immeuble   : cadastre ${cadastre}, confirmé`);
  }

  // 6. Le contrat donne la réponse officielle (lecture gratuite)
  const { signature, ...champs } = doc;
  const valide = await ancre.wasValidAt(numeroLot, champs, preuve, signature, date);
  conclure(valide, valide ? "" : raisonProbable(doc, date));
}

// wasValidAt répond seulement oui ou non. Hors chaîne, on peut deviner pourquoi.
function raisonProbable(doc: { statut: number; dateStatut: number; dateExpiration: number }, date: number) {
  if (doc.statut !== Statut.VALIDE) return `document ${Statut[doc.statut]}`;
  if (doc.dateStatut > date) return "document pas encore émis à cette date";
  if (doc.dateExpiration !== 0 && date >= doc.dateExpiration) return "document expiré à cette date";
  return "émetteur non reconnu, signature invalide ou date future";
}

function conclure(valide: boolean, raison: string) {
  console.log(valide ? "\nRésultat   : VALIDE" : `\nRésultat   : NON VALIDE (${raison})`);
}

main().catch((erreur) => {
  console.error(erreur.message ?? erreur);
  process.exitCode = 1;
});
