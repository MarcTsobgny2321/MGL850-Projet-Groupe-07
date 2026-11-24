import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { construireLot, Statut, DocumentLot, TypeDocument } from "../scripts/lots";
import { signer } from "../scripts/signature";

const JOUR = 24 * 3600;
const IMMEUBLE = "0x" + "12".repeat(32); // cadastre salé (D14)
const AUTRE_IMMEUBLE = "0x" + "34".repeat(32);

// États de l'enum Etat du contrat
const ETAT = { EnAttenteAccord: 1, Actif: 2, Ferme: 3, FermeNonConforme: 4 };

// Retire les champs en trop (preuve) pour obtenir la struct Document du contrat
const versStruct = (d: DocumentLot) => ({
  empreinte: d.empreinte,
  emetteur: d.emetteur,
  typeDocument: d.typeDocument,
  immeuble: d.immeuble,
  statut: d.statut,
  dateStatut: d.dateStatut,
  dateExpiration: d.dateExpiration,
});

// Deux contrats, deux émetteurs reconnus, un dossier ouvert qui attend :
// 0 : le rapport d'inspection, déposé par l'acheteur
// 1 : l'attestation du syndicat, déposée par le vendeur
async function dossierOuvert() {
  const [admin, scelleur, inspecteur, syndicat, fraudeur, courtier, vendeur, acheteur, notaire] =
    await ethers.getSigners();
  const ancre = await ethers.deployContract("ProofAnchor", [admin.address, scelleur.address]);
  await ancre.connect(admin).ajouterEmetteur(inspecteur.address);
  await ancre.connect(admin).ajouterEmetteur(syndicat.address);
  const flux = await ethers.deployContract("TransactionWorkflow", [await ancre.getAddress()]);

  const limite = (await time.latest()) + 10 * JOUR;
  await flux.connect(courtier).ouvrirDossier(vendeur.address, acheteur.address, notaire.address, IMMEUBLE, [
    { typeDocument: TypeDocument.INSPECTION, emetteur: inspecteur.address, deposant: acheteur.address, dateLimite: limite },
    { typeDocument: TypeDocument.ATTESTATION_SYNDICAT, emetteur: syndicat.address, deposant: vendeur.address, dateLimite: limite },
  ]);

  // Un document signé par son émetteur, prêt à être scellé
  async function document(emetteur: typeof inspecteur, champs: Partial<DocumentLot>) {
    const doc: DocumentLot = {
      empreinte: ethers.hexlify(ethers.randomBytes(32)),
      emetteur: emetteur.address,
      typeDocument: TypeDocument.INSPECTION,
      immeuble: IMMEUBLE,
      statut: Statut.VALIDE,
      dateStatut: await time.latest(),
      dateExpiration: 0,
      ...champs,
    };
    return { doc, signature: await signer(emetteur, doc) };
  }

  // Scelle un lot et rend, pour chaque document, de quoi le déposer
  async function sceller(docs: { doc: DocumentLot; signature: string }[]) {
    const lot = construireLot(docs.map((d) => d.doc));
    await ancre.connect(scelleur).anchor(lot.racine);
    const numeroLot = await ancre.dernierLot();
    return docs.map((d, i) => ({
      doc: versStruct(d.doc),
      preuve: lot.preuves[i].preuve,
      signature: d.signature,
      numeroLot,
    }));
  }

  return {
    ancre, flux, limite, document, sceller,
    admin, scelleur, inspecteur, syndicat, fraudeur, courtier, vendeur, acheteur, notaire,
  };
}

type Contexte = Awaited<ReturnType<typeof dossierOuvert>>;
type Depot = Awaited<ReturnType<Contexte["sceller"]>>[number];

async function approuverLesDeux(s: Contexte) {
  await s.flux.connect(s.vendeur).approuver(1);
  await s.flux.connect(s.acheteur).approuver(1);
}

// Le rapport et l'attestation, valides, scellés dans le même lot
async function deuxDocumentsScelles(s: Contexte) {
  const rapport = await s.document(s.inspecteur, {});
  const attestation = await s.document(s.syndicat, { typeDocument: TypeDocument.ATTESTATION_SYNDICAT });
  return s.sceller([rapport, attestation]);
}

