// Réponse d'une vérification ou d'une action : une pastille d'icône et une phrase
import { Group, Text, ThemeIcon } from "@mantine/core";
import { IconCircleCheck, IconCircleX } from "@tabler/icons-react";

export function Resultat({ ok, titre, detail }: { ok: boolean; titre: string; detail?: string }) {
  const role = ok ? "succes" : "erreur";
  return (
    <Group gap="md" wrap="nowrap" align="flex-start">
      <ThemeIcon color={role} variant="light" size={44} radius="xl">
        {ok ? <IconCircleCheck size={26} /> : <IconCircleX size={26} />}
      </ThemeIcon>
      <div>
        <Text fw={600} fz="lg" c={`${role}.8`}>
          {titre}
        </Text>
        {detail && <Text c="neutre.7">{detail}</Text>}
      </div>
    </Group>
  );
}
