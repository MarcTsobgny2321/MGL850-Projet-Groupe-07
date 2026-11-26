// Vraie plateforme : lit et écrit sur la chaîne locale avec ethers.
// Seul fichier du web qui connaît ethers, TypeChain et les formats des contrats (ADR 0003).
import { ethers } from "ethers";
import { ProofAnchor, ProofAnchor__factory, TransactionWorkflow, TransactionWorkflow__factory } from "../../../typechain-types";
import { empreinteOctets } from "../../../scripts/hachage";
import { Statut } from "../../../scripts/lots";
import { FichierLot, Immeuble } from "../../../scripts/formats";
import { preuveDuDocument } from "../../../scripts/preuve";
import { INDICES, Role } from "../../../scripts/roles";
import { ETATS, numeroAttendu } from "../../../scripts/workflow";
import {
  ActionsDossier,
  Bloc,
  Compte,
  Dossier,
  EtatDossier,
  Etape,
  Infos,
  Plateforme,
  Recu,
  RefusContrat,
  TransactionChaine,
  Verification,
} from "./Plateforme";
import { abreger, dateLisible, libelleType } from "../format";

const JOUR = 24 * 3600;
const ROLES_USAGERS: Role[] = ["courtier", "vendeur", "acheteur", "notaire"];

interface Contrats {
  ancre: ProofAnchor;
  flux: TransactionWorkflow;
}

// Lecture d'un fichier public servi par Vite (null si absent)
async function lireJsonPublic<T>(url: string): Promise<T | null> {
  const r = await fetch(url);
  if (!r.ok) return null;
  return (await r.json()) as T;
}

const lireLot = (n: number) => lireJsonPublic<FichierLot>(`/donnees/lots/lot-${n}.json`);

// Traduit une erreur ethers : le message du require devient un RefusContrat
function traduire(e: unknown): Error {
  const raison = (e as { reason?: string }).reason;
  if (raison) return new RefusContrat(raison);
  return e instanceof Error ? e : new Error(String(e));
}

// Valeur d'un paramètre en texte lisible ; les tableaux et les structs sont parcourus récursivement
function texteValeur(p: ethers.ParamType, v: unknown, roles: Map<string, Role>): string {
  if (p.isArray()) return `[${(v as unknown[]).map((x) => texteValeur(p.arrayChildren, x, roles)).join(", ")}]`;
  if (p.isTuple()) return `{ ${p.components.map((c, i) => `${c.name}: ${texteValeur(c, (v as unknown[])[i], roles)}`).join(", ")} }`;
  if (p.type === "address") return roles.get(String(v).toLowerCase()) ?? abreger(String(v));
  if (p.name.startsWith("date")) return Number(v) === 0 ? "aucune" : dateLisible(Number(v));
  if (p.name === "etat") return ETATS[Number(v)];
  if (p.name === "typeDocument") return libelleType(Number(v));
  if (typeof v === "string" && v.length > 12) return abreger(v);
  return String(v);
}

// « LotScelle(numeroLot: 2, racine: 0x1a2b…9f0e, dateScellement: 24 novembre 2026 à 10 h 00) »
function texteAppel(nom: string, entrees: readonly ethers.ParamType[], args: ethers.Result, roles: Map<string, Role>): string {
  return `${nom}(${entrees.map((p, i) => `${p.name}: ${texteValeur(p, args[i], roles)}`).join(", ")})`;
}

export class PlateformeChaine implements Plateforme {
  // Le relais /rpc de Vite mène à la chaîne Hardhat (adresse complète exigée par ethers)
  private fournisseur = new ethers.JsonRpcProvider(`${location.origin}/rpc`);
  private contratsEnCache: Promise<Contrats> | null = null;
  private rolesEnCache: Promise<Map<string, Role>> | null = null;

  // Adresses lues dans deploiement.json, puis vérifiées : la chaîne a pu être relancée sans redéployer
  private contrats(): Promise<Contrats> {
    this.contratsEnCache ??= (async () => {
      const dep = await lireJsonPublic<{ proofAnchor: string; transactionWorkflow: string }>("/donnees/deploiement.json");
      if (!dep) throw new Error("Aucun déploiement : lancer npm run deployer");
      for (const adresse of [dep.proofAnchor, dep.transactionWorkflow]) {
        if ((await this.fournisseur.getCode(adresse)) === "0x") {
          throw new Error("Aucun contrat à l'adresse enregistrée : la chaîne a été relancée, lancer npm run deployer");
        }
      }
      return {
        ancre: ProofAnchor__factory.connect(dep.proofAnchor, this.fournisseur),
        flux: TransactionWorkflow__factory.connect(dep.transactionWorkflow, this.fournisseur),
      };
    })();
    // En cas d'échec, on réessaiera au prochain appel
    this.contratsEnCache.catch(() => (this.contratsEnCache = null));
    return this.contratsEnCache;
  }

