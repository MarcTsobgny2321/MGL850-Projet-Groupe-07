// Lit une donnée de la plateforme, puis la relit à intervalle régulier :
// une action faite dans un autre onglet (autre compte) apparaît seule.
import { useCallback, useEffect, useState } from "react";

export function useLecture<T>(lire: () => Promise<T>, intervalleMs = 3000) {
  const [donnees, setDonnees] = useState<T | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    try {
      setDonnees(await lire());
      setErreur(null);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [lire]);

  useEffect(() => {
    recharger();
    const minuterie = setInterval(recharger, intervalleMs);
    return () => clearInterval(minuterie);
  }, [recharger, intervalleMs]);

  return { donnees, erreur, recharger };
}
