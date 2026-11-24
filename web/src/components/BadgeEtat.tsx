// État d'un dossier, avec la couleur de son rôle
import { Badge } from "@mantine/core";
import { EtatDossier } from "../services/Plateforme";
import { RoleCouleur } from "../theme/couleurs";

const APPARENCE: Record<EtatDossier, { libelle: string; couleur: RoleCouleur }> = {
  EnAttenteAccord: { libelle: "En attente d'accord", couleur: "secondaire" },
  Actif: { libelle: "Actif", couleur: "primaire" },
  Ferme: { libelle: "Fermé", couleur: "succes" },
  FermeNonConforme: { libelle: "Fermé non conforme", couleur: "erreur" },
};

export function BadgeEtat({ etat }: { etat: EtatDossier }) {
  const { libelle, couleur } = APPARENCE[etat];
  return (
    <Badge color={couleur} variant="light" radius="sm" tt="none" fw={600}>
      {libelle}
    </Badge>
  );
}
