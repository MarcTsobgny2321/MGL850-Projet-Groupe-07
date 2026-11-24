// Rôle de chaque compte de test Hardhat (mêmes comptes à chaque lancement de la chaîne).
// Sans dépendance : utilisé par les scripts et par le web.
export const INDICES = {
  admin: 0,
  scelleur: 1,
  inspecteur: 2,
  syndicat: 3,
  fraudeur: 4,
  courtier: 5,
  vendeur: 6,
  acheteur: 7,
  notaire: 8,
} as const;

export type Role = keyof typeof INDICES;
