// Détail d'un dossier : progression, parties, documents, et actions du compte choisi
import { ReactNode, useCallback, useState } from "react";
import { Anchor, Group, List, Paper, SimpleGrid, Stack, Stepper, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowLeft, IconCheck, IconClock } from "@tabler/icons-react";
import { usePlateforme } from "../hooks/usePlateforme";
import { useCompte } from "../hooks/useCompte";
import { useLecture } from "../hooks/useLecture";
import { Adresse } from "../components/Adresse";
import { BadgeEtat } from "../components/BadgeEtat";
import { BoutonTransaction } from "../components/BoutonTransaction";
import { ChoixFichiers, Fichiers, lireFichiers } from "../components/ChoixFichiers";
import { TableDocuments } from "../components/TableDocuments";
import { ValeurCopiable } from "../components/ValeurCopiable";
import { Compte, Dossier } from "../services/Plateforme";

// Étape du Stepper : ouvert, accord, documents, fermé
function etape(d: Dossier): number {
  if (d.etat === "EnAttenteAccord") return 1;
  if (d.etat === "Actif") return d.documents.every((x) => x.dateDepot) ? 3 : 2;
  return 4;
}

// Ce qui empêcherait une fermeture conforme maintenant
function obstacles(d: Dossier): string[] {
  return d.documents.flatMap((x) => {
    if (!x.dateDepot) return [`${x.type} : pas encore déposé`];
    if (x.expire) return [`${x.type} : expiré`];
    if (x.enRetard) return [`${x.type} : déposé en retard`];
    return [];
  });
}

const meme = (a: Compte, b: Compte) => a.adresse.toLowerCase() === b.adresse.toLowerCase();

export function DossierDetail({ id, retour, verifier }: { id: number; retour: () => void; verifier: () => void }) {
  const plateforme = usePlateforme();
  const lire = useCallback(() => plateforme.lireDossier(id), [plateforme, id]);
  const { donnees: d, erreur, recharger } = useLecture(lire);

  return (
    <Stack gap="lg">
      <Anchor component="button" onClick={retour} c="primaire.7" w="fit-content">
        <Group gap={4}><IconArrowLeft size={16} /> Dossiers</Group>
      </Anchor>

      {erreur && <Text c="erreur.7">{erreur}</Text>}
      {d && (
        <>
          <Group justify="space-between" align="flex-end">
            <div>
              <Group gap="sm">
                <Title order={2}>Dossier {d.id}</Title>
                <BadgeEtat etat={d.etat} />
              </Group>
              <Group gap={6} mt={4}>
                <Text fz="sm" c="neutre.7">Immeuble (empreinte salée du cadastre)</Text>
                <ValeurCopiable valeur={d.immeuble} court />
              </Group>
            </div>
          </Group>

          <Paper withBorder shadow="xs" p="lg">
            <Stepper active={etape(d)} size="sm" color={d.etat === "FermeNonConforme" ? "erreur" : "primaire"}>
              <Stepper.Step label="Ouvert" description="par le courtier" />
              <Stepper.Step label="Accord" description="vendeur et acheteur" />
              <Stepper.Step label="Documents" description="déposés et vérifiés" />
              <Stepper.Step label="Fermé" description="par le notaire" />
            </Stepper>
          </Paper>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Paper withBorder shadow="xs" p="lg">
              <Title order={5} mb="sm">Parties</Title>
              <Stack gap="xs">
                <Partie titre="Courtier" compte={d.courtier} />
                <Partie titre="Vendeur" compte={d.vendeur} accord={d.accordVendeur} />
                <Partie titre="Acheteur" compte={d.acheteur} accord={d.accordAcheteur} />
                <Partie titre="Notaire" compte={d.notaire} />
              </Stack>
            </Paper>
            <Paper withBorder shadow="xs" p="lg">
              <Title order={5} mb="sm">Conformité</Title>
              <Conformite d={d} />
            </Paper>
          </SimpleGrid>

          <Paper withBorder shadow="xs" p="lg">
            <Title order={5} mb="sm">Documents attendus</Title>
            <TableDocuments documents={d.documents} />
          </Paper>

          <Actions d={d} recharger={recharger} verifier={verifier} />
        </>
      )}
    </Stack>
  );
}

function Partie({ titre, compte, accord }: { titre: string; compte: Compte; accord?: boolean }) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Group gap="sm" wrap="nowrap">
        <Text w={70} fz="sm" c="neutre.7">{titre}</Text>
        <Adresse compte={compte} />
      </Group>
      {accord !== undefined && (
        <Group gap={4} wrap="nowrap">
          <ThemeIcon size={18} radius="xl" variant="light" color={accord ? "succes" : "secondaire"}>
            {accord ? <IconCheck size={12} /> : <IconClock size={12} />}
          </ThemeIcon>
          <Text fz="sm" c={accord ? "succes.8" : "secondaire.8"}>{accord ? "accord donné" : "en attente"}</Text>
        </Group>
      )}
    </Group>
  );
}

