// Traduit le message d'un require du contrat en phrase pour l'usager
const PHRASES: Record<string, string> = {
  "Mauvais etat du dossier": "Cette action n'est pas possible à cette étape du dossier.",
  "Pas une partie du dossier": "Seuls le vendeur et l'acheteur peuvent approuver ce dossier.",
  "Mauvais deposant": "Ce document doit être déposé par l'autre partie.",
  "Deja depose": "Ce document a déjà été déposé.",
  "Mauvais type": "Ce dossier n'attend pas ce type de document à cet endroit.",
  "Mauvais immeuble": "Ce document est valide, mais il concerne un autre immeuble.",
  "Mauvais emetteur": "Ce document n'a pas été émis par l'émetteur prévu au dossier.",
  "Document non valide": "La chaîne n'a pas reconnu ce document comme valide aujourd'hui (modifié, annulé, expiré ou pas encore scellé).",
  "Seul le notaire ferme": "Seul le notaire peut fermer le dossier.",
  "Document non attendu": "Ce dossier n'attend pas ce document.",
};

export function phraseRefus(message: string): string {
  return PHRASES[message] ?? message;
}
