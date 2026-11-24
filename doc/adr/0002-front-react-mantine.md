# 0002. Front en React, Vite et Mantine

Statut : Accepté
Date : 2026-11-24

## Contexte

Deux écrans à construire seul, en peu de temps : la vérification d'un document et le dossier de vente. L'écran du dossier change selon le compte choisi et l'état du dossier. L'interface doit être sobre et lisible, sans l'allure d'un modèle tout fait.

## Options

| Option | Gain | Prix |
| --- | --- | --- |
| HTML et TypeScript sans bibliothèque | Rien à installer | Mises à jour de l'écran à la main, vite lourd pour le dossier |
| React + Pico.css (essayé) | Léger, HTML natif | Rendu jugé trop générique. Il aurait fallu écrire notre propre CSS |
| React + MUI | Connu de l'équipe | Style Material très reconnaissable, plus difficile à épurer |
| React + shadcn/ui | À la mode | Demande Tailwind. Style très associé aux applications générées |
| React + Mantine | Composants prêts (fichiers, tableau, badge, Stepper, Timeline), rendu sobre par défaut | Une API à apprendre, proche de MUI |

## Décision

React avec Vite et Mantine. Police du système (aucun fichier de police à charger). Icônes Tabler, recommandées avec Mantine.

Les couleurs sont définies par rôle dans `web/src/theme/couleurs.ts` : primaire, secondaire, succès, erreur, avertissement, neutre. Les 10 nuances de chaque couleur sont générées par `palette.ts`. Les composants nomment un rôle, jamais une couleur précise.

Les maquettes ne sont pas des pages HTML jetables : ce sont les vraies pages React, alimentées par une fausse plateforme (voir 0003).

## Conséquences

- Changer l'apparence se fait dans un seul fichier.
- Les composants réutilisables sont dans `web/src/components/` (valeur copiable, bouton de transaction, badge d'état, tableau des documents, choix de fichiers).
- Les empreintes, adresses et signatures sont affichées en police à chasse fixe, avec une icône de copie au survol.
- Dépendance de plus : Mantine 9 et React 19. Une mise à jour majeure de Mantine pourrait demander des ajustements.
