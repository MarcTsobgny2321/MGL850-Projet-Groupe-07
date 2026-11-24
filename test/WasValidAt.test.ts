import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { construireLot, Statut, DocumentLot, TypeDocument } from "../scripts/lots";
import { signer } from "../scripts/signature";

const JOUR = 24 * 3600;
const RAPPORT = "0x" + "aa".repeat(32); // empreinte du rapport d'inspection
const AUTRE = "0x" + "bb".repeat(32); // empreinte d'un autre document
// Type et immeuble (D14) : ProofAnchor les signe et les scelle, sans les juger
const RAPPORT_IMMEUBLE = {
  typeDocument: TypeDocument.INSPECTION,
  immeuble: "0x" + "12".repeat(32),
};

// Scénario commun :
// jour 0 : l'inspecteur émet le rapport, lot 1 scellé
// jour 2 : l'inspecteur annule le rapport, lot 2 scellé
async function scenario() {
  const [admin, scelleur, fraudeur, inspecteur] = await ethers.getSigners();
  const ancre = await ethers.deployContract("ProofAnchor", [
    admin.address,
    scelleur.address,
  ]);
  await ancre.connect(admin).ajouterEmetteur(inspecteur.address);

  // Lot 1 : le rapport est VALIDE
  const emission = (await time.latest()) + 1;
  const valide: DocumentLot = {
    empreinte: RAPPORT,
    emetteur: inspecteur.address,
    ...RAPPORT_IMMEUBLE,
    statut: Statut.VALIDE,
    dateStatut: emission,
    dateExpiration: 0,
  };
  const autre: DocumentLot = { ...valide, empreinte: AUTRE };
  const lot1 = construireLot([valide, autre]);
  await ancre.connect(scelleur).anchor(lot1.racine);
  const scellement1 = await time.latest();

  // Lot 2, deux jours plus tard : le rapport est ANNULE
  await time.increase(2 * JOUR);
  const annule: DocumentLot = {
    ...valide,
    statut: Statut.ANNULE,
    dateStatut: (await time.latest()) + 1,
    dateExpiration: 0,
  };
  const lot2 = construireLot([annule, autre]);
  await ancre.connect(scelleur).anchor(lot2.racine);
  const scellement2 = await time.latest();

  const sigValide = await signer(inspecteur, valide);
  const sigAnnule = await signer(inspecteur, annule);

  return {
    ancre,
    admin,
    scelleur,
    fraudeur,
    inspecteur,
    valide,
    annule,
    lot1,
    lot2,
    scellement1,
    scellement2,
    sigValide,
    sigAnnule,
  };
}

// Convertit un DocumentLot en struct Document du contrat
const versStruct = (d: DocumentLot) => ({
  empreinte: d.empreinte,
  emetteur: d.emetteur,
  typeDocument: d.typeDocument,
  immeuble: d.immeuble,
  statut: d.statut,
  dateStatut: d.dateStatut,
  dateExpiration: d.dateExpiration,
});

