import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { signer, messageASigner } from "../scripts/signature";
import { Statut, TypeDocument } from "../scripts/lots";

const RACINE_1 = "0x" + "11".repeat(32);
const RACINE_2 = "0x" + "22".repeat(32);

async function deployer() {
  const [admin, scelleur, fraudeur, inspecteur] = await ethers.getSigners();
  const ancre = await ethers.deployContract("ProofAnchor", [
    admin.address,
    scelleur.address,
  ]);
  return { ancre, admin, scelleur, fraudeur, inspecteur };
}

describe("ProofAnchor : sceller un lot", () => {
  it("le scelleur scelle un lot avec la date du bloc", async () => {
    const { ancre, scelleur } = await deployer();

    await expect(ancre.connect(scelleur).anchor(RACINE_1)).to.emit(
      ancre,
      "LotScelle",
    );

    const lot = await ancre.lots(1);
    expect(lot.racine).to.equal(RACINE_1);
    expect(lot.dateScellement).to.equal(await time.latest());
    expect(await ancre.dernierLot()).to.equal(1);
  });

  it("les lots sont numérotés dans l'ordre", async () => {
    const { ancre, scelleur } = await deployer();

    await ancre.connect(scelleur).anchor(RACINE_1);
    await time.increase(3600); // une heure plus tard
    await ancre.connect(scelleur).anchor(RACINE_2);

    const lot1 = await ancre.lots(1);
    const lot2 = await ancre.lots(2);
    expect(lot2.racine).to.equal(RACINE_2);
    expect(lot2.dateScellement).to.be.greaterThan(lot1.dateScellement);
    expect(await ancre.dernierLot()).to.equal(2);
  });

  it("un compte sans le rôle SCELLEUR est refusé", async () => {
    const { ancre, fraudeur } = await deployer();

    await expect(
      ancre.connect(fraudeur).anchor(RACINE_1),
    ).to.be.revertedWithCustomError(ancre, "AccessControlUnauthorizedAccount");
    expect(await ancre.dernierLot()).to.equal(0);
  });

  it("une racine vide est refusée", async () => {
    const { ancre, scelleur } = await deployer();

    await expect(
      ancre.connect(scelleur).anchor(ethers.ZeroHash),
    ).to.be.revertedWith("Racine vide");
  });

  it("l'administrateur peut retirer le rôle au scelleur", async () => {
    const { ancre, admin, scelleur } = await deployer();

    await ancre
      .connect(admin)
      .revokeRole(await ancre.SCELLEUR(), scelleur.address);

    await expect(
      ancre.connect(scelleur).anchor(RACINE_1),
    ).to.be.revertedWithCustomError(ancre, "AccessControlUnauthorizedAccount");
  });
});

