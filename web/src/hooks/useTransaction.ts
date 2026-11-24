// Envoie une action (transaction) et suit son état : en cours, confirmée ou refusée
import { useState } from "react";
import { RefusContrat } from "../services/Plateforme";
import { phraseRefus } from "../refus";

export type EtatTransaction = "repos" | "envoi" | "confirmee" | "refusee";

export function useTransaction() {
  const [etat, setEtat] = useState<EtatTransaction>("repos");
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  async function envoyer<T>(action: () => Promise<T>, enSucces: (r: T) => string) {
    setEtat("envoi");
    setMessage(null);
    setDetail(null);
    try {
      const r = await action();
      setEtat("confirmee");
      setMessage(enSucces(r));
    } catch (e) {
      setEtat("refusee");
      if (e instanceof RefusContrat) {
        setMessage("Refusé par le contrat");
        setDetail(phraseRefus(e.message));
      } else {
        setMessage("L'action n'a pas abouti");
        setDetail((e as Error).message);
      }
    }
  }

  return { etat, message, detail, envoyer };
}
