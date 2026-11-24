// Vérifier un PDF et son reçu à une date. Lecture seule : aucun compte nécessaire.
import { useState } from "react";
import { Button, FileInput, Group, Paper, Stack, Text, TextInput, Timeline, Title } from "@mantine/core";
import { usePlateforme } from "../hooks/usePlateforme";
import { Recu, Verification as ResultatVerification } from "../services/Plateforme";
import { Resultat } from "../components/Resultat";
import { ValeurCopiable } from "../components/ValeurCopiable";
import { dateLisible } from "../format";

export function Verification() {
  const plateforme = usePlateforme();
  const [pdf, setPdf] = useState<File | null>(null);
  const [recu, setRecu] = useState<File | null>(null);
  const [date, setDate] = useState("");
  const [cadastre, setCadastre] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<ResultatVerification | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function verifier() {
    if (!pdf || !recu) return;
    setEnCours(true);
    setErreur(null);
    setResultat(null);
    try {
      // Le PDF est lu ici, dans le navigateur : il n'est envoyé nulle part
      const octets = new Uint8Array(await pdf.arrayBuffer());
      const contenuRecu = JSON.parse(await recu.text()) as Recu;
      const quand = date ? Math.floor(new Date(date).getTime() / 1000) : undefined;
      setResultat(await plateforme.verifier(octets, contenuRecu, quand, cadastre || undefined));
    } catch (e) {
      setErreur(e instanceof SyntaxError ? "Le reçu n'est pas un fichier JSON lisible." : (e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Vérifier un document</Title>
        <Text c="dimmed">
          Le PDF reste sur votre ordinateur : seule son empreinte est calculée. La vérification ne coûte rien et ne
          demande aucun compte.
        </Text>
      </div>

      <Paper withBorder p="lg">
        <Stack>
          <Group grow align="flex-start">
            <FileInput label="Document PDF" placeholder="Choisir le PDF" accept="application/pdf" value={pdf} onChange={setPdf} clearable />
            <FileInput label="Reçu" description="Le fichier .json remis avec le PDF" placeholder="Choisir le reçu" accept="application/json" value={recu} onChange={setRecu} clearable />
          </Group>
          <Group grow align="flex-start">
            <TextInput type="datetime-local" label="Date" description="Laisser vide pour vérifier maintenant" value={date} onChange={(e) => setDate(e.currentTarget.value)} />
            <TextInput label="Cadastre" description="Facultatif : confirme l'immeuble" placeholder="1234567" value={cadastre} onChange={(e) => setCadastre(e.currentTarget.value)} />
          </Group>
          <Group>
            <Button onClick={verifier} loading={enCours} disabled={!pdf || !recu}>
              Vérifier
            </Button>
          </Group>
        </Stack>
      </Paper>

      {erreur && <Text c="red.8">{erreur}</Text>}

      {resultat && (
        <Paper withBorder p="lg">
          <Stack gap="lg">
            <Resultat
              ok={resultat.valide}
              titre={resultat.valide ? `Valide le ${dateLisible(resultat.date)}` : `Non valide le ${dateLisible(resultat.date)}`}
              detail={resultat.valide ? "Le document est intact, scellé et valide à cette date." : resultat.raison}
            />
            <Timeline bulletSize={12} lineWidth={1} active={resultat.etapes.length}>
              {resultat.etapes.map((e) => (
                <Timeline.Item key={e.nom} title={e.nom} color={e.ok ? "encre" : "red"}>
                  <Stack gap={4}>
                    <Text fz="sm" c="dimmed">{e.valeur}</Text>
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
