// Registre privé du courtier (D14) : cadastre, sel et empreinte de chaque immeuble.
// N'utilise que fs : le serveur Vite peut l'importer sans ouvrir de connexion à la chaîne.
import fs from "fs";
import path from "path";
import { Immeuble } from "./formats";
import { empreinteImmeuble, nouveauSel } from "./hachage";

export function fichierImmeuble(dossier: string, cadastre: string) {
  // Le cadastre devient un nom de fichier : on n'accepte que des chiffres
  if (!/^\d{1,12}$/.test(cadastre)) throw new Error("Numéro de cadastre invalide");
  return path.join(dossier, `${cadastre}.json`);
}

// Lecture seule : ne crée jamais de sel (vérification par le notaire)
export function lireImmeuble(dossier: string, cadastre: string): Immeuble | null {
  const fichier = fichierImmeuble(dossier, cadastre);
  return fs.existsSync(fichier) ? JSON.parse(fs.readFileSync(fichier, "utf8")) : null;
}

// Création au premier usage (ouverture d'un dossier, émission), puis toujours relu
export function immeubleOuCreer(dossier: string, cadastre: string): Immeuble {
  const existant = lireImmeuble(dossier, cadastre);
  if (existant) return existant;
  const sel = nouveauSel();
  const nouveau = { cadastre, sel, immeuble: empreinteImmeuble(cadastre, sel) };
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(fichierImmeuble(dossier, cadastre), JSON.stringify(nouveau, null, 2));
  return nouveau;
}
