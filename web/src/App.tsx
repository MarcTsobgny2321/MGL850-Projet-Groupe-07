// Squelette de l'application : en-tête et page courante (sans routeur)
import { useState } from "react";
import { AppShell, Container } from "@mantine/core";
import { EnTete, Page } from "./components/EnTete";
import { Accueil } from "./pages/Accueil";
import { Verification } from "./pages/Verification";
import { Dossiers } from "./pages/Dossiers";
import { DossierDetail } from "./pages/DossierDetail";

export function App() {
  const [page, setPage] = useState<Page>("accueil");
  const [dossier, setDossier] = useState<number | null>(null);

  const allerA = (p: Page) => {
    setDossier(null);
    setPage(p);
  };

  return (
    <AppShell header={{ height: 64 }} padding="xl" bg="primaire.0">
      <AppShell.Header>
        <EnTete page={page} allerA={allerA} />
      </AppShell.Header>
      <AppShell.Main>
        <Container size="md">
          {page === "accueil" && <Accueil />}
          {page === "verification" && <Verification />}
          {page === "dossiers" && dossier === null && <Dossiers ouvrirDetail={setDossier} />}
          {page === "dossiers" && dossier !== null && (
            <DossierDetail id={dossier} retour={() => setDossier(null)} verifier={() => allerA("verification")} />
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
