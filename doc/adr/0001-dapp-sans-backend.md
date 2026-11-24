# 0001. Une DApp sans backend : les contrats tiennent lieu d'API

Statut : Accepté
Date : 2026-11-24

## Contexte

On veut une page web pour les usagers (courtier, vendeur, acheteur, notaire). Dans une application classique, le navigateur parle à une API, qui applique les règles et écrit dans une base de données. Ici, les règles et les données sont déjà dans les contrats ProofAnchor et TransactionWorkflow, sur la chaîne.

Le navigateur a quand même besoin de trois choses qui ne sont pas sur la chaîne : les pages elles-mêmes, les fichiers publics des lots (`lot-N.json`) et l'adresse des contrats (`deploiement.json`).

## Options

| Option | Gain | Prix |
| --- | --- | --- |
| A. Le navigateur parle directement à la chaîne. Un petit serveur sert les pages et les fichiers publics | Aucune logique à écrire côté serveur. Personne n'a à faire confiance à notre serveur | Le serveur est « caché » dans la configuration de Vite |
| B. Serveur Express séparé | Couche visible, facile à montrer | Un processus de plus. Laisse croire que le serveur contient de la logique |
| C. API qui appelle les contrats à la place du navigateur | Familier | Le serveur devient un intermédiaire de confiance, ce que le protocole veut éviter |

## Décision

Option A. Le navigateur utilise ethers.js comme les scripts. Le serveur de développement Vite sert les pages, relaie `/rpc` vers la chaîne locale et sert en lecture `deploiement.json` et `lots/`.

| Application classique | Notre DApp |
| --- | --- |
| API REST | Fonction de contrat appelée par une transaction |
| Base de données | État des contrats |
| Règles dans l'API | `require` dans les contrats |
| Droits vérifiés par le serveur | `msg.sender` vérifié par le contrat |

## Conséquences

- Les règles ne sont écrites qu'une fois, dans les contrats. Le web prépare les données, le contrat décide.
- Les dossiers privés (`recus/`, `registres/`, `en-attente.json`) ne sont jamais servis.
- Exception assumée : `/api/immeuble/<cadastre>` simule le logiciel privé du courtier (D14). `GET` lit sans créer, `POST` crée le sel à l'ouverture d'un dossier. Dans la réalité, ce registre serait chez le courtier, pas sur le serveur des pages. Le numéro de cadastre est limité à des chiffres pour qu'il ne puisse pas désigner un autre fichier.
- Le relais `/rpc` évite les problèmes de CORS (le navigateur reste sur la même origine).
