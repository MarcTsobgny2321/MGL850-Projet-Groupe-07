# Plateforme web

Interface des usagers du prototype : vérifier un document, suivre un dossier de vente. Les décisions sont expliquées dans [adr/](adr/README.md). Pour lancer la démo, voir le README à la racine.

## Vue d'ensemble

Le navigateur parle directement à la chaîne, comme les scripts. Il n'y a pas d'API : les contrats appliquent les règles (ADR 0001).

```
Navigateur (web/)                    Serveur Vite (5173)                      Chaîne Hardhat (8545)
┌──────────────────────────┐         ┌───────────────────────────────┐        ┌─────────────────────┐
│ Pages et composants      │         │ relais /rpc ──────────────────┼──────► │ ProofAnchor         │
│        │                 │ ──────► │ /donnees/deploiement.json     │        │ TransactionWorkflow │
│ interface Plateforme     │         │ /donnees/lots/lot-N.json      │        └─────────────────────┘
│        │                 │         │ /api/immeuble/<cadastre>      │
│ PlateformeChaine (ethers)│         └───────────────────────────────┘
└──────────────────────────┘            ▲ fichiers écrits par les scripts
Ligne de commande : deployer, emettre, sceller, avancer
```

## Les écrans

| Écran | Qui | Ce qu'il fait |
| --- | --- | --- |
| Accueil | Tous | Adresses des contrats, nombre de lots et de dossiers, heure de la chaîne |
| Vérification | Tous, sans compte | PDF et reçu, date facultative, cadastre facultatif. Empreinte calculée dans le navigateur, puis `wasValidAt`. Chaque étape est affichée, celle qui échoue en rouge |
| Dossiers | Tous ; ouverture par le courtier | Liste des dossiers avec leur état, formulaire d'ouverture |
| Détail d'un dossier | Selon le compte | Progression, parties et accords, conformité si on fermait maintenant, documents attendus, actions du compte choisi |

Actions proposées selon le compte et l'état du dossier :

| État | Vendeur, acheteur | Notaire | Courtier |
| --- | --- | --- | --- |
| En attente d'accord | Approuver | | |
| Actif | Déposer ses documents (PDF + reçu) | Fermer (le contrat décide du résultat) | |
| Fermé | | | |

Le compte est choisi dans l'en-tête (« Je suis »). Le contrat vérifie quand même `msg.sender` : un mauvais choix donne un refus, pas un contournement.

## Organisation du code

```
web/
  vite.config.ts        serveur : relais /rpc, fichiers publics, registre des immeubles
  src/
    main.tsx            choix de la plateforme (vraie chaîne, ou ?factice)
    App.tsx             en-tête et page courante (sans routeur)
    services/           frontière avec la chaîne, seul endroit qui importe ethers
      Plateforme.ts     interface et types du domaine
      PlateformeChaine.ts
      PlateformeFactice.ts
    hooks/              logique React réutilisable
    components/         composants d'affichage réutilisables
    pages/              Accueil, Verification, Dossiers, DossierDetail
    theme/              couleurs par rôle et génération des nuances
    format.ts, refus.ts dates lisibles, phrases pour les refus des contrats
```

Règles :

- Aucun fichier hors de `services/` n'importe ethers ni TypeChain.
- Les composants ne connaissent ni la plateforme ni les contrats : ils reçoivent des données et des fonctions.
- Les couleurs sont nommées par rôle, jamais en dur.

## Interface Plateforme

```ts
interface Plateforme {
  infos(): Promise<Infos>;
  comptes(): Promise<Compte[]>;
  verifier(pdf: Uint8Array, recu: Recu, date?: number, cadastre?: string): Promise<Verification>;
  listerDossiers(): Promise<Dossier[]>;
  lireDossier(id: number): Promise<Dossier>;
  pour(compte: Compte): ActionsDossier; // actions signées par ce compte
}

interface ActionsDossier {
  ouvrir(cadastre: string, jours: number): Promise<number>;
  approuver(id: number): Promise<void>;
  deposer(id: number, pdf: Uint8Array, recu: Recu): Promise<void>;
  fermer(id: number): Promise<EtatDossier>;
}
```

Un refus de contrat devient une erreur `RefusContrat` avec le message du `require`. `refus.ts` le traduit en phrase pour l'usager.

Code partagé avec les scripts (dans `scripts/`, sans accès aux fichiers) : `hachage.ts`, `formats.ts`, `lots.ts`, `signature.ts`, `preuve.ts`, `roles.ts`, `workflow.ts`.

## Composants et hooks réutilisables

| Nom | Rôle |
| --- | --- |
| `ValeurCopiable` | Empreinte, adresse ou signature en police à chasse fixe, icône de copie au survol. Option `court` pour l'abréger ; la copie est toujours complète |
| `Adresse` | Rôle et adresse abrégée |
| `BoutonTransaction` | Envoie une action et affiche le résultat : en cours, confirmé, ou refusé avec la raison |
| `Resultat` | Pastille d'icône et phrase (succès ou erreur) |
| `BadgeEtat` | État d'un dossier en couleur |
| `TableDocuments` | Documents attendus et leur situation (à temps, en retard, expiré, pas déposé) |
| `ChoixFichiers` | PDF et reçu, lus dans le navigateur |
| `useLecture` | Lit une donnée et la relit toutes les 3 secondes (actions faites dans un autre onglet) |
| `useTransaction` | État d'une transaction et traduction des refus |
| `useCompte`, `usePlateforme` | Compte choisi, plateforme utilisée |

## Thème

Les couleurs sont dans `web/src/theme/couleurs.ts`, une par rôle. C'est le seul fichier à modifier pour changer l'apparence.

| Rôle | Usage |
| --- | --- |
| primaire | En-tête, boutons, page active |
| secondaire | Chiffres, éléments en attente |
| succès | Document valide, étape réussie, dossier conforme |
| erreur | Document non valide, refus d'un contrat |
| avertissement | Retard |
| neutre | Textes secondaires |

## Scénario de démo

1. `npm run chaine`, `npm run deployer`, `npm run web`.
2. Courtier : ouvrir un dossier pour le cadastre 1234567. Vendeur puis acheteur : approuver.
3. Console : émettre le rapport (inspecteur) et l'attestation (syndicat) pour le même cadastre, puis `npm run sceller`.
4. Acheteur : déposer le PDF modifié (refusé), puis le vrai rapport. Vendeur : l'attestation. Notaire : fermer, résultat « Fermé ».
5. Vérification avec le cadastre : valide, immeuble confirmé.
6. Console : `npm run emettre -- --annuler donnees/recus/rapport_inspection.json`, `npm run sceller`, `npm run avancer -- 1`. Vérification : non valide aujourd'hui, mais valide à une date antérieure à l'annulation.

Sans chaîne : http://localhost:5173/?factice (données fixes, empreinte vraiment calculée).

## Limites

- Comptes de test déverrouillés à la place d'un portefeuille (ADR 0004).
- Fichiers des lots servis par un seul serveur : s'il tombe, plus aucune preuve ne peut être calculée.
- Registre de l'immeuble simulé sur le serveur des pages.
- Le contrat du dossier vérifie un document au dépôt seulement : une annulation après le dépôt n'est pas vue à la fermeture. Le notaire revérifie avant de fermer.