  // Adresse -> rôle, pour afficher « acheteur » plutôt qu'une adresse
  private roles(): Promise<Map<string, Role>> {
    this.rolesEnCache ??= (async () => {
      const carte = new Map<string, Role>();
      for (const [role, i] of Object.entries(INDICES) as [Role, number][]) {
        carte.set((await this.fournisseur.getSigner(i)).address.toLowerCase(), role);
      }
      return carte;
    })();
    return this.rolesEnCache;
  }

  private async compte(adresse: string): Promise<Compte> {
    const role = (await this.roles()).get(adresse.toLowerCase()) ?? "inconnu";
    return { role, adresse };
  }

  private async heureChaine(): Promise<number> {
    return (await this.fournisseur.getBlock("latest"))!.timestamp;
  }

  async infos(): Promise<Infos> {
    const { ancre, flux } = await this.contrats();
    return {
      proofAnchor: await ancre.getAddress(),
      transactionWorkflow: await flux.getAddress(),
      nbLots: Number(await ancre.dernierLot()),
      nbDossiers: Number(await flux.dernierDossier()),
      heureChaine: await this.heureChaine(),
    };
  }

  // Explorateur : lit les blocs un par un, comme le ferait Etherscan, et décode les
  // appels et les événements avec l'ABI de nos deux contrats.
  async derniersBlocs(nombre: number): Promise<Bloc[]> {
    const dernier = await this.fournisseur.getBlockNumber();
    const numeros: number[] = [];
    for (let n = dernier; n >= 0 && numeros.length < nombre; n--) numeros.push(n);

    // Sans déploiement, on affiche quand même les blocs, mais sans noms de contrats
    const dep = await lireJsonPublic<{ proofAnchor: string; transactionWorkflow: string }>("/donnees/deploiement.json");
    const connus = new Map<string, { nom: string; abi: ethers.Interface }>();
    if (dep) {
      connus.set(dep.proofAnchor.toLowerCase(), { nom: "ProofAnchor", abi: ProofAnchor__factory.createInterface() });
      connus.set(dep.transactionWorkflow.toLowerCase(), { nom: "TransactionWorkflow", abi: TransactionWorkflow__factory.createInterface() });
    }
    const roles = await this.roles();

    const lireTransaction = async (tx: ethers.TransactionResponse): Promise<TransactionChaine> => {
      const recu = (await this.fournisseur.getTransactionReceipt(tx.hash))!;
      // to est vide pour un déploiement : l'adresse du nouveau contrat est dans le reçu
      const cible = connus.get((tx.to ?? recu.contractAddress ?? "").toLowerCase());
      let fonction = tx.data === "0x" ? "transfert d'ether" : "inconnue";
      let appel: string | undefined;
      if (!tx.to) fonction = "déploiement";
      else if (cible) {
        const d = cible.abi.parseTransaction({ data: tx.data, value: tx.value });
        if (d) {
          fonction = d.name;
          appel = texteAppel(d.name, d.fragment.inputs, d.args, roles);
        }
      }

      const evenements = recu.logs.map((log) => {
        const e = connus.get(log.address.toLowerCase())?.abi.parseLog(log);
        return e ? texteAppel(e.name, e.fragment.inputs, e.args, roles) : "événement inconnu";
      });

      return {
        hash: tx.hash,
        de: await this.compte(tx.from),
        vers: cible?.nom ?? tx.to ?? recu.contractAddress ?? "?",
        fonction,
        evenements,
        gaz: Number(recu.gasUsed),
        reussie: recu.status === 1,
        appel,
        adresseVers: tx.to ?? undefined,
        contratCree: recu.contractAddress ?? undefined,
        position: tx.index,
        nonce: tx.nonce,
        gazLimite: Number(tx.gasLimit),
        prixGaz: `${ethers.formatUnits(recu.gasPrice, "gwei")} gwei`,
        cout: `${ethers.formatEther(recu.fee)} ETH`,
        valeur: `${ethers.formatEther(tx.value)} ETH`,
        donnees: tx.data,
        signature: tx.signature.serialized,
      };
    };

    return Promise.all(
      numeros.map(async (n) => {
        // true : le bloc arrive avec ses transactions complètes, pas seulement leurs hash
        const b = (await this.fournisseur.getBlock(n, true))!;
        return {
          numero: n,
          date: b.timestamp,
          hash: b.hash!,
          hashPrecedent: b.parentHash,
          transactions: await Promise.all(b.prefetchedTransactions.map(lireTransaction)),
        };
      }),
    );
  }

  async comptes(): Promise<Compte[]> {
    return Promise.all(ROLES_USAGERS.map(async (role) => ({ role, adresse: (await this.fournisseur.getSigner(INDICES[role])).address })));
  }

