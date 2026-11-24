// Retrouve ce qu'il faut pour présenter un document au contrat :
// le lot en vigueur à une date, la feuille du document dans ce lot et sa preuve.
// Utilisé par verifier.ts (notaire) et dossier.ts (dépôt).
import { ProofAnchor } from "../typechain-types";
import { construireLot } from "./lots";
import { DocumentSigne, FichierLot, fichierLot, lireJson } from "./stockage";

// Le lot en vigueur : le plus récent scellé avant (ou à) la date (D3).
// Lu sur la chaîne, pas dans les fichiers, qui pourraient être faux.
export async function lotEnVigueur(ancre: ProofAnchor, date: number): Promise<number> {
  for (let n = Number(await ancre.dernierLot()); n >= 1; n--) {
    const lot = await ancre.lots(n);
    if (Number(lot.dateScellement) <= date) return n;
  }
  return 0;
}

export type Recherche =
  | { trouve: true; numeroLot: number; lot: FichierLot; doc: DocumentSigne; preuve: string[] }
  | { trouve: false; raison: string };

export async function preuveDuDocument(
  ancre: ProofAnchor,
  empreinte: string,
  date: number,
): Promise<Recherche> {
  const numeroLot = await lotEnVigueur(ancre, date);
  if (numeroLot === 0) return { trouve: false, raison: "aucun lot scellé à cette date" };

  const lot = lireJson<FichierLot | null>(fichierLot(numeroLot), null);
  if (!lot) return { trouve: false, raison: `fichier du lot ${numeroLot} introuvable` };

  // Le fichier doit correspondre à la racine scellée, sinon il a été modifié
  const { racine, preuves } = construireLot(lot.documents);
  if (racine !== (await ancre.lots(numeroLot)).racine) {
    return { trouve: false, raison: `le fichier du lot ${numeroLot} ne correspond pas à la racine sur la chaîne` };
  }

  // La feuille vient du lot, pas du reçu : si le document a été annulé, c'est le lot qui le dit
  const i = lot.documents.findIndex((d) => d.empreinte === empreinte);
  if (i < 0) {
    return { trouve: false, raison: "PDF absent du lot (modifié, mauvais sel ou pas encore scellé)" };
  }
  return { trouve: true, numeroLot, lot, doc: lot.documents[i], preuve: preuves[i].preuve };
}
