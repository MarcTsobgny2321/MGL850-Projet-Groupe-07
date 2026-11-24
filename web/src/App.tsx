// Squelette de l'application : en-tête et page courante (sans routeur)
import { useState } from "react";
import { AppShell, Container, Text } from "@mantine/core";
import { EnTete, Page } from "./components/EnTete";
import { Accueil } from "./pages/Accueil";
import { Verification } from "./pages/Verification";

export function App() {
  const [page, setPage] = useState<Page>("verification");

  return (
    <AppShell header={{ height: 64 }} padding="xl">
      <AppShell.Header>
        <EnTete page={page} allerA={setPage} />
      </AppShell.Header>
      <AppShell.Main>
        <Container size="md">
          {page === "accueil" && <Accueil />}
          {page === "verification" && <Verification />}
          {page === "dossiers" && <Text c="dimmed">Écran des dossiers : à venir.</Text>}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