function deposer(s: Contexte, qui: typeof s.vendeur, numero: number, d: Depot) {
  return s.flux.connect(qui).deposer(1, numero, d.doc, d.preuve, d.signature, d.numeroLot);
}

describe("TransactionWorkflow : ouverture et accord", () => {
  it("le dossier attend l'accord, puis devient actif quand les deux parties approuvent", async () => {
    const s = await dossierOuvert();
    expect((await s.flux.dossiers(1)).etat).to.equal(ETAT.EnAttenteAccord);

    await s.flux.connect(s.vendeur).approuver(1);
    expect((await s.flux.dossiers(1)).etat).to.equal(ETAT.EnAttenteAccord);

    await expect(s.flux.connect(s.acheteur).approuver(1)).to.emit(s.flux, "DossierActif").withArgs(1);
    expect((await s.flux.dossiers(1)).etat).to.equal(ETAT.Actif);
  });

  it("refuse l'accord d'une personne hors du dossier", async () => {
    const s = await dossierOuvert();
    await expect(s.flux.connect(s.courtier).approuver(1)).to.be.revertedWith("Pas une partie du dossier");
  });

  it("refuse un document déposé par quelqu'un d'autre que le vendeur ou l'acheteur", async () => {
    const s = await dossierOuvert();
    await expect(
      s.flux.connect(s.courtier).ouvrirDossier(s.vendeur.address, s.acheteur.address, s.notaire.address, IMMEUBLE, [
        { typeDocument: 1, emetteur: s.inspecteur.address, deposant: s.courtier.address, dateLimite: s.limite },
      ]),
    ).to.be.revertedWith("Deposant hors dossier");
  });

  it("refuse un dépôt avant l'accord des deux parties", async () => {
    const s = await dossierOuvert();
    const [rapport] = await deuxDocumentsScelles(s);
    await expect(deposer(s, s.acheteur, 0, rapport)).to.be.revertedWith("Mauvais etat du dossier");
  });
});

describe("TransactionWorkflow : dépôt", () => {
  it("flow nominal : deux dépôts à temps, puis le notaire ferme, Ferme", async () => {
    const s = await dossierOuvert();
    await approuverLesDeux(s);
    const [rapport, attestation] = await deuxDocumentsScelles(s);

    await expect(deposer(s, s.acheteur, 0, rapport))
      .to.emit(s.flux, "DocumentDepose")
      .withArgs(1, 0, rapport.doc.empreinte, true);
    await deposer(s, s.vendeur, 1, attestation);

    await expect(s.flux.connect(s.notaire).fermer(1)).to.emit(s.flux, "DossierFerme").withArgs(1, ETAT.Ferme);
  });

  it("refuse le rapport déposé par le vendeur au lieu de l'acheteur", async () => {
    const s = await dossierOuvert();
    await approuverLesDeux(s);
    const [rapport] = await deuxDocumentsScelles(s);
    await expect(deposer(s, s.vendeur, 0, rapport)).to.be.revertedWith("Mauvais deposant");
  });

  it("refuse un vrai rapport d'une autre maison (D14)", async () => {
    const s = await dossierOuvert();
    await approuverLesDeux(s);
    const [ailleurs] = await s.sceller([
      await s.document(s.inspecteur, { immeuble: AUTRE_IMMEUBLE }),
      await s.document(s.inspecteur, {}),
    ]);
    await expect(deposer(s, s.acheteur, 0, ailleurs)).to.be.revertedWith("Mauvais immeuble");
  });

  it("refuse un document de type inspection signé par le syndicat", async () => {
    const s = await dossierOuvert();
    await approuverLesDeux(s);
    const [faux] = await s.sceller([
      await s.document(s.syndicat, { typeDocument: TypeDocument.INSPECTION }),
      await s.document(s.inspecteur, {}),
    ]);
    await expect(deposer(s, s.acheteur, 0, faux)).to.be.revertedWith("Mauvais emetteur");
  });

  it("refuse une attestation déposée à la place du rapport", async () => {
    const s = await dossierOuvert();
    await approuverLesDeux(s);
    const [, attestation] = await deuxDocumentsScelles(s);
    await expect(deposer(s, s.acheteur, 0, attestation)).to.be.revertedWith("Mauvais type");
  });

  it("refuse un rapport modifié, avec la preuve et la signature du vrai", async () => {
    const s = await dossierOuvert();
    await approuverLesDeux(s);
    const [rapport] = await deuxDocumentsScelles(s);
    const modifie = { ...rapport, doc: { ...rapport.doc, empreinte: ethers.hexlify(ethers.randomBytes(32)) } };
    await expect(deposer(s, s.acheteur, 0, modifie)).to.be.revertedWith("Document non valide");
  });

  it("refuse un rapport annulé dans le lot en vigueur, et l'ancienne preuve valide (D3)", async () => {
    const s = await dossierOuvert();
    await approuverLesDeux(s);
    const { doc } = await s.document(s.inspecteur, {});
    const [ancien] = await s.sceller([{ doc, signature: await signer(s.inspecteur, doc) }, await s.document(s.inspecteur, {})]);

    // L'inspecteur annule : nouveau lot
    await time.increase(JOUR);
    const annule = { ...doc, statut: Statut.ANNULE, dateStatut: await time.latest() };
    const [nouveau] = await s.sceller([
      { doc: annule, signature: await signer(s.inspecteur, annule) },
      await s.document(s.inspecteur, {}),
    ]);

    await expect(deposer(s, s.acheteur, 0, nouveau)).to.be.revertedWith("Document non valide");
    await expect(deposer(s, s.acheteur, 0, ancien)).to.be.revertedWith("Document non valide");
  });

  it("refuse un deuxième dépôt du même document attendu", async () => {
    const s = await dossierOuvert();
    await approuverLesDeux(s);
    const [rapport] = await deuxDocumentsScelles(s);
    await deposer(s, s.acheteur, 0, rapport);
    await expect(deposer(s, s.acheteur, 0, rapport)).to.be.revertedWith("Deja depose");
  });
});

