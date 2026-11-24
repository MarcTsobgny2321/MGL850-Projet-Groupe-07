// Bouton qui envoie une action sur la chaîne.
// Succès : notification (useTransaction). Refus : raison affichée sous le bouton.
import { Button, ButtonProps, Stack } from "@mantine/core";
import { useTransaction } from "../hooks/useTransaction";
import { Resultat } from "./Resultat";

interface Props<T> extends Omit<ButtonProps, "onClick"> {
  libelle: string;
  action: () => Promise<T>;
  enSucces: (r: T) => string;
  apres?: () => void; // ex. recharger le dossier
}

export function BoutonTransaction<T>({ libelle, action, enSucces, apres, ...bouton }: Props<T>) {
  const { etat, refus, envoyer } = useTransaction();

  async function cliquer() {
    await envoyer(action, enSucces);
    apres?.();
  }

  return (
    <Stack gap="sm" align="flex-start">
      <Button {...bouton} loading={etat === "envoi"} onClick={cliquer}>
        {libelle}
      </Button>
      {refus && <Resultat ok={false} titre={refus.titre} detail={refus.detail} />}
    </Stack>
  );
}
