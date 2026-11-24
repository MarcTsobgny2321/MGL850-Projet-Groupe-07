// Hash, adresse ou signature en police à chasse fixe.
// Une icône de copie apparaît au survol ; elle copie toujours la valeur complète,
// même si l'affichage est abrégé.
import { ActionIcon, Code, CopyButton, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { abreger } from "../format";
import classes from "./ValeurCopiable.module.css";

export function ValeurCopiable({ valeur, court = false }: { valeur: string; court?: boolean }) {
  return (
    <span className={classes.valeur}>
      <Code className={classes.code} title={court ? valeur : undefined}>
        {court ? abreger(valeur) : valeur}
      </Code>
      <CopyButton value={valeur} timeout={1500}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? "Copié" : "Copier"} withArrow position="right">
            <ActionIcon
              className={classes.copier}
              data-copie={copied ? "oui" : undefined}
              variant="subtle"
              color={copied ? "teal" : "gray"}
              size="sm"
              onClick={copy}
              aria-label="Copier la valeur"
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </span>
  );
}
