// Émission et scellement automatiques pour la démonstration locale.
import { useState } from "react";
import {
  Button,
  FileInput,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";
import { Recu } from "../../../scripts/formats";
import { Resultat } from "../components/Resultat";

type RoleEmetteur = "inspecteur" | "syndicat";

interface ReponseEmission {
  recu: Recu;
  numeroLot: number;
  dateScellement: number;
}

function telechargerRecu(recu: Recu) {
  const fichier = new Blob([JSON.stringify(recu, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(fichier);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `${recu.document.replace(/\.pdf$/i, "")}.json`;
  lien.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function Emission() {
  const [pdf, setPdf] = useState<File | null>(null);
  const [role, setRole] = useState<RoleEmetteur>("inspecteur");
  const [cadastre, setCadastre] = useState("1234567");
  const [jours, setJours] = useState<number | string>(30);
  const [enCours, setEnCours] = useState(false);
  const [reponse, setReponse] = useState<ReponseEmission | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function emettre() {
    if (!pdf) return;
    setEnCours(true);
    setErreur(null);
    setReponse(null);

    try {
      const parametres = new URLSearchParams({
        role,
        cadastre,
        jours: String(jours),
        nom: pdf.name,
      });
      const resultat = await fetch(`/api/emission?${parametres}`, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: pdf,
      });
      const corps = (await resultat.json()) as ReponseEmission & {
        erreur?: string;
      };
      if (!resultat.ok)
        throw new Error(corps.erreur ?? "L'émission du document a échoué.");
      setReponse(corps);
      telechargerRecu(corps.recu);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Émettre un document</Title>
        <Text c="neutre.7">
          Pour la démo, téléversez le PDF : le compte de test de l’émetteur le
          signera, puis le lot sera scellé automatiquement. Le PDF temporaire
          est supprimé après l’émission.
        </Text>
      </div>

      <Paper withBorder shadow="xs" p="lg">
        <Stack>
          <FileInput
            label="Document PDF"
            placeholder="Choisir le PDF"
            accept="application/pdf"
            leftSection={<IconFileText size={16} />}
            clearable
            value={pdf}
            onChange={setPdf}
          />
          <Group grow align="flex-start">
            <Select
              label="Émetteur de démonstration"
              value={role}
              onChange={(valeur) => {
                if (valeur === "inspecteur" || valeur === "syndicat") {
                  setRole(valeur);
                  setJours(valeur === "inspecteur" ? 30 : 0);
                }
              }}
              data={[
                {
                  value: "inspecteur",
                  label: "Inspecteur - rapport d’inspection",
                },
                { value: "syndicat", label: "Syndicat - attestation" },
              ]}
            />
            <TextInput
              label="Cadastre de l’immeuble"
              description="Doit correspondre au dossier de vente"
              value={cadastre}
              onChange={(event) => setCadastre(event.currentTarget.value)}
            />
            <NumberInput
              label="Validité"
              description="Durée en jours; 0 signifie sans expiration"
              min={0}
              max={3650}
              value={jours}
              onChange={setJours}
            />
          </Group>
          <Group>
            <Button
              onClick={emettre}
              loading={enCours}
              disabled={
                !pdf ||
                !/^\d{1,12}$/.test(cadastre) ||
                typeof jours !== "number"
              }
            >
              Émettre et sceller
            </Button>
            {enCours && (
              <Text size="sm" c="neutre.7">
                Émission et scellement en cours…
              </Text>
            )}
          </Group>
        </Stack>
      </Paper>

      {erreur && <Text c="erreur.7">{erreur}</Text>}

      {reponse && (
        <Paper withBorder shadow="xs" p="lg">
          <Stack>
            <Resultat
              ok
              titre={`Document scellé dans le lot ${reponse.numeroLot}`}
              detail="Le reçu JSON a été téléchargé. Conservez-le avec le PDF pour le dépôt et les vérifications."
            />
            <Text size="sm" c="neutre.7">
              Date de scellement :{" "}
              {new Date(reponse.dateScellement * 1000).toLocaleString()}
            </Text>
            <Group>
              <Button
                variant="light"
                onClick={() => telechargerRecu(reponse.recu)}
              >
                Télécharger le reçu à nouveau
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
