# 0003. Une interface entre le front et la chaîne

Statut : Accepté
Date : 2026-11-24

## Contexte

Les pages React pourraient appeler ethers directement. Elles recevraient alors des `bigint`, des structs de contrat et des erreurs ethers, et chaque page devrait savoir comment parler à la chaîne. On voulait aussi valider l'apparence des écrans avant que la chaîne soit branchée, et garder la porte ouverte à MetaMask ou à un réseau de test.

Les scripts en ligne de commande contiennent déjà la logique utile (recherche du lot en vigueur, preuve, recherche du document attendu). Il ne fallait pas la réécrire.

## Options

| Option | Gain | Prix |
| --- | --- | --- |
| Pages qui appellent ethers directement | Moins de code | Pages couplées à ethers. Impossible de tester l'interface sans chaîne |
| Interface `Plateforme` avec une implémentation par environnement (patron « ports et adaptateurs ») | Pages indépendantes de la chaîne. Types simples. Erreurs traduites une seule fois | Environ 150 lignes de conversion |

## Décision

Interface `Plateforme` dans `web/src/services/Plateforme.ts`. Elle ne contient que des types simples : `Dossier`, `Compte`, `Verification`, `EtatDossier`. Deux implémentations :

- `PlateformeChaine` : la vraie, avec ethers et TypeChain. C'est le seul fichier du web qui importe ethers.
- `PlateformeFactice` : données fixes en mémoire, pour les maquettes et une démo sans chaîne (`?factice` dans l'adresse).

Le refus d'un contrat devient une erreur `RefusContrat` avec le message du `require`, traduit ensuite en phrase pour l'usager (`web/src/refus.ts`).

Le code commun aux scripts et au web est dans `scripts/`, sans accès aux fichiers : `hachage.ts`, `formats.ts`, `lots.ts`, `signature.ts`, `preuve.ts` (qui reçoit une fonction `lireLot`), `roles.ts`, `workflow.ts`. Ce qui lit ou écrit des fichiers reste côté Node (`stockage.ts`, `immeubles.ts`).

## Conséquences

- Les pages n'ont pas changé quand la vraie chaîne a été branchée.
- Passer à MetaMask ou à Sepolia ne toucherait que `PlateformeChaine`.
- Une règle à respecter : aucun fichier hors de `services/` n'importe ethers.
- Piège rencontré : une implémentation doit toujours renvoyer des objets neufs. React ne réaffiche pas un objet modifié sur place.
