// Envoie une action (transaction) et suit son état : en cours, confirmée ou refusée.
// Une confirmation s'affiche en notification : elle reste visible même si l'écran se recharge.
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { RefusContrat } from "../services/Plateforme";
import { phraseRefus } from "../refus";

export type EtatTransaction = "repos" | "envoi" | "confirmee" | "refusee";

export function useTransaction() {
  const [etat, setEtat] = useState<EtatTransaction>("repos");
  const [refus, setRefus] = useState<{ titre: string; detail: string } | null>(null);

  async function envoyer<T>(action: () => Promise<T>, enSucces: (r: T) => string) {
    setEtat("envoi");
    setRefus(null);
    try {
      const r = await action();
      setEtat("confirmee");
      notifications.show({
        title: "Transaction confirmée",
        message: enSucces(r),
        color: "succes",
        icon: <IconCheck size={18} />,
        autoClose: 5000,
      });
    } catch (e) {
      // Un refus reste sous le bouton : la section ne change pas, l'explication y est utile
      setEtat("refusee");
      setRefus(
        e instanceof RefusContrat
          ? { titre: "Refusé par le contrat", detail: phraseRefus(e.message) }
          : { titre: "L'action n'a pas abouti", detail: (e as Error).message },
      );
    }
  }

  return { etat, refus, envoyer };
}
