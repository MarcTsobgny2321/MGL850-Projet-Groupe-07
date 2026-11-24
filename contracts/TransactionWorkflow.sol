// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ProofAnchor.sol";

// Dossier de vente minimal (D12) : accord des parties, documents attendus,
// dépôt vérifié par ProofAnchor, clôture décidée par le contrat.
contract TransactionWorkflow {
    // Aucun : le dossier n'existe pas (valeur par défaut d'un mapping)
    enum Etat { Aucun, EnAttenteAccord, Actif, Ferme, FermeNonConforme }

    // Fixé à l'ouverture : quel document, signé par qui, déposé par qui, avant quand
    struct DocumentAttendu {
        uint8 typeDocument;
        address emetteur;
        address deposant;
        uint64 dateLimite;
    }

    // Rempli au dépôt
    struct Depot {
        bytes32 empreinte;
        uint64 dateDepot; // 0 : pas encore déposé
        uint64 dateExpiration; // copiée de la feuille, contrôlée à la clôture
    }

    struct Dossier {
        address courtier;
        address vendeur;
        address acheteur;
        address notaire;
        bytes32 immeuble; // keccak256(cadastre, selImmeuble), voir D14
        Etat etat;
        bool accordVendeur;
        bool accordAcheteur;
    }

    ProofAnchor public immutable ancre;

    // Numéro du dossier -> dossier. Le premier dossier porte le numéro 1.
    mapping(uint256 => Dossier) public dossiers;
    uint256 public dernierDossier;

    // Gardés à part : un getter public ne retourne pas les tableaux d'une struct
    mapping(uint256 => DocumentAttendu[]) private attendus;
    mapping(uint256 => Depot[]) private depots;

    event DossierOuvert(uint256 indexed id, address courtier, address vendeur, address acheteur, address notaire);
    event DossierApprouve(uint256 indexed id, address partie);
    event DossierActif(uint256 indexed id);
    event DocumentDepose(uint256 indexed id, uint256 numero, bytes32 empreinte, bool aTemps);
    event DossierFerme(uint256 indexed id, Etat etat);

    constructor(ProofAnchor _ancre) {
        ancre = _ancre;
    }

    modifier dansEtat(uint256 id, Etat etat) {
        require(dossiers[id].etat == etat, "Mauvais etat du dossier");
        _;
    }

    // Le courtier fixe les parties et la liste des documents. Aucun document n'est vérifié ici.
    function ouvrirDossier(
        address vendeur,
        address acheteur,
        address notaire,
        bytes32 immeuble,
        DocumentAttendu[] calldata liste
    ) external returns (uint256 id) {
        require(vendeur != address(0) && acheteur != address(0) && notaire != address(0), "Adresse vide");
        require(vendeur != acheteur, "Vendeur et acheteur identiques");
        require(liste.length > 0, "Aucun document attendu");

        id = ++dernierDossier;
        dossiers[id] = Dossier(msg.sender, vendeur, acheteur, notaire, immeuble, Etat.EnAttenteAccord, false, false);

        for (uint256 i = 0; i < liste.length; i++) {
            // Seules les deux parties déposent : l'émetteur remet le document à son client
            require(liste[i].deposant == vendeur || liste[i].deposant == acheteur, "Deposant hors dossier");
            require(liste[i].emetteur != address(0), "Emetteur vide");
            attendus[id].push(liste[i]);
            depots[id].push(Depot(bytes32(0), 0, 0));
        }

        emit DossierOuvert(id, msg.sender, vendeur, acheteur, notaire);
    }

    // L'accord des deux parties empêche le courtier de choisir seul l'acheteur (D12)
    function approuver(uint256 id) external dansEtat(id, Etat.EnAttenteAccord) {
        Dossier storage d = dossiers[id];
        if (msg.sender == d.vendeur) d.accordVendeur = true;
        else if (msg.sender == d.acheteur) d.accordAcheteur = true;
        else revert("Pas une partie du dossier");

        emit DossierApprouve(id, msg.sender);
        if (d.accordVendeur && d.accordAcheteur) {
            d.etat = Etat.Actif;
            emit DossierActif(id);
        }
    }

    // Le dossier vérifie ce qui le concerne, ProofAnchor vérifie le document lui-même
    function deposer(
        uint256 id,
        uint256 numero,
        ProofAnchor.Document calldata doc,
        bytes32[] calldata preuve,
        bytes calldata signature,
        uint256 numeroLot
    ) external dansEtat(id, Etat.Actif) {
        require(numero < attendus[id].length, "Document non attendu");
        DocumentAttendu memory a = attendus[id][numero];
        Depot storage depot = depots[id][numero];

        require(msg.sender == a.deposant, "Mauvais deposant");
        require(depot.dateDepot == 0, "Deja depose");
        require(doc.typeDocument == a.typeDocument, "Mauvais type");
        require(doc.immeuble == dossiers[id].immeuble, "Mauvais immeuble");
        require(doc.emetteur == a.emetteur, "Mauvais emetteur");

        // Appel entre contrats (B06, diapo 8). Date du dépôt : celle du bloc
        uint64 maintenant = uint64(block.timestamp);
        require(ancre.wasValidAt(numeroLot, doc, preuve, signature, maintenant), "Document non valide");

        depot.empreinte = doc.empreinte;
        depot.dateDepot = maintenant;
        depot.dateExpiration = doc.dateExpiration;

        // Un dépôt en retard est accepté, mais le dossier sera non conforme (D5)
        emit DocumentDepose(id, numero, doc.empreinte, maintenant < a.dateLimite);
    }

    // Le notaire choisit le moment, le contrat décide du résultat
    function fermer(uint256 id) external dansEtat(id, Etat.Actif) {
        Dossier storage d = dossiers[id];
        require(msg.sender == d.notaire, "Seul le notaire ferme");

        d.etat = estConforme(id) ? Etat.Ferme : Etat.FermeNonConforme;
        emit DossierFerme(id, d.etat);
    }

    // Conforme : chaque document déposé avant sa date limite et pas expiré aujourd'hui.
    // Une annulation après le dépôt n'est pas vue ici : le notaire revérifie avant de fermer.
    function estConforme(uint256 id) public view returns (bool) {
        for (uint256 i = 0; i < attendus[id].length; i++) {
            Depot memory p = depots[id][i];
            if (p.dateDepot == 0) return false;
            if (p.dateDepot >= attendus[id][i].dateLimite) return false;
            if (p.dateExpiration != 0 && block.timestamp >= p.dateExpiration) return false;
        }
        return true;
    }

    function documentsAttendus(uint256 id) external view returns (DocumentAttendu[] memory) {
        return attendus[id];
    }

    function depotsDe(uint256 id) external view returns (Depot[] memory) {
        return depots[id];
    }
}