function Conformite({ d }: { d: Dossier }) {
  if (d.etat === "Ferme") return <Text c="succes.8" fw={500}>Fermé conforme : tout est arrivé à temps.</Text>;
  if (d.etat === "FermeNonConforme") return <Text c="erreur.8" fw={500}>Fermé non conforme.</Text>;
  const liste = obstacles(d);
  return (
    <Stack gap="xs">
      <Text>
        Si le notaire fermait maintenant :{" "}
        <Text span fw={600} c={liste.length === 0 ? "succes.8" : "avertissement.8"}>
          {liste.length === 0 ? "conforme" : "non conforme"}
        </Text>
      </Text>
      {liste.length > 0 && (
        <List fz="sm" c="neutre.8">
          {liste.map((o) => <List.Item key={o}>{o}</List.Item>)}
        </List>
      )}
      <Text fz="xs" c="neutre.6">C'est le contrat qui décide du résultat à la fermeture, pas le notaire.</Text>
    </Stack>
  );
}

// Seules les actions possibles pour le compte choisi et l'état du dossier sont proposées
function Actions({ d, recharger, verifier }: { d: Dossier; recharger: () => void; verifier: () => void }) {
  const plateforme = usePlateforme();
  const { compte } = useCompte();
  if (!compte) return null;

  const estVendeur = meme(compte, d.vendeur);
  const estAcheteur = meme(compte, d.acheteur);
  const estNotaire = meme(compte, d.notaire);
  const actions = plateforme.pour(compte);

  let contenu: ReactNode;
  if (d.etat === "Ferme" || d.etat === "FermeNonConforme") {
    contenu = <Text c="neutre.7">Ce dossier est fermé. Plus aucune action n'est possible.</Text>;
  } else if (d.etat === "EnAttenteAccord" && (estVendeur || estAcheteur)) {
    const dejaDonne = estVendeur ? d.accordVendeur : d.accordAcheteur;
    contenu = dejaDonne ? (
      <Text c="neutre.7">Votre accord est donné. Le dossier attend celui de l'autre partie.</Text>
    ) : (
      <BoutonTransaction
        libelle="Approuver le dossier"
        action={() => actions.approuver(d.id)}
        enSucces={() => "Accord enregistré sur la chaîne."}
        apres={recharger}
      />
    );
  } else if (d.etat === "Actif" && (estVendeur || estAcheteur)) {
    const aDeposer = d.documents.filter((x) => meme(x.deposant, compte) && !x.dateDepot);
    contenu =
      aDeposer.length === 0 ? (
        <Text c="neutre.7">Vous avez déposé tous les documents qui vous reviennent.</Text>
      ) : (
        <Stack gap="xl">
          {aDeposer.map((x) => <Depot key={x.type} type={x.type} id={d.id} recharger={recharger} />)}
        </Stack>
      );
  } else if (d.etat === "Actif" && estNotaire) {
    contenu = (
      <Stack gap="md" align="flex-start">
        <Text c="neutre.7">
          Avant de fermer, revérifiez les documents :{" "}
          <Anchor component="button" onClick={verifier}>page de vérification</Anchor>.
        </Text>
        <BoutonTransaction
          libelle="Fermer le dossier"
          action={() => actions.fermer(d.id)}
          enSucces={(etat) => `Dossier fermé. Résultat décidé par le contrat : ${etat === "Ferme" ? "conforme" : "non conforme"}.`}
          apres={recharger}
        />
      </Stack>
    );
  } else if (meme(compte, d.courtier)) {
    contenu = <Text c="neutre.7">Le courtier a ouvert ce dossier ; il n'intervient plus ensuite.</Text>;
  } else {
    contenu = <Text c="neutre.7">Rien à faire pour vous à cette étape.</Text>;
  }

  return (
    <Paper withBorder shadow="xs" p="lg">
      <Title order={5} mb="sm">Vos actions ({compte.role})</Title>
      {contenu}
    </Paper>
  );
}

function Depot({ type, id, recharger }: { type: string; id: number; recharger: () => void }) {
  const plateforme = usePlateforme();
  const { compte } = useCompte();
  const [fichiers, setFichiers] = useState<Fichiers>({ pdf: null, recu: null });

  return (
    <Stack gap="sm">
      <Text fw={500}>Déposer : {type}</Text>
      <ChoixFichiers valeur={fichiers} onChange={setFichiers} />
      <BoutonTransaction
        libelle="Déposer"
        disabled={!fichiers.pdf || !fichiers.recu}
        action={async () => {
          const { octets, recu } = await lireFichiers(fichiers);
          await plateforme.pour(compte!).deposer(id, octets, recu);
        }}
        enSucces={() => "Document déposé. Le contrat l'a vérifié auprès de ProofAnchor."}
        apres={recharger}
      />
    </Stack>
  );
}
