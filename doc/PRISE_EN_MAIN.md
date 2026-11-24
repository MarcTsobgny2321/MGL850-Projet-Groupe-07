# Prise en main du prototype par domaine

Le prototype fonctionne de bout en bout. Chacun reprend maintenant son domaine (voir REPARTITION.md) pour le comprendre, l'améliorer et le défendre à la présentation.

## 1. Pour tout le monde, dans l'ordre

1. `git pull`, `npm install`, puis lire le `README.md`.
2. Faire le test manuel [E2E.md](E2E.md) une fois en entier (15 min). C'est la meilleure façon de voir comment les trois domaines s'emboîtent.
3. Lire ses fichiers (tableau ci-dessous) et leurs tests. Lancer `npm test`.
4. Expliquer sa partie aux deux autres en 5 minutes. Si on bloque sur une explication, c'est là qu'il faut creuser avant la présentation.

## 2. Qui est responsable de quoi

| Domaine | Fichiers |
| --- | --- |
| **A. Registres (Cedric)** | `contracts/ProofAnchor.sol`, `test/ProofAnchor.test.ts`, `test/WasValidAt.test.ts`, `scripts/deployer.ts`, `scripts/roles.ts`, `scripts/comptes.ts` |
| **B. Preuves (Alex)** | `scripts/hachage.ts`, `empreinte.ts`, `lots.ts`, `signature.ts`, `formats.ts`, `preuve.ts`, `emettre.ts`, `sceller.ts`, `verifier.ts`, `web/src/pages/Verification.tsx` |
| **C. Dossier de vente (Marc)** | `contracts/TransactionWorkflow.sol`, `test/TransactionWorkflow.test.ts`, `scripts/dossier.ts`, `scripts/workflow.ts`, `web/src/pages/Dossiers.tsx`, `DossierDetail.tsx` |
| Commun | `web/src/services/`, `hooks/`, `components/`, `theme/`, `vite.config.ts` |

## 3. Améliorations proposées

Par ordre de priorité. Rester dans le périmètre du prototype : une amélioration qui sert la démo ou le rapport vaut mieux qu'une nouvelle fonction.

### Cedric : registres

1. **Commande pour le registre des émetteurs** (`scripts/emetteur.ts`, `npm run emetteur -- ajouter|retirer <rôle>`). Aujourd'hui, les émetteurs ne sont ajoutés qu'au déploiement. Avec cette commande, on peut montrer en direct D4 : retirer l'inspecteur n'invalide pas ses rapports déjà émis.
2. **Mesures de gaz** pour le rapport : `anchor`, `ajouterEmetteur`, `wasValidAt` appelé par le dossier. Hardhat peut les afficher (`REPORT_GAS=true npm test`, outil inclus dans hardhat-toolbox).
3. **Relire les cas limites** de `estReconnuA` et `lotEnVigueur` (D9 : début inclus, fin exclue) et ajouter un test s'il en manque.
4. **Rapport** : administrateur unique (piste : vote multisig des organismes), une seule chaîne (piste : double écriture des racines).

### Alex : preuves

1. **Tests des scripts hors chaîne.** Ils n'en ont pas : `construireLot` et `verifier` (`lots.ts`), `empreinteOctets` (`hachage.ts`), et surtout les refus de `sceller.ts` (signature invalide, émetteur non reconnu, date antérieure au dernier lot, document déjà annulé, D8 et D13).
2. **Mesures de charge** pour le rapport : temps de construction d'un lot et taille de `lot-N.json`, de 10 à 10⁶ documents. Ces chiffres manquent pour la limite « taille des fichiers de lots » (SIMPLIFICATION.md, section 6).
3. **Page de vérification** : la reprendre en main, l'améliorer si besoin (par exemple, proposer la date du lot en vigueur).
4. **Rapport** : sel et empreinte, arbre de Merkle, reçu inspiré de W3C VC, et la piste « ne plus recopier les documents annulés ou expirés dans les lots suivants ».

### Marc : dossier de vente

1. **Validation métier** auprès d'un notaire ou d'un courtier : délais, clôture non conforme (D5).
2. **Décision en suspens** : le retard est jugé sur la date du dépôt. Un scellement lent pénalise la partie. Trancher ou documenter comme limite.
3. **Annulation après le dépôt** : non vue à la clôture. Garder la revérification par le notaire ou exiger une nouvelle preuve à la fermeture.
4. **Rapport** : machine à états du dossier, appel entre contrats, ce qui a été retiré (conditions, rappels).

## 4. Règles de travail

- **Une branche par personne et par sujet** (`cedric/emetteur`, `alex/tests-lots`), puis une demande de fusion (pull request) sur `main`.
- **Revue croisée** avant de fusionner : Cedric relit Marc, Marc relit Alex, Alex relit Cedric.
- **Jamais de fusion si `npm test` ou `npm run typecheck` échoue.** Refaire le test E2E si on touche au flow.
- **Les formats partagés ne changent qu'avec l'accord des trois** : format de la feuille (7 champs, D14), ce que l'émetteur signe (`messageASigner`), la signature de `wasValidAt`, le format du reçu. Un changement d'un côté casse les deux autres domaines.
- Toute nouvelle décision importante : une ligne dans SIMPLIFICATION.md (protocole) ou un ADR dans `doc/adr/` (web).
- Commits courts, en français.
