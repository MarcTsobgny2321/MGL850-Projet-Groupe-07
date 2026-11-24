// Règles du dossier de vente partagées par les scripts et le web (sans dépendance)

// Même ordre que l'enum Etat de TransactionWorkflow.sol
export const ETATS = ["Aucun", "EnAttenteAccord", "Actif", "Ferme", "FermeNonConforme"] as const;

// Le n° du document attendu, d'après le type signé dans la feuille (-1 si aucun)
export function numeroAttendu(attendus: { typeDocument: bigint | number }[], typeDocument: number): number {
  return attendus.findIndex((a) => Number(a.typeDocument) === typeDocument);
}
