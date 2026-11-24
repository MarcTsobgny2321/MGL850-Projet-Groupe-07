// Liste des dossiers de vente, et ouverture d'un dossier par le courtier
import { useCallback, useState } from "react";
import { Button, Group, List, NumberInput, Paper, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { usePlateforme } from "../hooks/usePlateforme";
import { useCompte } from "../hooks/useCompte";
import { useLecture } from "../hooks/useLecture";
import { BadgeEtat } from "../components/BadgeEtat";
import { BoutonTransaction } from "../components/BoutonTransaction";
import { Dossier } from "../services/Plateforme";

function documentsDeposes(d: Dossier) {
  return `${d.documents.filter((x) => x.dateDepot).length} / ${d.documents.length}`;
}

export function Dossiers({ ouvrirDetail }: { ouvrirDetail: (id: number) => void }) {
  const plateforme = usePlateforme();
  const { compte } = useCompte();
  const lire = useCallback(() => plateforme.listerDossiers(), [plateforme]);
  const { donnees: dossiers, erreur, recharger } = useLecture(lire);

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Dossiers de vente</Title>
        <Text c="neutre.7">
          Chaque dossier suit une vente : l'accord des parties, le dépôt des documents attendus, puis la fermeture par
          le notaire.
        </Text>
      </div>

      {erreur && <Text c="erreur.7">{erreur}</Text>}

      <Paper withBorder shadow="xs" p="lg">
        {dossiers && dossiers.length === 0 && <Text c="neutre.7">Aucun dossier pour l'instant.</Text>}
        {dossiers && dossiers.length > 0 && (
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>N°</Table.Th>
                <Table.Th>État</Table.Th>
                <Table.Th>Documents déposés</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {[...dossiers].reverse().map((d) => (
                <Table.Tr key={d.id} style={{ cursor: "pointer" }} onClick={() => ouvrirDetail(d.id)}>
                  <Table.Td fw={600}>Dossier {d.id}</Table.Td>
                  <Table.Td><BadgeEtat etat={d.etat} /></Table.Td>
                  <Table.Td>{documentsDeposes(d)}</Table.Td>
                  <Table.Td ta="right">
                    <Button variant="light" size="xs">Voir</Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {compte?.role === "courtier" ? (
        <Ouverture apres={recharger} />
      ) : (
        <Text fz="sm" c="neutre.7">Seul le courtier peut ouvrir un dossier.</Text>
      )}
    </Stack>
  );
}

// Formulaire du courtier : reste dans cette page, il ne sert nulle part ailleurs
function Ouverture({ apres }: { apres: () => void }) {
  const plateforme = usePlateforme();
  const { compte } = useCompte();
  const [cadastre, setCadastre] = useState("1234567");
  const [jours, setJours] = useState<number | string>(10);

  return (
    <Paper withBorder shadow="xs" p="lg">
      <Stack>
        <Title order={4}>Ouvrir un dossier</Title>
        <Group grow align="flex-start">
          <TextInput
            label="Cadastre de l'immeuble"
            description="Seule son empreinte salée ira sur la chaîne"
            placeholder="Ex. 1234567"
            value={cadastre}
            onChange={(e) => setCadastre(e.currentTarget.value)}
          />
          <NumberInput label="Délai pour les documents" description="En jours" min={1} value={jours} onChange={setJours} />
        </Group>
        <div>
          <Text fz="sm" fw={500}>Documents attendus</Text>
          <List fz="sm" c="neutre.8">
            <List.Item>Rapport d'inspection, émis par l'inspecteur, déposé par l'acheteur</List.Item>
            <List.Item>Attestation du syndicat, émise par le syndicat, déposée par le vendeur</List.Item>
          </List>
        </div>
        <BoutonTransaction
          libelle="Ouvrir le dossier"
          disabled={!cadastre || !compte}
          action={() => plateforme.pour(compte!).ouvrir(cadastre, Number(jours))}
          enSucces={(id) => `Dossier ${id} ouvert. Il attend l'accord du vendeur et de l'acheteur.`}
          apres={apres}
        />
      </Stack>
    </Paper>
  );
}
