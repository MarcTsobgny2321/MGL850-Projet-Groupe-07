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

// Pour l'instant : fausse plateforme (maquettes). PlateformeChaine la remplacera.
const plateforme = new PlateformeFactice();

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
