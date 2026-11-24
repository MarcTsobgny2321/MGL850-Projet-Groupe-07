// Mise en forme pour l'affichage (sans React)

// « 24 novembre 2026 à 10 h 00 » : les dates de la chaîne sont en secondes
export function dateLisible(secondes: number): string {
  return new Date(secondes * 1000).toLocaleString("fr-CA", { dateStyle: "long", timeStyle: "short" });
}

// « 0x3C44…93BC » : hash, adresse ou signature abrégés
export function abreger(valeur: string): string {
  return `${valeur.slice(0, 6)}…${valeur.slice(-4)}`;
}
