// Compte choisi dans « Je suis », mémorisé entre deux visites
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Compte } from "../services/Plateforme";
import { usePlateforme } from "./usePlateforme";

interface ValeurCompte {
  compte: Compte | null;
  comptes: Compte[];
  choisir: (role: string) => void;
}

const ContexteCompte = createContext<ValeurCompte | null>(null);
const CLE = "compte-choisi";

export function FournisseurCompte({ children }: { children: ReactNode }) {
  const plateforme = usePlateforme();
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [role, setRole] = useState(() => localStorage.getItem(CLE) ?? "courtier");

  useEffect(() => {
    plateforme.comptes().then(setComptes).catch(() => setComptes([]));
  }, [plateforme]);

  const choisir = (r: string) => {
    localStorage.setItem(CLE, r);
    setRole(r);
  };
  const compte = comptes.find((c) => c.role === role) ?? null;
  return <ContexteCompte.Provider value={{ compte, comptes, choisir }}>{children}</ContexteCompte.Provider>;
}

export function useCompte(): ValeurCompte {
  const v = useContext(ContexteCompte);
  if (!v) throw new Error("FournisseurCompte manquant");
  return v;
}