  // Même logique que scripts/verifier.ts ; chaque étape est vérifiée séparément pour l'affichage,
  // mais la réponse officielle reste celle de wasValidAt
  async verifier(pdf: Uint8Array, recu: Recu, date?: number, cadastre?: string): Promise<Verification> {
    const { ancre } = await this.contrats();
    const maintenant = await this.heureChaine();
    const quand = date ?? maintenant;
    const emp = empreinteOctets(recu.sel, pdf);
    const etapes: Etape[] = [{ nom: "Empreinte recalculée", valeur: "Calculée à partir du PDF et du sel du reçu", ok: true, technique: emp }];
    const echec = (raison: string, etape?: Etape): Verification => ({
      valide: false, date: quand, raison, etapes: etape ? [...etapes, etape] : etapes,
    });

    if (quand > maintenant) {
      return echec("La date demandée est dans le futur : la réponse pourrait encore changer.", { nom: "Date", valeur: dateLisible(quand), ok: false });
    }
    const r = await preuveDuDocument(ancre, emp, quand, lireLot);
    if (!r.trouve) {
      const raison = r.raison.startsWith("PDF absent")
        ? "Ce PDF ne correspond à aucun document scellé. Il a peut-être été modifié, ou il n'est pas encore scellé."
        : r.raison.charAt(0).toUpperCase() + r.raison.slice(1) + ".";
      return echec(raison, { nom: "Recherche dans le lot en vigueur", valeur: r.raison, ok: false });
    }

    const { numeroLot, lot, doc, preuve } = r;
    const { signature, ...champs } = doc;
    etapes.push({ nom: "Lot en vigueur", valeur: `Lot ${numeroLot}, scellé le ${dateLisible(lot.dateScellement)}. Racine identique à celle de la chaîne`, ok: true, technique: lot.racine });
    etapes.push({ nom: "Type", valeur: libelleType(doc.typeDocument), ok: true });

    const reconnu = await ancre.estReconnuA(doc.emetteur, doc.dateStatut);
    const emetteur = await this.compte(doc.emetteur);
    etapes.push({ nom: "Émetteur", valeur: reconnu ? `${emetteur.role}, reconnu à la date d'émission` : `${emetteur.role}, non reconnu à la date d'émission`, ok: reconnu, technique: doc.emetteur });

    const signee = await ancre.signatureValide(champs, signature);
    etapes.push({ nom: "Signature de l'émetteur", valeur: signee ? "Vérifiée" : "Invalide", ok: signee, technique: signature });

    const statutOk = doc.statut === Statut.VALIDE && doc.dateStatut <= quand;
    const libelleStatut = doc.statut === Statut.VALIDE ? "Valide" : "Annulé";
    etapes.push({ nom: "Statut", valeur: `${libelleStatut} depuis le ${dateLisible(doc.dateStatut)}`, ok: statutOk });

    const expire = doc.dateExpiration !== 0 && quand >= doc.dateExpiration;
    etapes.push({ nom: "Expiration", valeur: doc.dateExpiration ? dateLisible(doc.dateExpiration) : "aucune", ok: !expire });

    // Le notaire peut confirmer l'immeuble s'il a le cadastre (D14)
    let immeubleOk = true;
    if (cadastre) {
      const imm = await lireJsonPublic<Immeuble>(`/api/immeuble/${encodeURIComponent(cadastre)}`);
      immeubleOk = imm?.immeuble === doc.immeuble;
      etapes.push({
        nom: "Immeuble",
        valeur: !imm ? `aucun sel connu pour le cadastre ${cadastre}` : immeubleOk ? `cadastre ${cadastre}, confirmé` : `le document ne concerne pas le cadastre ${cadastre}`,
        ok: immeubleOk,
        technique: doc.immeuble,
      });
    }

    // Réponse officielle du contrat (lecture gratuite)
    const valide = (await ancre.wasValidAt(numeroLot, champs, preuve, signature, quand)) && immeubleOk;
    if (valide) return { valide, date: quand, etapes };

    let raison = "Le contrat a refusé ce document.";
    if (!immeubleOk) raison = "Ce document ne concerne pas l'immeuble indiqué.";
    else if (doc.statut !== Statut.VALIDE) raison = `Ce document a été annulé par son émetteur le ${dateLisible(doc.dateStatut)}.`;
    else if (doc.dateStatut > quand) raison = "Ce document n'était pas encore émis à cette date.";
    else if (expire) raison = `Ce document a expiré le ${dateLisible(doc.dateExpiration)}.`;
    else if (!reconnu) raison = "L'émetteur n'était pas reconnu au moment de l'émission.";
    else if (!signee) raison = "La signature ne correspond pas à l'émetteur.";
    return { valide: false, date: quand, raison, etapes };
  }

