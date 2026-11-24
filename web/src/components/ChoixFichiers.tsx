// Choix d'un PDF et de son reçu JSON, et leur lecture dans le navigateur
import { FileInput, Group } from "@mantine/core";
import { IconFileText, IconFileCode } from "@tabler/icons-react";
import { Recu } from "../services/Plateforme";

export interface Fichiers {
  pdf: File | null;
  recu: File | null;
}

export function ChoixFichiers({ valeur, onChange }: { valeur: Fichiers; onChange: (f: Fichiers) => void }) {
  return (
    <Group grow align="flex-start">
      <FileInput
        label="Document PDF"
        placeholder="Choisir le PDF"
        accept="application/pdf"
        leftSection={<IconFileText size={16} />}
        clearable
        value={valeur.pdf}
        onChange={(pdf) => onChange({ ...valeur, pdf })}
      />
      <FileInput
        label="Reçu"
        description="Le fichier .json remis avec le PDF"
        placeholder="Choisir le reçu"
        accept="application/json"
        leftSection={<IconFileCode size={16} />}
        clearable
        value={valeur.recu}
        onChange={(recu) => onChange({ ...valeur, recu })}
      />
    </Group>
  );
}

// Le PDF est lu ici, dans le navigateur : il n'est envoyé nulle part
export async function lireFichiers(f: Fichiers): Promise<{ octets: Uint8Array; recu: Recu }> {
  if (!f.pdf || !f.recu) throw new Error("Choisir le PDF et son reçu.");
  const octets = new Uint8Array(await f.pdf.arrayBuffer());
  try {
    return { octets, recu: JSON.parse(await f.recu.text()) as Recu };
  } catch {
    throw new Error("Le reçu n'est pas un fichier JSON lisible.");
  }
}
