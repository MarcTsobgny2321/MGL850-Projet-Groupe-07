# Décisions d'architecture (ADR)

Un ADR décrit une décision d'architecture : le contexte, les options comparées, le choix et ses conséquences. Un ADR accepté n'est plus modifié. Si la décision change, un nouvel ADR le remplace et l'ancien passe au statut « Remplacé ».

Les décisions sur le protocole lui-même (D1 à D14 : sel, lot en vigueur, signature de l'émetteur, immeuble dans la feuille, etc.) sont dans SIMPLIFICATION.md, section 5. Les ADR ci-dessous portent sur la plateforme web.

| N° | Décision | Statut |
| --- | --- | --- |
| [0001](0001-dapp-sans-backend.md) | Une DApp sans backend : les contrats tiennent lieu d'API | Accepté |
| [0002](0002-front-react-mantine.md) | Front en React, Vite et Mantine | Accepté |
| [0003](0003-interface-plateforme.md) | Une interface entre le front et la chaîne | Accepté |
| [0004](0004-comptes-et-deploiement-local.md) | Comptes de test et déploiement local | Accepté |

## Gabarit

```
# NNNN. Titre

Statut : Proposé | Accepté | Remplacé par NNNN
Date : AAAA-MM-JJ

## Contexte
Le problème et les contraintes.

## Options
| Option | Gain | Prix |

## Décision
Le choix, en une ou deux phrases.

## Conséquences
Ce qu'on gagne, ce qu'on perd, les risques.
```