  async lireDossier(id: number): Promise<Dossier> {
    const { flux } = await this.contrats();
    const d = await flux.dossiers(id);
    if (Number(d.etat) === 0) throw new Error(`Le dossier ${id} n'existe pas`);
    const [attendus, depots, maintenant] = await Promise.all([flux.documentsAttendus(id), flux.depotsDe(id), this.heureChaine()]);
    const etat = ETATS[Number(d.etat)] as EtatDossier;

    const documents = await Promise.all(
      attendus.map(async (a, i) => {
        const p = depots[i];
        const dateDepot = Number(p.dateDepot) || undefined;
        return {
          type: libelleType(Number(a.typeDocument)),
          emetteur: await this.compte(a.emetteur),
          deposant: await this.compte(a.deposant),
          dateLimite: Number(a.dateLimite),
          dateDepot,
          enRetard: dateDepot !== undefined && dateDepot >= Number(a.dateLimite),
          expire: dateDepot !== undefined && Number(p.dateExpiration) !== 0 && maintenant >= Number(p.dateExpiration),
        };
      }),
    );

    return {
      id,
      etat,
      immeuble: d.immeuble,
      courtier: await this.compte(d.courtier),
      vendeur: await this.compte(d.vendeur),
      acheteur: await this.compte(d.acheteur),
      notaire: await this.compte(d.notaire),
      accordVendeur: d.accordVendeur,
      accordAcheteur: d.accordAcheteur,
      documents,
      conformeSiFermeMaintenant: etat === "Actif" ? await flux.estConforme(id) : etat === "Ferme",
    };
  }

  async listerDossiers(): Promise<Dossier[]> {
    const { flux } = await this.contrats();
    const nb = Number(await flux.dernierDossier());
    const dossiers: Dossier[] = [];
    for (let id = 1; id <= nb; id++) dossiers.push(await this.lireDossier(id));
    return dossiers;
  }

  // Les transactions sont signées par la chaîne Hardhat pour ce compte de test (ADR 0004)
  pour(compte: Compte): ActionsDossier {
    const fluxSigne = async () => {
      const { flux } = await this.contrats();
      return flux.connect(await this.fournisseur.getSigner(compte.adresse));
    };
    const adresseDe = async (role: Role) => (await this.fournisseur.getSigner(INDICES[role])).address;

    return {
      ouvrir: async (cadastre, jours) => {
        // Le courtier crée (ou relit) le sel de l'immeuble ; seule l'empreinte va sur la chaîne
        const r = await fetch(`/api/immeuble/${encodeURIComponent(cadastre)}`, { method: "POST" });
        const imm = (await r.json()) as Immeuble & { erreur?: string };
        if (!r.ok) throw new Error(imm.erreur ?? "Registre de l'immeuble indisponible");

        const dateLimite = (await this.heureChaine()) + jours * JOUR;
        const flux = await fluxSigne();
        try {
          const tx = await flux.ouvrirDossier(await adresseDe("vendeur"), await adresseDe("acheteur"), await adresseDe("notaire"), imm.immeuble, [
            { typeDocument: 1, emetteur: await adresseDe("inspecteur"), deposant: await adresseDe("acheteur"), dateLimite },
            { typeDocument: 2, emetteur: await adresseDe("syndicat"), deposant: await adresseDe("vendeur"), dateLimite },
          ]);
          const recu = await tx.wait();
          // Le numéro vient de l'événement DossierOuvert de cette transaction
          for (const log of recu!.logs) {
            const e = flux.interface.parseLog(log);
            if (e?.name === "DossierOuvert") return Number(e.args.id);
          }
          return Number(await flux.dernierDossier());
        } catch (e) {
          throw traduire(e);
        }
      },

      approuver: async (id) => {
        const flux = await fluxSigne();
        try {
          await (await flux.approuver(id)).wait();
        } catch (e) {
          throw traduire(e);
        }
      },

      deposer: async (id, pdf, recu) => {
        const { ancre } = await this.contrats();
        const r = await preuveDuDocument(ancre, empreinteOctets(recu.sel, pdf), await this.heureChaine(), lireLot);
        if (!r.trouve) throw new Error(`Dépôt impossible : ${r.raison}.`);

        const flux = await fluxSigne();
        const numero = numeroAttendu(await flux.documentsAttendus(id), r.doc.typeDocument);
        if (numero < 0) throw new RefusContrat("Document non attendu");

        const { signature, ...champs } = r.doc;
        try {
          await (await flux.deposer(id, numero, champs, r.preuve, signature, r.numeroLot)).wait();
        } catch (e) {
          throw traduire(e);
        }
      },

      fermer: async (id) => {
        const flux = await fluxSigne();
        try {
          await (await flux.fermer(id)).wait();
        } catch (e) {
          throw traduire(e);
        }
        return ETATS[Number((await flux.dossiers(id)).etat)] as EtatDossier;
      },
    };
  }
}
