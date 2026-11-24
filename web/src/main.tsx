// Point d'entrée : thème, plateforme et compte choisi
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { theme } from "./theme/index";
import { App } from "./App";
import { FournisseurPlateforme } from "./hooks/usePlateforme";
import { FournisseurCompte } from "./hooks/useCompte";
import { PlateformeFactice } from "./services/PlateformeFactice";
import { PlateformeChaine } from "./services/PlateformeChaine";
import { Plateforme } from "./services/Plateforme";

// Seul endroit qui choisit l'implémentation : la vraie chaîne par défaut,
// des données fixes avec ?factice dans l'adresse (démo sans chaîne)
const plateforme: Plateforme = new URLSearchParams(location.search).has("factice")
  ? new PlateformeFactice()
  : new PlateformeChaine();

createRoot(document.getElementById("racine")!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <FournisseurPlateforme plateforme={plateforme}>
        <FournisseurCompte>
          <App />
        </FournisseurCompte>
      </FournisseurPlateforme>
    </MantineProvider>
  </StrictMode>,
);
