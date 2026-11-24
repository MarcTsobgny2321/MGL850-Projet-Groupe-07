// Réponse d'une vérification ou d'une action : une phrase, sans encadré criard
import { Box, Text } from "@mantine/core";

export function Resultat({ ok, titre, detail }: { ok: boolean; titre: string; detail?: string }) {
  return (
    <Box>
      <Text fw={600} fz="lg" c={ok ? "teal.8" : "red.8"}>
        {titre}
      </Text>
      {detail && <Text c="dimmed">{detail}</Text>}
    </Box>
  );
}
