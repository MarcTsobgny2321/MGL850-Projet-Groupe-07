# 0005. Retrait de la fausse plateforme

Statut : Accepté
Date : 2026-11-24
Complète : 0003

## Contexte

L'ADR 0003 prévoyait deux implémentations de l'interface `Plateforme` : la vraie (`PlateformeChaine`) et une fausse, avec des données fixes (`PlateformeFactice`). La fausse a servi à valider l'apparence des écrans avant le branchement de la chaîne. Une fois la chaîne branchée, elle n'était plus utilisée que pour une démo sans chaîne.

## Options

| Option | Gain | Prix |
| --- | --- | --- |
| Garder la fausse plateforme | Démo possible sans chaîne | 175 lignes de plus à relire et à maintenir. Elle simule les règles des contrats et peut diverger d'eux |
| La retirer | Une seule implémentation, qui passe toujours par les vrais contrats | Plus de démo sans chaîne |

## Décision

Retrait de `PlateformeFactice` et du mode `?factice`. L'interface `Plateforme` reste : elle découple toujours les pages d'ethers.

## Conséquences

- Plan B si le navigateur fait défaut le jour de la démo : les commandes en console (`npm run verifier`, `npm run dossier`).
- La fausse plateforme reste dans l'historique git si on en a besoin un jour.