describe("ProofAnchor : émetteurs avec dates", () => {
  const JOUR = 24 * 3600;

  it("seul l'administrateur gère les émetteurs", async () => {
    const { ancre, scelleur, fraudeur } = await deployer();

    await expect(
      ancre.connect(scelleur).ajouterEmetteur(fraudeur.address),
    ).to.be.revertedWithCustomError(ancre, "AccessControlUnauthorizedAccount");
  });

  it("un émetteur est reconnu entre son ajout et son retrait", async () => {
    const { ancre, admin, inspecteur } = await deployer();

    await ancre.connect(admin).ajouterEmetteur(inspecteur.address);
    const ajout = await time.latest();
    await time.increase(10 * JOUR);
    await ancre.connect(admin).retirerEmetteur(inspecteur.address);
    const retrait = await time.latest();

    expect(await ancre.estReconnuA(inspecteur.address, ajout - 1)).to.be.false;
    expect(await ancre.estReconnuA(inspecteur.address, ajout)).to.be.true;
    expect(await ancre.estReconnuA(inspecteur.address, retrait - 1)).to.be
      .true;
    expect(await ancre.estReconnuA(inspecteur.address, retrait)).to.be.false;
  });

  it("une adresse inconnue n'est jamais reconnue", async () => {
    const { ancre, fraudeur } = await deployer();

    expect(await ancre.estReconnuA(fraudeur.address, await time.latest())).to
      .be.false;
  });

  it("une adresse ne peut pas être ajoutée deux fois, même après un retrait", async () => {
    const { ancre, admin, inspecteur } = await deployer();

    await ancre.connect(admin).ajouterEmetteur(inspecteur.address);
    await expect(
      ancre.connect(admin).ajouterEmetteur(inspecteur.address),
    ).to.be.revertedWith("Deja ajoute");

    await ancre.connect(admin).retirerEmetteur(inspecteur.address);
    await expect(
      ancre.connect(admin).ajouterEmetteur(inspecteur.address),
    ).to.be.revertedWith("Deja ajoute");
  });

  it("on ne retire pas un émetteur inconnu ou déjà retiré", async () => {
    const { ancre, admin, inspecteur } = await deployer();

    await expect(
      ancre.connect(admin).retirerEmetteur(inspecteur.address),
    ).to.be.revertedWith("Emetteur inconnu");

    await ancre.connect(admin).ajouterEmetteur(inspecteur.address);
    await ancre.connect(admin).retirerEmetteur(inspecteur.address);
    await expect(
      ancre.connect(admin).retirerEmetteur(inspecteur.address),
    ).to.be.revertedWith("Deja retire");
  });
});

describe("ProofAnchor : signature de l'émetteur", () => {
  const DOC = {
    empreinte: "0x" + "aa".repeat(32),
    typeDocument: TypeDocument.INSPECTION,
    immeuble: "0x" + "12".repeat(32),
    statut: Statut.VALIDE,
    dateStatut: 1794182400, // 9 nov. 2026
    dateExpiration: 1794182400 + 30 * 24 * 3600, // 30 jours plus tard
  };

  it("accepte la signature de l'émetteur pour le bon message", async () => {
    const { ancre, inspecteur } = await deployer();
    const sig = await signer(inspecteur, DOC);

    expect(
      await ancre.signatureValide({ ...DOC, emetteur: inspecteur.address }, sig),
    ).to.be.true;
  });

  it("refuse la signature si un champ du message change", async () => {
    const { ancre, inspecteur } = await deployer();
    const sig = await signer(inspecteur, DOC);
    const signe = { ...DOC, emetteur: inspecteur.address };

    // Autre document, type, immeuble, statut, date, expiration prolongée : à chaque fois, refus
    const modifications = [
      { empreinte: "0x" + "bb".repeat(32) },
      { typeDocument: TypeDocument.ATTESTATION_SYNDICAT },
      { immeuble: "0x" + "34".repeat(32) },
      { statut: Statut.ANNULE },
      { dateStatut: DOC.dateStatut - 1 },
      { dateExpiration: DOC.dateExpiration + 365 * 24 * 3600 },
    ];
    for (const m of modifications) {
      expect(await ancre.signatureValide({ ...signe, ...m }, sig)).to.be.false;
    }
  });

  it("refuse un fraudeur qui signe au nom de l'inspecteur", async () => {
    const { ancre, inspecteur, fraudeur } = await deployer();
    const sig = await signer(fraudeur, DOC);

    expect(
      await ancre.signatureValide({ ...DOC, emetteur: inspecteur.address }, sig),
    ).to.be.false;
  });

  it("répond faux, sans planter, pour une signature mal formée", async () => {
    const { ancre, inspecteur } = await deployer();

    expect(
      await ancre.signatureValide(
        { ...DOC, emetteur: inspecteur.address },
        "0x1234",
      ),
    ).to.be.false;
  });

  it("le message est le même en TypeScript et en Solidity", async () => {
    const { ancre, inspecteur } = await deployer();

    expect(
      await ancre.messageASigner({ ...DOC, emetteur: inspecteur.address }),
    ).to.equal(messageASigner(DOC));
  });
});
