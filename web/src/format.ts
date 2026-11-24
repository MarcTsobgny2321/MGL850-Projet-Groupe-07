// Mise en forme pour l'affichage (sans React)

// « 24 novembre 2026 à 10 h 00 » : les dates de la chaîne sont en secondes
export function dateLisible(secondes: number): string {
  return new Date(secondes * 1000).toLocaleString("fr-CA", { dateStyle: "long", timeStyle: "short" });
}

// « 0x3C44…93BC »
export function adresseCourte(adresse: string): string {
  return `${adresse.slice(0, 6)}…${adresse.slice(-4)}`;
}

export function empreinteCourte(empreinte: string): string {
  return `${empreinte.slice(0, 10)}…${empreinte.slice(-6)}`;
}
