// Vérifier un PDF et son reçu à une date. Lecture seule : aucun compte nécessaire.
import { useState } from "react";
import { Button, Group, Paper, Stack, Text, TextInput, ThemeIcon, Timeline, Title } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { usePlateforme } from "../hooks/usePlateforme";
import { Verification as ResultatVerification } from "../services/Plateforme";
import { ChoixFichiers, Fichiers, lireFichiers } from "../components/ChoixFichiers";
import { Resultat } from "../components/Resultat";
import { ValeurCopiable } from "../components/ValeurCopiable";
import { dateLisible } from "../format";

export function Verification() {
  const plateforme = usePlateforme();
  const [fichiers, setFichiers] = useState<Fichiers>({ pdf: null, recu: null });
  const [date, setDate] = useState("");
  const [cadastre, setCadastre] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<ResultatVerification | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function verifier() {
    setEnCours(true);
    setErreur(null);
    setResultat(null);
    try {
      const { octets, recu } = await lireFichiers(fichiers);
      const quand = date ? Math.floor(new Date(date).getTime() / 1000) : undefined;
      setResultat(await plateforme.verifier(octets, recu, quand, cadastre || undefined));
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Vérifier un document</Title>
        <Text c="neutre.7">
          Le PDF reste sur votre ordinateur : seule son empreinte est calculée. La vérification ne coûte rien et ne
          demande aucun compte.
        </Text>
      </div>

      <Paper withBorder shadow="xs" p="lg">
        <Stack>
          <ChoixFichiers valeur={fichiers} onChange={setFichiers} />
          <Group grow align="flex-start">
            <TextInput type="datetime-local" label="Date" description="Laisser vide pour vérifier maintenant" value={date} onChange={(e) => setDate(e.currentTarget.value)} />
            <TextInput label="Cadastre" description="Facultatif : confirme l'immeuble" placeholder="1234567" value={cadastre} onChange={(e) => setCadastre(e.currentTarget.value)} />
          </Group>
          <Group>
            <Button onClick={verifier} loading={enCours} disabled={!fichiers.pdf || !fichiers.recu}>
              Vérifier
            </Button>
          </Group>
        </Stack>
      </Paper>

      {erreur && <Text c="erreur.7">{erreur}</Text>}

      {resultat && (
        <Paper withBorder shadow="xs" p="lg">
          <Stack gap="lg">
            <Resultat
              ok={resultat.valide}
              titre={resultat.valide ? `Valide le ${dateLisible(resultat.date)}` : `Non valide le ${dateLisible(resultat.date)}`}
              detail={resultat.valide ? "Le document est intact, scellé et valide à cette date." : resultat.raison}
            />
            <Timeline bulletSize={22} lineWidth={2} active={resultat.etapes.length} color="succes">
              {resultat.etapes.map((e) => (
                <Timeline.Item
                  key={e.nom}
                  title={e.nom}
                  bullet={
                    <ThemeIcon size={22} radius="xl" color={e.ok ? "succes" : "erreur"}>
                      {e.ok ? <IconCheck size={13} /> : <IconX size={13} />}
                    </ThemeIcon>
                  }
                >
                  <Stack gap={4}>
                    <Text fz="sm" c="neutre.7">{e.valeur}</Text>
                    {e.technique && <ValeurCopiable valeur={e.technique} />}
                  </Stack>
                </Timeline.Item>
              ))}
            </Timeline>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
