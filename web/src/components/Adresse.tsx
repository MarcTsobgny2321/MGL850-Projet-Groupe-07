// Rôle suivi de l'adresse abrégée : « acheteur 0x14dC…9955 »
import { Text } from "@mantine/core";
import { Compte } from "../services/Plateforme";
import { adresseCourte } from "../format";

export function Adresse({ compte }: { compte: Compte }) {
  return (
    <span>
      {compte.role}{" "}
      <Text span ff="monospace" fz="xs" c="dimmed" title={compte.adresse}>
        {adresseCourte(compte.adresse)}
      </Text>
    </span>
  );
}
