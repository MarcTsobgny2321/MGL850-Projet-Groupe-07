// Étape 4 : le dossier de vente sur la chaîne locale.
// Usage :
//   npm run dossier -- ouvrir <cadastre> [délai en jours]
//   npm run dossier -- approuver <n° dossier> <vendeur|acheteur>
//   npm run dossier -- deposer <n° dossier> <fichier.pdf> <reçu.json>
//   npm run dossier -- fermer <n° dossier>
//   npm run dossier -- etat <n° dossier>
import path from "path";
import {
  compte,
  maintenantChaine,
  proofAnchor,
  roleDe,
  transactionWorkflow,
  Role,
} from "./comptes";
import { empreinte } from "./empreinte";
import { TypeDocument } from "./lots";
import { preuveDuDocument } from "./preuve";
import { immeubleDe, lireJson, lireLotLocal, Recu } from "./stockage";
import { ETATS, numeroAttendu } from "./workflow";

const JOUR = 24 * 3600;

const dateLisible = (s: number) =>
  new Date(s * 1000).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" });

async function nom(adresse: string) {
  return (await roleDe(adresse)) ?? adresse;
}

// Le courtier ouvre le dossier. Liste fixe pour la démo : le rapport d'inspection
// (déposé par l'acheteur) et l'attestation du syndicat (déposée par le vendeur).
async function ouvrir(cadastre: string, jours: number) {
  const flux = await transactionWorkflow("courtier");
  const [vendeur, acheteur, notaire, inspecteur, syndicat] = await Promise.all(
    (["vendeur", "acheteur", "notaire", "inspecteur", "syndicat"] as Role[]).map(compte),
  );
  const dateLimite = (await maintenantChaine()) + jours * JOUR;

  const tx = await flux.ouvrirDossier(
    vendeur.address,
    acheteur.address,
    notaire.address,
    immeubleDe(cadastre).immeuble, // seule l'empreinte salée va sur la chaîne (D14)
    [
      { typeDocument: TypeDocument.INSPECTION, emetteur: inspecteur.address, deposant: acheteur.address, dateLimite },
      { typeDocument: TypeDocument.ATTESTATION_SYNDICAT, emetteur: syndicat.address, deposant: vendeur.address, dateLimite },
    ],
  );
  await tx.wait();
  const id = await flux.dernierDossier();
  console.log(`Dossier ${id} ouvert pour le cadastre ${cadastre}, documents attendus avant le ${dateLisible(dateLimite)}`);
  console.log(`En attente de l'accord du vendeur et de l'acheteur`);
}

async function approuver(id: number, role: Role) {
  const flux = await transactionWorkflow(role);
  await (await flux.approuver(id)).wait();
  const etat = ETATS[Number((await flux.dossiers(id)).etat)];
  console.log(`${role} a approuvé le dossier ${id}. État : ${etat}`);
}

// Le déposant a le PDF et son reçu. Le script retrouve la feuille et la preuve
// dans le lot en vigueur, puis le bon document attendu et le bon déposant.
async function deposer(id: number, fichierPdf: string, fichierRecu: string) {
  const recu = lireJson<Recu | null>(fichierRecu, null);
  if (!recu) throw new Error(`Reçu introuvable : ${fichierRecu}`);

  const ancre = await proofAnchor("notaire"); // simple lecture ici
  const r = await preuveDuDocument(ancre, empreinte(fichierPdf, recu.sel), await maintenantChaine(), lireLotLocal);
  if (!r.trouve) throw new Error(`Dépôt impossible : ${r.raison}`);

  // Le n° du document attendu, d'après le type signé dans la feuille
  const lecture = await transactionWorkflow("notaire");
  const attendus = await lecture.documentsAttendus(id);
  const numero = numeroAttendu(attendus, r.doc.typeDocument);
  if (numero < 0) throw new Error(`Ce dossier n'attend pas de document ${TypeDocument[r.doc.typeDocument]}`);
  const role = await roleDe(attendus[numero].deposant);
  if (!role) throw new Error("Déposant inconnu");

  // La transaction est signée par le déposant : le contrat vérifie que c'est le bon
  const { signature, ...champs } = r.doc;
  const flux = await transactionWorkflow(role);
  await (await flux.deposer(id, numero, champs, r.preuve, signature, r.numeroLot)).wait();

  const depot = (await flux.depotsDe(id))[numero];
  const aTemps = depot.dateDepot < attendus[numero].dateLimite;
  console.log(`${role} a déposé ${path.basename(fichierPdf)} dans le dossier ${id} (lot ${r.numeroLot})`);
  console.log(aTemps ? "Déposé à temps" : "Déposé EN RETARD : le dossier sera non conforme");
}

