// Rôle suivi de l'adresse abrégée et copiable : « acheteur 0x14dC…9955 »
import { Group, Text } from "@mantine/core";
import { Compte } from "../services/Plateforme";
import { ValeurCopiable } from "./ValeurCopiable";

export function Adresse({ compte }: { compte: Compte }) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text span>{compte.role}</Text>
      <ValeurCopiable valeur={compte.adresse} court />
    </Group>
  );
}