describe("TransactionWorkflow : clôture", () => {
  it("seul le notaire ferme, et une seule fois", async () => {
    const s = await dossierOuvert();
    await approuverLesDeux(s);
    await expect(s.flux.connect(s.courtier).fermer(1)).to.be.revertedWith("Seul le notaire ferme");
    await s.flux.connect(s.notaire).fermer(1);
    await expect(s.flux.connect(s.notaire).fermer(1)).to.be.revertedWith("Mauvais etat du dossier");
  });

  it("document manquant : FermeNonConforme", async () => {
    const s = await dossierOuvert();
    await approuverLesDeux(s);
    const [rapport] = await deuxDocumentsScelles(s);
    await deposer(s, s.acheteur, 0, rapport);

    await s.flux.connect(s.notaire).fermer(1);
    expect((await s.flux.dossiers(1)).etat).to.equal(ETAT.FermeNonConforme);
  });

  it("dépôt après la date limite : accepté, mais FermeNonConforme (D5)", async () => {
    const s = await dossierOuvert();
    await approuverLesDeux(s);
    await time.increaseTo(s.limite + JOUR);
    const [rapport, attestation] = await deuxDocumentsScelles(s);

    await expect(deposer(s, s.acheteur, 0, rapport))
      .to.emit(s.flux, "DocumentDepose")
      .withArgs(1, 0, rapport.doc.empreinte, false);
    await deposer(s, s.vendeur, 1, attestation);

    await s.flux.connect(s.notaire).fermer(1);
    expect((await s.flux.dossiers(1)).etat).to.equal(ETAT.FermeNonConforme);
  });

  it("document expiré entre le dépôt et la clôture : FermeNonConforme", async () => {
    const s = await dossierOuvert();
    await approuverLesDeux(s);
    const expiration = (await time.latest()) + 5 * JOUR;
    const [rapport, attestation] = await s.sceller([
      await s.document(s.inspecteur, { dateExpiration: expiration }),
      await s.document(s.syndicat, { typeDocument: TypeDocument.ATTESTATION_SYNDICAT }),
    ]);
    await deposer(s, s.acheteur, 0, rapport);
    await deposer(s, s.vendeur, 1, attestation);
    expect(await s.flux.estConforme(1)).to.be.true;

    await time.increaseTo(expiration);
    await s.flux.connect(s.notaire).fermer(1);
    expect((await s.flux.dossiers(1)).etat).to.equal(ETAT.FermeNonConforme);
  });
});