async function fermer(id: number) {
  const flux = await transactionWorkflow("notaire");
  await (await flux.fermer(id)).wait();
  console.log(`Le notaire a fermé le dossier ${id}. Résultat décidé par le contrat : ${ETATS[Number((await flux.dossiers(id)).etat)]}`);
}

async function etat(id: number) {
  const flux = await transactionWorkflow("notaire");
  const d = await flux.dossiers(id);
  if (Number(d.etat) === 0) throw new Error(`Le dossier ${id} n'existe pas`);
  const maintenant = await maintenantChaine();

  console.log(`Dossier ${id} : ${ETATS[Number(d.etat)]}`);
  console.log(`Courtier ${await nom(d.courtier)}, vendeur ${await nom(d.vendeur)} (accord : ${d.accordVendeur ? "oui" : "non"}), ` +
    `acheteur ${await nom(d.acheteur)} (accord : ${d.accordAcheteur ? "oui" : "non"}), notaire ${await nom(d.notaire)}`);

  const attendus = await flux.documentsAttendus(id);
  const depots = await flux.depotsDe(id);
  for (let i = 0; i < attendus.length; i++) {
    const a = attendus[i];
    const p = depots[i];
    let situation = "pas encore déposé";
    if (p.dateDepot > 0n) {
      situation = `déposé le ${dateLisible(Number(p.dateDepot))}` + (p.dateDepot < a.dateLimite ? "" : " (EN RETARD)");
      if (p.dateExpiration > 0n && maintenant >= Number(p.dateExpiration)) situation += " (EXPIRÉ)";
    }
    console.log(`  ${i}. ${TypeDocument[Number(a.typeDocument)]} de ${await nom(a.emetteur)}, ` +
      `déposé par ${await nom(a.deposant)} avant le ${dateLisible(Number(a.dateLimite))} : ${situation}`);
  }
  if (Number(d.etat) === 2) console.log(`Conforme si fermé maintenant : ${(await flux.estConforme(id)) ? "oui" : "non"}`);
}

async function main() {
  const [commande, a, b, c] = process.argv.slice(2);
  const id = Number(a);
  if (commande === "ouvrir" && a) return ouvrir(a, Number(b ?? 10));
  if (commande === "approuver" && a && (b === "vendeur" || b === "acheteur")) return approuver(id, b);
  if (commande === "deposer" && a && b && c) return deposer(id, b, c);
  if (commande === "fermer" && a) return fermer(id);
  if (commande === "etat" && a) return etat(id);
  console.log("Usage : npm run dossier -- ouvrir <cadastre> [jours]");
  console.log("        npm run dossier -- approuver <n°> <vendeur|acheteur>");
  console.log("        npm run dossier -- deposer <n°> <fichier.pdf> <reçu.json>");
  console.log("        npm run dossier -- fermer <n°>");
  console.log("        npm run dossier -- etat <n°>");
  process.exitCode = 1;
}

main().catch((erreur) => {
  // reason : le message du require qui a fait échouer la transaction
  console.error("Erreur :", erreur.reason ?? erreur.shortMessage ?? erreur.message ?? erreur);
  process.exitCode = 1;
});
