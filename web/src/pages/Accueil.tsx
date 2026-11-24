// État de la connexion : contrats, lots, dossiers
import { useEffect, useState } from "react";
import { Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { usePlateforme } from "../hooks/usePlateforme";
import { Infos } from "../services/Plateforme";
import { ValeurCopiable } from "../components/ValeurCopiable";

function Chiffre({ titre, valeur }: { titre: string; valeur: string | number }) {
  return (
    <Paper withBorder p="md">
      <Text fz="sm" c="dimmed">{titre}</Text>
      <Text fz="xl" fw={600}>{valeur}</Text>
    </Paper>
  );
}

export function Accueil() {
  const plateforme = usePlateforme();
  const [infos, setInfos] = useState<Infos | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    plateforme.infos().then(setInfos).catch((e) => setErreur(e.message));
  }, [plateforme]);

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Bienvenue</Title>
        <Text c="dimmed">
          Les documents d'une vente sont scellés sur la chaîne par lots. Chacun peut vérifier qu'un document
          est authentique et qu'il était valide à une date donnée.
        </Text>
      </div>
      {erreur && <Text c="red.8">La chaîne ne répond pas : {erreur}</Text>}
      {infos && (
        <>
          <SimpleGrid cols={2}>
            <Chiffre titre="Lots scellés" valeur={infos.nbLots} />
            <Chiffre titre="Dossiers de vente" valeur={infos.nbDossiers} />
          </SimpleGrid>
          <Paper withBorder p="md">
            <Stack gap="xs">
              <Text fz="sm" c="dimmed">Adresses des contrats</Text>
              <Group gap="sm"><Text w={170}>ProofAnchor</Text><ValeurCopiable valeur={infos.proofAnchor} /></Group>
              <Group gap="sm"><Text w={170}>TransactionWorkflow</Text><ValeurCopiable valeur={infos.transactionWorkflow} /></Group>
            </Stack>
          </Paper>
        </>
      )}
    </Stack>
  );
}
