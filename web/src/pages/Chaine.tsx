// Explorateur de la chaîne locale : les derniers blocs et leurs transactions décodées
import { ReactNode, useCallback, useState } from "react";
import { Badge, Button, Code, Collapse, Group, Paper, Stack, Table, Text, Title } from "@mantine/core";
import { usePlateforme } from "../hooks/usePlateforme";
import { useLecture } from "../hooks/useLecture";
import { ValeurCopiable } from "../components/ValeurCopiable";
import { Bloc, TransactionChaine } from "../services/Plateforme";
import { dateLisible } from "../format";

const PAR_PAGE = 20;

export function Chaine() {
  const plateforme = usePlateforme();
  const [nombre, setNombre] = useState(PAR_PAGE);
  const lire = useCallback(() => plateforme.derniersBlocs(nombre), [plateforme, nombre]);
  const { donnees: blocs, erreur } = useLecture(lire);

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Chaîne</Title>
        <Text c="neutre.7">
          Les derniers blocs de la chaîne locale, du plus récent au plus ancien. Chaque bloc contient le hash du bloc
          précédent : c'est ce lien qui forme la chaîne.
        </Text>
      </div>

      {erreur && <Text c="erreur.7">{erreur}</Text>}

      {blocs?.map((b) => <CarteBloc key={b.numero} bloc={b} />)}

      {blocs && blocs.length === nombre && blocs[blocs.length - 1].numero > 0 && (
        <Button variant="light" onClick={() => setNombre(nombre + PAR_PAGE)}>
          Afficher des blocs plus anciens
        </Button>
      )}
    </Stack>
  );
}

function CarteBloc({ bloc }: { bloc: Bloc }) {
  return (
    <Paper withBorder shadow="xs" p="lg">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={700}>Bloc {bloc.numero}</Text>
          <Text fz="sm" c="neutre.7">{dateLisible(bloc.date)}</Text>
        </Group>
        <Group gap="xl" fz="sm">
          <Group gap={6}>
            <Text fz="sm" c="neutre.7">Hash</Text>
            <ValeurCopiable valeur={bloc.hash} court />
          </Group>
          <Group gap={6}>
            <Text fz="sm" c="neutre.7">Bloc précédent</Text>
            <ValeurCopiable valeur={bloc.hashPrecedent} court />
          </Group>
        </Group>
        {bloc.transactions.length === 0 && (
          <Text fz="sm" c="neutre.7">
            Aucune transaction {bloc.numero === 0 ? "(bloc de départ)" : "(bloc vide, par exemple après npm run avancer)"}
          </Text>
        )}
        {bloc.transactions.map((t) => <LigneTransaction key={t.hash} tx={t} />)}
      </Stack>
    </Paper>
  );
}

function LigneTransaction({ tx }: { tx: TransactionChaine }) {
  const [ouvert, setOuvert] = useState(false);
  const octets = (tx.donnees.length - 2) / 2;

  return (
    <Paper bg="primaire.0" p="sm" radius="sm">
      <Stack gap={6}>
        <Group justify="space-between">
          <Text fz="sm">
            <b>{tx.de.role}</b> appelle <b>{tx.vers}</b>.{tx.fonction}
          </Text>
          <Group gap="sm">
            <Text fz="xs" c="neutre.7">{tx.gaz.toLocaleString("fr-CA")} gaz</Text>
            <Badge color={tx.reussie ? "succes" : "erreur"} variant="light" radius="sm" tt="none">
              {tx.reussie ? "Réussie" : "Échouée"}
            </Badge>
          </Group>
        </Group>
        {tx.evenements.map((e, i) => (
          <Code key={i} fz="xs" style={{ whiteSpace: "normal" }}>{e}</Code>
        ))}
        <Group justify="space-between">
          <Group gap={6}>
            <Text fz="xs" c="neutre.7">Transaction</Text>
            <ValeurCopiable valeur={tx.hash} court />
          </Group>
          <Button variant="subtle" size="compact-xs" onClick={() => setOuvert(!ouvert)}>
            {ouvert ? "Masquer les détails" : "Détails"}
          </Button>
        </Group>

        <Collapse expanded={ouvert}>
          <Table fz="xs" verticalSpacing={4} withRowBorders={false}>
            <Table.Tbody>
              {tx.appel && <Champ nom="Appel"><Code fz="xs" style={{ whiteSpace: "normal" }}>{tx.appel}</Code></Champ>}
              <Champ nom="Expéditeur">{tx.de.role} <ValeurCopiable valeur={tx.de.adresse} /></Champ>
              {tx.adresseVers && <Champ nom="Destinataire">{tx.vers} <ValeurCopiable valeur={tx.adresseVers} /></Champ>}
              {tx.contratCree && <Champ nom="Contrat créé">{tx.vers} <ValeurCopiable valeur={tx.contratCree} /></Champ>}
              <Champ nom="Position dans le bloc">{tx.position}</Champ>
              <Champ nom="Nonce">{tx.nonce}</Champ>
              <Champ nom="Valeur envoyée">{tx.valeur}</Champ>
              <Champ nom="Gaz">
                {tx.gaz.toLocaleString("fr-CA")} consommé sur {tx.gazLimite.toLocaleString("fr-CA")} permis
              </Champ>
              <Champ nom="Prix du gaz">{tx.prixGaz}</Champ>
              <Champ nom="Coût">{tx.cout}</Champ>
              <Champ nom="Signature"><ValeurCopiable valeur={tx.signature} court /></Champ>
              <Champ nom="Données brutes">
                {octets} octets <ValeurCopiable valeur={tx.donnees} court />
              </Champ>
            </Table.Tbody>
          </Table>
        </Collapse>
      </Stack>
    </Paper>
  );
}

function Champ({ nom, children }: { nom: string; children: ReactNode }) {
  return (
    <Table.Tr>
      <Table.Td c="neutre.7" w={170} style={{ verticalAlign: "top" }}>{nom}</Table.Td>
      <Table.Td>{children}</Table.Td>
    </Table.Tr>
  );
}
