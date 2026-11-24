// Point d'entrée : thème, plateforme et compte choisi
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { theme } from "./theme/index";
import { App } from "./App";
import { FournisseurPlateforme } from "./hooks/usePlateforme";
import { FournisseurCompte } from "./hooks/useCompte";
import { PlateformeChaine } from "./services/PlateformeChaine";
import { Plateforme } from "./services/Plateforme";

// Seul endroit qui choisit l'implémentation de l'interface (ADR 0003)
const plateforme: Plateforme = new PlateformeChaine();

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
