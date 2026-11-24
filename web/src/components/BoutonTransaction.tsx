// Bouton qui envoie une action sur la chaîne, puis affiche le résultat sous lui
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
  const { etat, message, detail, envoyer } = useTransaction();

  async function cliquer() {
    await envoyer(action, enSucces);
    apres?.();
  }

  return (
    <Stack gap="sm" align="flex-start">
      <Button {...bouton} loading={etat === "envoi"} onClick={cliquer}>
        {libelle}
      </Button>
      {message && (etat === "confirmee" || etat === "refusee") && (
        <Resultat ok={etat === "confirmee"} titre={message} detail={detail ?? undefined} />
      )}
    </Stack>
  );
}
