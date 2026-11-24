// Fausse plateforme : données fixes en mémoire, sans chaîne.
// Sert à valider les écrans avant de brancher PlateformeChaine.
import { empreinteOctets } from "../../../scripts/hachage";
import { Statut, TypeDocument } from "../../../scripts/lots";
import {
  ActionsDossier,
  Compte,
  Dossier,
  Etape,
  Infos,
  Plateforme,
  Recu,
  RefusContrat,
  Verification,
} from "./Plateforme";
import { dateLisible, empreinteCourte } from "../format";

const JOUR = 24 * 3600;
const maintenant = () => Math.floor(Date.now() / 1000);
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Mêmes adresses que les comptes de test Hardhat (scripts/comptes.ts)
const COMPTES: Compte[] = [
  { role: "courtier", adresse: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc" },
  { role: "vendeur", adresse: "0x976EA74026E726554dB657fA54763abd0C3a0aa9" },
  { role: "acheteur", adresse: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955" },
  { role: "notaire", adresse: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f" },
];
const INSPECTEUR = { role: "inspecteur", adresse: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" };
const SYNDICAT = { role: "syndicat", adresse: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" };
const [COURTIER, VENDEUR, ACHETEUR, NOTAIRE] = COMPTES;

const LOT_SCELLE = maintenant() - JOUR; // le lot 1 a été scellé hier

function nouveauDossier(id: number, etat: Dossier["etat"], deposes: number): Dossier {
  const limite = maintenant() + 9 * JOUR;
  const depot = maintenant() - 2 * 3600;
  return {
    id,
    etat,
    immeuble: "0x0f93731a5b6542cac237f1152ae6e594476bfcf0b86efa33a48b38c49d0a2bce",
    courtier: COURTIER,
    vendeur: VENDEUR,
    acheteur: ACHETEUR,
    notaire: NOTAIRE,
    accordVendeur: etat !== "EnAttenteAccord",
    accordAcheteur: etat !== "EnAttenteAccord",
    documents: [
      { type: "Rapport d'inspection", emetteur: INSPECTEUR, deposant: ACHETEUR, dateLimite: limite,
        dateDepot: deposes >= 1 ? depot : undefined, enRetard: false, expire: false },
      { type: "Attestation du syndicat", emetteur: SYNDICAT, deposant: VENDEUR, dateLimite: limite,
        dateDepot: deposes >= 2 ? depot : undefined, enRetard: false, expire: false },
    ],
    conformeSiFermeMaintenant: deposes === 2,
  };
}

export class PlateformeFactice implements Plateforme {
  private dossiers: Dossier[] = [
    nouveauDossier(1, "Ferme", 2),
    nouveauDossier(2, "FermeNonConforme", 1),
    nouveauDossier(3, "Actif", 1),
    nouveauDossier(4, "EnAttenteAccord", 0),
  ];

  async infos(): Promise<Infos> {
    return {
      proofAnchor: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      transactionWorkflow: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      nbLots: 1,
      nbDossiers: this.dossiers.length,
      heureChaine: maintenant(),
    };
  }

  async comptes() {
    return COMPTES;
  }

  // Seule l'empreinte est vraiment recalculée ; le lot et le contrat sont simulés
  async verifier(pdf: Uint8Array, recu: Recu, date?: number, cadastre?: string): Promise<Verification> {
    await pause(500);
    const quand = date ?? maintenant();
    const emp = empreinteOctets(recu.sel, pdf);
    const etapes: Etape[] = [{ nom: "Empreinte recalculée", valeur: empreinteCourte(emp), ok: true }];
    const echec = (raison: string, etape: Etape): Verification => ({
      valide: false, date: quand, raison, etapes: [...etapes, etape],
    });

    if (quand < LOT_SCELLE) {
      return echec("Aucun lot n'était encore scellé à cette date.",
        { nom: "Lot en vigueur", valeur: "aucun", ok: false });
    }
    if (emp !== recu.empreinte) {
      return echec("Ce PDF ne correspond à aucun document scellé. Il a peut-être été modifié.",
        { nom: "Recherche dans le lot 1", valeur: "absent", ok: false });
    }
    etapes.push({ nom: "Lot en vigueur", valeur: `Lot 1, scellé le ${dateLisible(LOT_SCELLE)}`, ok: true });
    etapes.push({ nom: "Type", valeur: TypeDocument[recu.typeDocument] === "INSPECTION" ? "Rapport d'inspection" : "Attestation du syndicat", ok: true });
    const statut = recu.statut === Statut.VALIDE ? "Valide" : "Annulé";
    etapes.push({ nom: "Statut", valeur: `${statut} depuis le ${dateLisible(recu.dateStatut)}`, ok: true });

    if (recu.dateExpiration !== 0 && quand >= recu.dateExpiration) {
      return echec(`Ce document a expiré le ${dateLisible(recu.dateExpiration)}.`,
        { nom: "Expiration", valeur: dateLisible(recu.dateExpiration), ok: false });
    }
    etapes.push({ nom: "Expiration", valeur: recu.dateExpiration ? dateLisible(recu.dateExpiration) : "aucune", ok: true });
    if (cadastre) etapes.push({ nom: "Immeuble", valeur: `cadastre ${cadastre}, confirmé`, ok: true });
    return { valide: true, date: quand, etapes };
  }

  async listerDossiers() {
    return this.dossiers;
  }

  async lireDossier(id: number) {
    const d = this.dossiers.find((x) => x.id === id);
    if (!d) throw new Error(`Le dossier ${id} n'existe pas`);
    return d;
  }

  pour(compte: Compte): ActionsDossier {
    return {
      ouvrir: async () => {
        await pause(700);
        const id = this.dossiers.length + 1;
        this.dossiers.push(nouveauDossier(id, "EnAttenteAccord", 0));
        return id;
      },
      approuver: async (id) => {
        await pause(700);
        const d = await this.lireDossier(id);
        if (compte.role === "vendeur") d.accordVendeur = true;
        else if (compte.role === "acheteur") d.accordAcheteur = true;
        else throw new RefusContrat("Pas une partie du dossier");
        if (d.accordVendeur && d.accordAcheteur) d.etat = "Actif";
      },
      deposer: async (id, _pdf, recu) => {
        await pause(700);
        const d = await this.lireDossier(id);
        const doc = d.documents.find((x) => x.deposant.role === compte.role && !x.dateDepot);
        if (!doc) throw new RefusContrat("Mauvais deposant");
        if (recu.immeuble !== d.immeuble) throw new RefusContrat("Mauvais immeuble");
        doc.dateDepot = maintenant();
        d.conformeSiFermeMaintenant = d.documents.every((x) => x.dateDepot);
      },
      fermer: async (id) => {
        await pause(700);
        const d = await this.lireDossier(id);
        if (compte.role !== "notaire") throw new RefusContrat("Seul le notaire ferme");
        d.etat = d.conformeSiFermeMaintenant ? "Ferme" : "FermeNonConforme";
        return d.etat;
      },
    };
  }
}
