# Répartition des tâches

Projet MGL850 : Protocole ouvert de preuves immobilières
Domaines attribués par tirage au sort le 29 octobre 2026.

Les composants (C1 à C7) sont décrits dans [ARCHITECTURE.md](ARCHITECTURE.md). Les étapes du flow sont dans [Flow_transaction_immobiliere_blockchain.md](Flow_transaction_immobiliere_blockchain.md).

---

## 1. Qui fait quoi

| | **Domaine A : Registres publics** | **Domaine B : Preuves et vérification** | **Domaine C : Dossier de vente** |
| --- | --- | --- | --- |
| **Responsable** | **Cedric** | **Alex** | **Marc** |
| **En une phrase** | Tout ce qui est scellé sur le registre public, et sa fiabilité | Tout ce qui crée ou vérifie une empreinte | Tout ce qui suit la vente, du dossier ouvert au dossier fermé |
| **Composants** | C3 (ProofAnchor A et B, annulation immédiate), RootMirror, C7 (émetteurs autorisés), partie « envoi et reprise sur panne » de C2 | C1 (registre de l'émetteur, reçu de preuve), C2 (regroupement, preuves), C4 (site de vérification) | C6 (dossier de vente : accord des parties, dépôts, conditions, prolongation, fermeture), C6-a (surveillant des délais), C6-b (avis), C5 (passerelle partenaires) |
| **Contrats intelligents** | ProofAnchor, RootMirror, IssuerRegistry | Aucun (produit ce que les contrats vérifient) | TransactionWorkflow |
| **Interfaces web** | Écran d'administration : suivi des sceaux, vote des organismes | Écran de l'émetteur (émettre, annuler) et site de vérification public | Écran du dossier pour courtier, vendeur, acheteur et notaire |
| **Exigences** | EF2.3, EF3.1 à EF3.5, EF7.1, EF7.2 | EF1.1 à EF1.4, EF2.1, EF2.2, EF2.4, EF4.1 à EF4.4 | EF5.1, EF5.2, EF6.1 à EF6.6 |
| **Standards** | Deux registres compatibles EVM, Hyperlane ou CCIP, OpenTimestamps | W3C VC 2.0, Bitstring Status List, did:pkh | CAIP-2 et CAIP-10 (passerelle), Chainlink Automation |
| **Démonstration finale** | Panne du registre A : tout continue sur B | Un document modifié d'un octet est rejeté. Un document annulé était valide le jour de la signature | Dossier complet de bout en bout, avec rappel, retard et promesse caduque |

---

## 2. Points de contact à fixer en semaine 1

Ce sont les endroits où le travail de l'un dépend de celui de l'autre. Ils sont fixés par écrit dès la première semaine, pour que chacun avance sans attendre les autres.

| Entre | Ce qu'il faut fixer ensemble |
| --- | --- |
| Alex → Cedric | Le contenu d'un élément du groupe : empreinte, émetteur, statut, date (_format de feuille_) |
| Cedric → Marc | La question « valide à cette date ? » : ce qu'on envoie et ce qu'on reçoit (_signature de wasValidAt_) |
| Cedric → Alex | La lecture des sceaux et des annulations par le site de vérification |
| Alex → Marc | Le format du reçu de preuve que l'acheteur dépose |
| Cedric → Marc | La question « cet émetteur est-il reconnu ? » (C7) |

---

## 3. Plan en 4 phases

| Phase | Cedric (A) | Alex (B) | Marc (C) | Résultat commun |
| --- | --- | --- | --- | --- |
| **1. Contrats de base** | ProofAnchor et C7 sur 1 registre, avec tests | C1 et C2 : empreinte, groupe, preuve | C6 : ouverture, accord des parties, dépôt | Un document émis, scellé, puis déposé dans un dossier |
| **2. Parcours complet** | Annulation immédiate, envoi automatique, reprise sur panne | Reçu W3C, annulation normale, site de vérification | Conditions, prolongation, fermeture, C6-a et C6-b | Le flow complet, étapes 0 à 12, sur un registre |
| **3. Deux registres** | Registre de secours, RootMirror, puis Hyperlane ou CCIP | did:pkh, suite de tests W3C | Passerelle C5 avec CAIP-2 et CAIP-10 | Le même flow avec la panne du registre A |
| **4. Mesures et rapport** | Coût et délai réels sur 2 registres de test | Charge : groupes de 10 000 à 1 million de documents | Tests d'utilisation avec des personnes | Rapport final et démonstration |

---

## 4. Tâches partagées

- **Revue croisée** : chaque contrat ou module est relu par une autre personne avant d'être fusionné.
  - Cedric relit le travail de Marc.
  - Marc relit le travail d'Alex.
  - Alex relit le travail de Cedric.
- **Rapport** : chacun rédige la partie de son domaine. La première personne qui termine sa phase 4 rédige l'introduction et la conclusion.
- **Validation métier** : Marc valide les délais et les conditions du dossier de vente avec un notaire ou un courtier.

---

## 5. Équilibrage

Le domaine C (Marc) est un peu plus chargé : il a le plus gros contrat et 3 services autour. Si ça déborde, **C5 (passerelle partenaires) passe à Cedric** en phase 3. Ça reste cohérent, puisque C5 utilise les mêmes identifiants de registre (CAIP) que le domaine A.
