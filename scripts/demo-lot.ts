// Démo de l'étape 1 : des documents, un lot, une racine, une preuve
import { ethers } from "ethers";
import { empreinte } from "./empreinte";
import {
  construireLot,
  verifier,
  versFeuille,
  Statut,
  DocumentLot,
  TypeDocument,
} from "./lots";

const INSPECTEUR = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // compte 2, voir comptes.ts
const SYNDICAT = "0x90F79bf6EB2c4f870365E785982E1f101E93b906"; // compte 3
const NOMS: Record<string, string> = {
  [INSPECTEUR]: "inspecteur",
  [SYNDICAT]: "syndicat",
};
const SEL =
  "0x1111111111111111111111111111111111111111111111111111111111111111";
const IMMEUBLE = "0x" + "12".repeat(32); // empreinte salée du cadastre (D14)
const AUJOURDHUI = 1794182400; // 9 nov. 2026, en secondes

// Affiche seulement le début d'un hash pour garder la console lisible
const court = (h: string) => h.slice(0, 10) + "…";

function titre(texte: string) {
  console.log("\n=== " + texte + " ===");
}

const documents: DocumentLot[] = [
  {
    empreinte: empreinte("exemples/rapport_inspection.pdf", SEL),
    emetteur: INSPECTEUR,
    typeDocument: TypeDocument.INSPECTION,
    immeuble: IMMEUBLE,
    statut: Statut.VALIDE,
    dateStatut: AUJOURDHUI,
    dateExpiration: 0,
  },
  {
    empreinte: empreinte("exemples/attestation_syndicat.pdf", SEL),
    emetteur: SYNDICAT,
    typeDocument: TypeDocument.ATTESTATION_SYNDICAT,
    immeuble: IMMEUBLE,
    statut: Statut.VALIDE,
    dateStatut: AUJOURDHUI,
    dateExpiration: 0,
  },
  {
    empreinte: "0x" + "aa".repeat(32),
    emetteur: SYNDICAT,
    typeDocument: TypeDocument.ATTESTATION_SYNDICAT,
    immeuble: IMMEUBLE,
    statut: Statut.VALIDE,
    dateStatut: AUJOURDHUI,
    dateExpiration: 0,
  },
  {
    empreinte: "0x" + "bb".repeat(32),
    emetteur: INSPECTEUR,
    typeDocument: TypeDocument.INSPECTION,
    immeuble: IMMEUBLE,
    statut: Statut.VALIDE,
    dateStatut: AUJOURDHUI,
    dateExpiration: 0,
  },
  {
    empreinte: "0x" + "cc".repeat(32),
    emetteur: SYNDICAT,
    typeDocument: TypeDocument.ATTESTATION_SYNDICAT,
    immeuble: IMMEUBLE,
    statut: Statut.ANNULE,
    dateStatut: AUJOURDHUI,
    dateExpiration: 0,
  },
];

const { racine, preuves, arbre } = construireLot(documents);

// 1. Chaque document devient une feuille, puis un hash de feuille
titre("1. Documents et hash de leur feuille");
documents.forEach((d, i) => {
  const feuille = versFeuille(d);
  console.log(
    `doc ${i} | empreinte ${court(d.empreinte)} | ${NOMS[d.emetteur]} | ` +
      `${Statut[d.statut]} -> feuille ${court(arbre.leafHash(feuille))}`,
  );
});

// 2. L'arbre complet : les feuilles sont en bas, la racine (0) en haut
titre("2. Arbre (les feuilles sont triées par hash, pas par numéro de doc)");
console.log(arbre.render());
console.log("Racine du lot :", racine);

// 3. On refait à la main le calcul de la racine avec la preuve du doc 0
titre("3. Vérification du doc 0, pas à pas");
const inspection = preuves[0];
let courant = arbre.leafHash(versFeuille(inspection));
console.log(`départ : hash de la feuille   ${court(courant)}`);

inspection.preuve.forEach((voisin, etape) => {
  // OpenZeppelin trie les deux hash avant de les combiner
  const [a, b] = courant < voisin ? [courant, voisin] : [voisin, courant];
  courant = ethers.keccak256(ethers.concat([a, b]));
  console.log(
    `étape ${etape + 1} : hash(${court(a)} + ${court(b)}) = ${court(courant)}`,
  );
});
console.log(`résultat : ${court(courant)}  racine : ${court(racine)}`);
console.log(`identiques : ${courant === racine}`);

// 4. Toute modification de la feuille casse la preuve
titre("4. Tentatives de triche avec la même preuve");
const essais: [string, DocumentLot][] = [
  ["Vrai rapport", inspection],
  [
    "Rapport modifié",
    {
      ...inspection,
      empreinte: empreinte("exemples/rapport_inspection_modifie.pdf", SEL),
    },
  ],
  ["Statut changé", { ...inspection, statut: Statut.ANNULE }],
  ["Autre émetteur", { ...inspection, emetteur: SYNDICAT }],
  ["Autre immeuble", { ...inspection, immeuble: "0x" + "34".repeat(32) }],
];
essais.forEach(([nom, doc]) =>
  console.log(nom.padEnd(16), ":", verifier(racine, doc, inspection.preuve)),
);
