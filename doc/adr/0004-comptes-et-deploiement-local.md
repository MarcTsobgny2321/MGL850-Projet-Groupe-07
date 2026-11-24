# 0004. Comptes de test et déploiement local

Statut : Accepté
Date : 2026-11-24

## Contexte

Chaque usager signe ses transactions avec sa clé privée. Dans la réalité, cette clé est dans un portefeuille (MetaMask). Pour une démo, il faut passer rapidement d'un rôle à l'autre (courtier, vendeur, acheteur, notaire) sur un seul poste, sans risque de panne.

## Options

| Option | Gain | Prix |
| --- | --- | --- |
| Sélecteur « Je suis » et comptes de test Hardhat | Simple et fiable. Aucune clé dans le navigateur : la chaîne signe pour ses comptes de test | Pas réaliste : personne ne partage ses clés |
| MetaMask | Réaliste | Configuration fragile (réseau local, comptes importés, erreurs de nonce après une relance de la chaîne) |

## Décision

Sélecteur de compte dans l'en-tête, mémorisé dans le navigateur. Les transactions passent par `getSigner(adresse)` du nœud Hardhat. Le contrat vérifie quand même `msg.sender` : choisir le mauvais rôle donne un refus du contrat, pas un contournement.

Déploiement sur un seul poste :

| Processus | Commande | Port |
| --- | --- | --- |
| Chaîne Hardhat (blocs en mémoire) | `npm run chaine` | 8545 |
| Serveur web Vite | `npm run web` | 5173 |
| Commandes ponctuelles | `deployer`, `emettre`, `sceller`, `avancer` | |

`donnees/` contient le public (`deploiement.json`, `lots/`) et le privé (`recus/`, `registres/`, `immeubles/`, `en-attente.json`).

## Conséquences

- Relancer la chaîne efface tout. Le web le détecte (aucun contrat à l'adresse enregistrée) et demande `npm run deployer`.
- Limite pour le rapport : comptes déverrouillés, serveur unique pour les fichiers des lots, registre de l'immeuble simulé.

Ce que serait un déploiement réel (non codé) :

| Élément | Prototype | Production |
| --- | --- | --- |
| Chaîne | Hardhat local | Sepolia ou réseau public |
| Signature | Comptes de test | Portefeuille de chaque usager |
| Pages web | Serveur Vite | Fichiers statiques (`vite build`) sur un hébergement simple ou IPFS |
| Fichiers des lots | `donnees/lots/` | Hébergement public répliqué |
| Scellement | `npm run sceller` à la main | Service planifié |
| Registre de l'immeuble | `/api/immeuble` | Logiciel privé du courtier |
