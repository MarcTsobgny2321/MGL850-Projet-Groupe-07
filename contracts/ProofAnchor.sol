// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// Registre des lots d'ancrage : chaque lot est une racine de Merkle scellée à une date.
contract ProofAnchor is AccessControl {
    // Rôle du service de scellement. L'administrateur a le rôle DEFAULT_ADMIN_ROLE.
    bytes32 public constant SCELLEUR = keccak256("SCELLEUR");

    struct Lot {
        bytes32 racine;
        uint64 dateScellement; // block.timestamp au moment du scellement
    }

    // Numéro du lot -> lot. Le premier lot porte le numéro 1.
    mapping(uint256 => Lot) public lots;
    uint256 public dernierLot;

    struct Emetteur {
        uint64 ajoute; // 0 : jamais ajouté
        uint64 retire; // 0 : encore actif
    }

    mapping(address => Emetteur) public emetteurs;

    // Les 7 champs d'une feuille. Une seule struct pour que la preuve et la
    // signature soient toujours vérifiées avec les mêmes valeurs.
    struct Document {
        bytes32 empreinte;
        address emetteur;
        uint8 typeDocument; // D14 : 1 inspection, 2 attestation du syndicat
        bytes32 immeuble; // D14 : keccak256(cadastre, selImmeuble), cache l'adresse
        uint8 statut;
        uint64 dateStatut;
        uint64 dateExpiration; // 0 : pas d'expiration
    }

    uint8 public constant VALIDE = 1; // même valeur que Statut.VALIDE dans scripts/lots.ts

    event LotScelle(uint256 indexed numeroLot, bytes32 racine, uint64 dateScellement);
    event EmetteurAjoute(address indexed emetteur, uint64 date);
    event EmetteurRetire(address indexed emetteur, uint64 date);

    constructor(address admin, address scelleur) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SCELLEUR, scelleur);
    }

    // La date vient de la chaîne, pas d'un paramètre : le scelleur ne peut pas antidater.
    function anchor(bytes32 racine) external onlyRole(SCELLEUR) returns (uint256 numeroLot) {
        require(racine != bytes32(0), "Racine vide");

        numeroLot = ++dernierLot;
        uint64 maintenant = uint64(block.timestamp);
        lots[numeroLot] = Lot(racine, maintenant);

        emit LotScelle(numeroLot, racine, maintenant);
    }

    // Une adresse ne sert qu'une fois : après un retrait, l'émetteur utilise une nouvelle clé.
    function ajouterEmetteur(address emetteur) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(emetteur != address(0), "Adresse vide");
        require(emetteurs[emetteur].ajoute == 0, "Deja ajoute");

        uint64 maintenant = uint64(block.timestamp);
        emetteurs[emetteur].ajoute = maintenant;
        emit EmetteurAjoute(emetteur, maintenant);
    }

    function retirerEmetteur(address emetteur) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Emetteur storage e = emetteurs[emetteur];
        require(e.ajoute != 0, "Emetteur inconnu");
        require(e.retire == 0, "Deja retire");

        uint64 maintenant = uint64(block.timestamp);
        e.retire = maintenant;
        emit EmetteurRetire(emetteur, maintenant);
    }

    // Reconnu à une date : ajouté avant (ou à) cette date, et pas encore retiré à cette date.
    function estReconnuA(address emetteur, uint64 date) public view returns (bool) {
        Emetteur memory e = emetteurs[emetteur];
        if (e.ajoute == 0 || date < e.ajoute) return false;
        return e.retire == 0 || date < e.retire;
    }

    // Ce que l'émetteur signe (D7) : tous les champs sauf l'émetteur.
    // Même calcul que messageASigner dans scripts/signature.ts.
    function messageASigner(Document memory doc) public pure returns (bytes32) {
        return keccak256(abi.encode(
            doc.empreinte, doc.typeDocument, doc.immeuble, doc.statut, doc.dateStatut, doc.dateExpiration
        ));
    }

    // Vrai si la signature a été produite par doc.emetteur pour ces valeurs précises.
    function signatureValide(Document memory doc, bytes memory signature)
        public pure returns (bool)
    {
        // Ajoute le préfixe EIP-191, comme signMessage côté TypeScript
        bytes32 hashSigne = MessageHashUtils.toEthSignedMessageHash(messageASigner(doc));
        // tryRecover ne fait pas échouer l'appel si la signature est mal formée
        (address signataire, ECDSA.RecoverError erreur, ) = ECDSA.tryRecover(hashSigne, signature);
        return erreur == ECDSA.RecoverError.NoError && signataire == doc.emetteur;
    }

    // D3 et D9 : scellé avant (ou à) la date, et lot suivant scellé après la date.
    function lotEnVigueur(uint256 numeroLot, uint64 date) public view returns (bool) {
        if (numeroLot == 0 || numeroLot > dernierLot) return false;
        if (date < lots[numeroLot].dateScellement) return false;
        if (numeroLot == dernierLot) return true;
        return date < lots[numeroLot + 1].dateScellement;
    }

    // Même calcul que StandardMerkleTree d'OpenZeppelin : double hash de l'encodage ABI.
    function hashFeuille(Document calldata doc) public pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(
            doc.empreinte, doc.emetteur, doc.typeDocument, doc.immeuble,
            doc.statut, doc.dateStatut, doc.dateExpiration
        ))));
    }

    // Le document était-il valide à cette date ? Répond faux dès qu'une vérification échoue.
    // Le type et l'immeuble ne sont pas jugés ici : c'est le dossier de vente qui les compare (D14).
    function wasValidAt(
        uint256 numeroLot,
        Document calldata doc,
        bytes32[] calldata preuve,
        bytes calldata signature,
        uint64 date
    ) external view returns (bool) {
        // 1. Pas de date future : la réponse pour une date passée ne doit jamais changer
        if (date > block.timestamp) return false;

        // 2. Le lot fourni était celui en vigueur à cette date
        if (!lotEnVigueur(numeroLot, date)) return false;

        // 3. La feuille fait partie du lot
        if (!MerkleProof.verifyCalldata(preuve, lots[numeroLot].racine, hashFeuille(doc))) {
            return false;
        }

        // 4. Statut valide, et déjà en vigueur à cette date (D8)
        if (doc.statut != VALIDE || doc.dateStatut > date) return false;

        // 5. Pas encore expiré à cette date (fin exclue, comme D9)
        if (doc.dateExpiration != 0 && date >= doc.dateExpiration) return false;

        // 6. Émetteur reconnu au moment où il a émis le statut (D4, D8)
        if (!estReconnuA(doc.emetteur, doc.dateStatut)) return false;

        // 7. L'émetteur a lui-même signé ces valeurs (D7)
        return signatureValide(doc, signature);
    }
}
