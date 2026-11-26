# Plateforme web

Interface des usagers : vérifier un document, suivre un dossier de vente. Le navigateur parle directement aux contrats, sans API (ADR 0001). Les décisions sont dans [adr/](adr/README.md), le test manuel dans [E2E.md](E2E.md).

## Écrans

| Écran | Qui | Ce qu'il fait |
| --- | --- | --- |
| Accueil | Tous | Adresses des contrats, nombre de lots et de dossiers, heure de la chaîne |
| Vérification | Tous, sans compte | PDF et reçu, date et cadastre facultatifs. Empreinte calculée dans le navigateur, puis `wasValidAt`. L'étape qui échoue est en rouge |
| Dossiers | Tous ; ouverture par le courtier | Liste des dossiers et formulaire d'ouverture |
| Détail d'un dossier | Selon le compte | Progression, accords, conformité, documents attendus, actions du compte choisi |

| État du dossier | Vendeur, acheteur | Notaire |
| --- | --- | --- |
| En attente d'accord | Approuver | |
| Actif | Déposer ses documents (PDF + reçu) | Fermer (le contrat décide du résultat) |

Le compte se choisit dans l'en-tête (« Je suis »). Le contrat vérifie quand même `msg.sender` : un mauvais choix donne un refus, pas un contournement.

## Organisation du code

```
web/
  vite.config.ts        relais /rpc, fichiers publics des lots, registre des immeubles
  src/
    main.tsx            choix de l'implémentation de Plateforme
    services/           Plateforme.ts (interface), PlateformeChaine.ts (ethers)
    hooks/              useLecture, useTransaction, useCompte, usePlateforme
    components/         composants d'affichage réutilisables
    pages/              Accueil, Verification, Dossiers, DossierDetail, Chaine
    theme/              couleurs par rôle (couleurs.ts) et nuances
    format.ts, refus.ts dates lisibles, phrases pour les refus des contrats
```

Règles :

- Aucun fichier hors de `services/` n'importe ethers (ADR 0003).
- Les composants reçoivent des données et des fonctions ; ils ne connaissent pas les contrats.
- Les couleurs sont nommées par rôle (`primaire`, `succes`, `erreur`...), jamais en dur. Les changer se fait dans `theme/couleurs.ts`.

Code partagé avec les scripts, dans `scripts/` : `hachage.ts`, `formats.ts`, `lots.ts`, `preuve.ts`, `roles.ts`, `workflow.ts`.

## Composants réutilisables

| Composant | Rôle |
| --- | --- |
| `ValeurCopiable` | Empreinte, adresse ou signature, icône de copie au survol (option `court` pour abréger) |
| `BoutonTransaction` | Envoie une action. Succès : notification en bas à droite (elle survit au rechargement de l'écran). Refus : raison affichée sous le bouton |
| `Resultat`, `BadgeEtat` | Phrase de succès ou d'erreur, état d'un dossier |
| `TableDocuments` | Documents attendus et leur situation |
| `ChoixFichiers` | PDF et reçu, lus dans le navigateur |

## Limites

- Comptes de test à la place d'un portefeuille (ADR 0004).
- Fichiers des lots servis par un seul serveur.
- Registre de l'immeuble simulé sur le serveur des pages (ADR 0001).
- Le dossier vérifie un document au dépôt seulement : le notaire revérifie avant de fermer.
