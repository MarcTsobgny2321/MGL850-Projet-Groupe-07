// Fournit l'instance de Plateforme aux pages, sans qu'elles sachent laquelle c'est
import { createContext, ReactNode, useContext } from "react";
import { Plateforme } from "../services/Plateforme";

const ContextePlateforme = createContext<Plateforme | null>(null);

export function FournisseurPlateforme({ plateforme, children }: { plateforme: Plateforme; children: ReactNode }) {
  return <ContextePlateforme.Provider value={plateforme}>{children}</ContextePlateforme.Provider>;
}

export function usePlateforme(): Plateforme {
  const p = useContext(ContextePlateforme);
  if (!p) throw new Error("FournisseurPlateforme manquant");
  return p;
}
