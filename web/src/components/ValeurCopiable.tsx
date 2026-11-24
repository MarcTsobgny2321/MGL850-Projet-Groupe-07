// Hash, adresse ou signature : police à chasse fixe et bouton « Copier ».
// Le bouton copie toujours la valeur complète, même si l'affichage est abrégé.
import { Button, Code, CopyButton, Group } from "@mantine/core";
import { abreger } from "../format";

export function ValeurCopiable({ valeur, court = false }: { valeur: string; court?: boolean }) {
  const affichage = court ? abreger(valeur) : valeur;
  return (
    <Group gap={6} wrap="nowrap" align="flex-start">
      <Code title={valeur} style={{ wordBreak: "break-all", whiteSpace: "normal" }}>
        {affichage}
      </Code>
      <CopyButton value={valeur} timeout={1500}>
        {({ copied, copy }) => (
          <Button variant="subtle" size="compact-xs" color={copied ? "teal" : "gray"} onClick={copy} style={{ flexShrink: 0 }}>
            {copied ? "Copié" : "Copier"}
          </Button>
        )}
      </CopyButton>
    </Group>
  );
}