describe("ProofAnchor : wasValidAt", () => {
  it("le rapport est valide entre le lot 1 et le lot 2", async () => {
    const s = await scenario();
    const jour1 = s.scellement1 + JOUR;

    expect(
      await s.ancre.wasValidAt(
        1,
        versStruct(s.valide),
        s.lot1.preuves[0].preuve,
        s.sigValide,
        jour1,
      ),
    ).to.be.true;
  });

  it("une vieille preuve (lot 1) est refusée après le lot 2 (D3)", async () => {
    const s = await scenario();

    expect(
      await s.ancre.wasValidAt(
        1,
        versStruct(s.valide),
        s.lot1.preuves[0].preuve,
        s.sigValide,
        s.scellement2,
      ),
    ).to.be.false;
  });

  it("le rapport annulé, dans le lot 2, n'est pas valide", async () => {
    const s = await scenario();

    expect(
      await s.ancre.wasValidAt(
        2,
        versStruct(s.annule),
        s.lot2.preuves[0].preuve,
        s.sigAnnule,
        s.scellement2,
      ),
    ).to.be.false;
  });

  it("refuse une date avant le premier lot et une date future", async () => {
    const s = await scenario();
    const preuve = s.lot1.preuves[0].preuve;
    const doc = versStruct(s.valide);

    expect(
      await s.ancre.wasValidAt(1, doc, preuve, s.sigValide, s.scellement1 - 1),
    ).to.be.false;
    // Date future : on demande le lot 2 (le dernier), un an plus tard
    const futur = (await time.latest()) + 365 * JOUR;
    expect(
      await s.ancre.wasValidAt(
        2,
        versStruct(s.annule),
        s.lot2.preuves[0].preuve,
        s.sigAnnule,
        futur,
      ),
    ).to.be.false;
  });

  it("refuse un document modifié avec la preuve du vrai", async () => {
    const s = await scenario();
    const modifie = {
      ...versStruct(s.valide),
      empreinte: "0x" + "cc".repeat(32),
    };

    expect(
      await s.ancre.wasValidAt(
        1,
        modifie,
        s.lot1.preuves[0].preuve,
        s.sigValide,
        s.scellement1,
      ),
    ).to.be.false;
  });

  it("refuse la preuve d'un document avec la signature d'un autre", async () => {
    const s = await scenario();
    const autre = s.lot1.preuves[1];
    const verifier = (sig: string) =>
      s.ancre.wasValidAt(
        1,
        versStruct(autre),
        autre.preuve,
        sig,
        s.scellement1,
      );

    // Preuve du document AUTRE, signature du RAPPORT : refus
    expect(await verifier(s.sigValide)).to.be.false;
    // Témoin : avec sa propre signature, AUTRE est accepté
    const sigAutre = await signer(s.inspecteur, autre);
    expect(await verifier(sigAutre)).to.be.true;
  });

  it("refuse une feuille au nom de l'inspecteur signée par un fraudeur (D7)", async () => {
    const s = await scenario();
    // Un scelleur piraté met une fausse feuille dans un lot 3
    const faux: DocumentLot = {
      empreinte: "0x" + "dd".repeat(32),
      emetteur: s.inspecteur.address,
      ...RAPPORT_IMMEUBLE,
      statut: Statut.VALIDE,
      dateStatut: await time.latest(),
      dateExpiration: 0,
    };
    const lot3 = construireLot([faux, s.valide]);
    await s.ancre.connect(s.scelleur).anchor(lot3.racine);
    const sigFraudeur = await signer(s.fraudeur, faux);

    const verifier = async (sig: string) =>
      s.ancre.wasValidAt(
        3,
        versStruct(faux),
        lot3.preuves[0].preuve,
        sig,
        await time.latest(),
      );

    expect(await verifier(sigFraudeur)).to.be.false;
    // Témoin : si l'inspecteur avait signé, la même feuille serait acceptée
    const sigInspecteur = await signer(s.inspecteur, faux);
    expect(await verifier(sigInspecteur)).to.be.true;
  });

  it("refuse un émetteur jamais reconnu, même s'il signe lui-même", async () => {
    const s = await scenario();
    const doc: DocumentLot = {
      empreinte: "0x" + "ee".repeat(32),
      emetteur: s.fraudeur.address,
      ...RAPPORT_IMMEUBLE,
      statut: Statut.VALIDE,
      dateStatut: await time.latest(),
      dateExpiration: 0,
    };
    const lot3 = construireLot([doc, s.valide]);
    await s.ancre.connect(s.scelleur).anchor(lot3.racine);
    const sig = await signer(s.fraudeur, doc);

    expect(
      await s.ancre.wasValidAt(
        3,
        versStruct(doc),
        lot3.preuves[0].preuve,
        sig,
        await time.latest(),
      ),
    ).to.be.false;
  });

  it("le retrait de l'émetteur n'invalide pas un document émis avant (D4)", async () => {
    const [admin, scelleur, , inspecteur] = await ethers.getSigners();
    const ancre = await ethers.deployContract("ProofAnchor", [
      admin.address,
      scelleur.address,
    ]);
    await ancre.connect(admin).ajouterEmetteur(inspecteur.address);

    const doc: DocumentLot = {
      empreinte: RAPPORT,
      emetteur: inspecteur.address,
      ...RAPPORT_IMMEUBLE,
      statut: Statut.VALIDE,
      dateStatut: (await time.latest()) + 1,
      dateExpiration: 0,
    };
    const sig = await signer(inspecteur, doc);
    const lot = construireLot([doc, { ...doc, empreinte: AUTRE }]);
    await ancre.connect(scelleur).anchor(lot.racine);

    // L'inspecteur prend sa retraite trois jours plus tard
    await time.increase(3 * JOUR);
    await ancre.connect(admin).retirerEmetteur(inspecteur.address);

    expect(
      await ancre.wasValidAt(
        1,
        versStruct(doc),
        lot.preuves[0].preuve,
        sig,
        await time.latest(),
      ),
    ).to.be.true;
  });
});

describe("ProofAnchor : wasValidAt et date d'expiration", () => {
  // Un document qui expire 30 jours après son émission, seul dans son lot
  async function documentQuiExpire() {
    const [admin, scelleur, , inspecteur] = await ethers.getSigners();
    const ancre = await ethers.deployContract("ProofAnchor", [
      admin.address,
      scelleur.address,
    ]);
    await ancre.connect(admin).ajouterEmetteur(inspecteur.address);

    const emission = (await time.latest()) + 1;
    const doc: DocumentLot = {
      empreinte: RAPPORT,
      emetteur: inspecteur.address,
      ...RAPPORT_IMMEUBLE,
      statut: Statut.VALIDE,
      dateStatut: emission,
      dateExpiration: emission + 30 * JOUR,
    };
    const sig = await signer(inspecteur, doc);
    const lot = construireLot([doc, { ...doc, empreinte: AUTRE }]);
    await ancre.connect(scelleur).anchor(lot.racine);
    await time.increase(60 * JOUR); // pour pouvoir demander des dates passées

    const verifier = (date: number) =>
      ancre.wasValidAt(1, versStruct(doc), lot.preuves[0].preuve, sig, date);
    return { doc, verifier };
  }

  it("valide avant l'expiration, sans nouveau lot ni annulation", async () => {
    const { doc, verifier } = await documentQuiExpire();
    expect(await verifier(doc.dateExpiration - 1)).to.be.true;
  });

  it("invalide au moment exact de l'expiration et après", async () => {
    const { doc, verifier } = await documentQuiExpire();
    expect(await verifier(doc.dateExpiration)).to.be.false;
    expect(await verifier(doc.dateExpiration + JOUR)).to.be.false;
  });
});

