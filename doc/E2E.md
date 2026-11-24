# Test manuel de bout en bout

Parcours essentiel des transactions, dans le navigateur et la console. Cocher chaque étape si le résultat attendu apparaît. Durée : environ 15 minutes.

## Préparation

- T1 : `npm run chaine` (laisser tourner)
- T2 : `npm run deployer`, puis `npm run web` (laisser tourner)
- T3 : commandes de la console
- Navigateur : http://localhost:5173. Le compte se choisit en haut à droite (« Je suis »).

Les PDF sont dans `exemples/`, les reçus dans `donnees/recus/` (créés à l'étape 3).

## Parcours

- [ ] **1. Ouvrir.** Courtier : Dossiers, cadastre `1234567`, délai `10`, « Ouvrir le dossier ». Attendu : dossier 1, « En attente d'accord ».
- [ ] **2. Accords.** Vendeur, puis acheteur : dossier 1, « Approuver le dossier ». Attendu : « Actif » après le deuxième accord.
- [ ] **3. Émettre et sceller.** T3 :
  ```
  npm run emettre -- exemples/rapport_inspection.pdf inspecteur 1234567 30
  npm run emettre -- exemples/attestation_syndicat.pdf syndicat 1234567
  npm run sceller
  ```
  Attendu : « Lot 1 scellé : 2 document(s) ».
- [ ] **4. Déposer.** Acheteur : dossier 1, `rapport_inspection.pdf` et son reçu. Vendeur : `attestation_syndicat.pdf` et son reçu. Attendu : « Déposé à temps » pour les deux, conformité « conforme ».
- [ ] **5. Fermer.** Notaire : dossier 1, « Fermer le dossier ». Attendu : « Fermé ». T3 : `npm run dossier -- etat 1` affiche aussi « Ferme ».
- [ ] **6. Vérifier.** Vérification, `rapport_inspection.pdf` et son reçu, cadastre `1234567`. Attendu : « Valide », immeuble confirmé.

## Refus attendus

À faire pendant l'étape 4, avant les bons dépôts.

- [ ] **R1. PDF modifié.** Acheteur : `rapport_inspection_modifie.pdf` avec le reçu du rapport. Attendu : dépôt impossible, PDF absent du lot.
- [ ] **R2. Mauvais déposant.** Vendeur : le rapport et son reçu (il revient à l'acheteur). Attendu : « Refusé par le contrat », le document doit être déposé par l'autre partie.
- [ ] **R3. Autre immeuble.** Courtier : ouvrir un dossier pour le cadastre `7654321`, vendeur et acheteur l'approuvent. Acheteur : y déposer le rapport. Attendu : « Refusé par le contrat », le document concerne un autre immeuble.

## Annulation

T3 :

```
npm run avancer -- 1
npm run emettre -- --annuler donnees/recus/rapport_inspection.json
npm run sceller
```

- [ ] **A1.** Vérifier le rapport, date vide. Attendu : « Non valide », annulé par son émetteur.
- [ ] **A2.** Le vérifier avec une date le jour de l'étape 6, une heure plus tard. Attendu : « Valide ». La réponse pour une date passée ne change pas.

## Remise à zéro et problèmes courants

Pour recommencer : arrêter T1, relancer `npm run chaine`, puis `npm run deployer` (efface `donnees/`), et recharger la page.

| Message | Solution |
| --- | --- |
| « Chaîne injoignable » | Lancer T1, puis `npm run deployer` |
| « Aucun contrat à l'adresse enregistrée » | `npm run deployer`, puis recharger la page |
| Dépôt « PDF absent du lot » avec le bon PDF | `npm run sceller` n'a pas été fait, ou le PDF a été émis de nouveau (nouveau reçu) |
