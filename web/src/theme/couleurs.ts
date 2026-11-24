// Couleurs de l'application, par rôle. C'est le seul endroit à modifier pour changer l'apparence.
// Chaque couleur est la nuance de base (6) ; les 10 nuances sont générées par palette.ts.
export const COULEURS = {
  primaire: "#2f6690", // actions principales, navigation, liens
  secondaire: "#d08c3b", // mises en valeur, chiffres, éléments en attente
  succes: "#2e9e6b", // document valide, dossier fermé conforme
  erreur: "#d14b4b", // document non valide, refus d'un contrat
  avertissement: "#e3a72f", // retard, expiration proche
  neutre: "#64748b", // textes secondaires, bordures
} as const;

export type RoleCouleur = keyof typeof COULEURS;
