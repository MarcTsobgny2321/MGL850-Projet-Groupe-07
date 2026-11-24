# Protocole ouvert de preuves immobilières

Prototype du cours MGL850 (ÉTS). Les documents d'une vente (rapport d'inspection, attestation du syndicat) sont scellés sur une chaîne Ethereum locale par lots. On peut vérifier qu'un document est intact et qu'il était valide à une date donnée. Un dossier de vente n'accepte que des documents vérifiés.

## Installation

Node.js 22 ou plus récent.

```
npm install
```

## Lancer la démo

1. Terminal 1 : `npm run chaine`
2. Terminal 2 : `npm run deployer`
3. Terminal 2 : `npm run web`, puis ouvrir http://localhost:5173

Relancer la chaîne efface tout : refaire l'étape 2 ensuite.

Test manuel complet des transactions : [doc/E2E.md](doc/E2E.md).

## Émettre et sceller des documents

Dans le terminal 2, pendant que la chaîne tourne :

```
npm run emettre -- exemples/rapport_inspection.pdf inspecteur 1234567 30
npm run emettre -- exemples/attestation_syndicat.pdf syndicat 1234567
npm run sceller
```

Le reçu de chaque document est dans `donnees/recus/`. Le PDF et son reçu servent ensuite au dépôt et à la vérification dans la page web.

| Commande | Rôle |
| --- | --- |
| `npm run emettre -- --annuler <reçu.json>` | Annuler un document (pris en compte au prochain `sceller`) |
| `npm run avancer -- <jours>` | Avancer l'horloge de la chaîne (retard, expiration) |
| `npm run verifier -- <pdf> <reçu.json>` | Vérifier un document dans la console |
| `npm run dossier -- etat <n°>` | Voir un dossier dans la console |
| `npm run videos` | Enregistrer deux vidéos de démo dans `videos/` (chaîne et web lancés ; redéploie les contrats) |

## Tests

```
npm test
npm run typecheck
```

## Organisation

| Dossier | Contenu |
| --- | --- |
| `contracts/` | ProofAnchor (lots, émetteurs, `wasValidAt`) et TransactionWorkflow (dossier de vente) |
| `scripts/` | Commandes en ligne et code partagé avec le web |
| `web/` | Interface React (vérification, dossiers) |
| `test/` | Tests des contrats |
| `exemples/` | Documents fictifs, dont une copie modifiée d'un octet |
| `doc/adr/` | Décisions d'architecture |
