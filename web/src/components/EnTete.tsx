// Barre du haut : navigation, heure de la chaîne, « Je suis »
import { useEffect, useState } from "react";
import { Anchor, Group, Select, Text } from "@mantine/core";
import { useCompte } from "../hooks/useCompte";
import { usePlateforme } from "../hooks/usePlateforme";
import { dateLisible } from "../format";

export type Page = "accueil" | "verification" | "emission" | "dossiers";

const PAGES: { id: Page; titre: string }[] = [
  { id: "accueil", titre: "Accueil" },
  { id: "verification", titre: "Vérification" },
  { id: "emission", titre: "Émission" },
  { id: "dossiers", titre: "Dossiers" },
];

export function EnTete({ page, allerA }: { page: Page; allerA: (p: Page) => void }) {
  const { compte, comptes, choisir } = useCompte();
  const plateforme = usePlateforme();
  const [heure, setHeure] = useState<number | null>(null);

  // L'heure de la chaîne peut différer de l'heure réelle (npm run avancer)
  useEffect(() => {
    const lire = () => plateforme.infos().then((i) => setHeure(i.heureChaine)).catch(() => setHeure(null));
    lire();
    const minuterie = setInterval(lire, 5000);
    return () => clearInterval(minuterie);
  }, [plateforme]);

  return (
    <Group justify="space-between" h="100%" px="lg" bg="primaire.7">
      <Group gap="xl">
        <Text fw={700} c="white">Preuves immobilières</Text>
        <Group gap="lg">
          {PAGES.map((p) => (
            <Anchor
              key={p.id}
              component="button"
              onClick={() => allerA(p.id)}
              c={p.id === page ? "white" : "primaire.1"}
              fw={p.id === page ? 600 : 400}
              td={p.id === page ? "underline" : undefined}
              style={{ textUnderlineOffset: 6 }}
              underline="never"
            >
              {p.titre}
            </Anchor>
          ))}
        </Group>
      </Group>
      <Group gap="md">
        <Text fz="xs" c="primaire.1">
          {heure ? `Heure de la chaîne : ${dateLisible(heure)}` : "Chaîne injoignable"}
        </Text>
        {page !== "emission" && (
          <Select
            aria-label="Je suis"
            w={190}
            size="sm"
            allowDeselect={false}
            value={compte?.role ?? null}
            onChange={(r) => r && choisir(r)}
            data={comptes.map((c) => ({ value: c.role, label: `Je suis : ${c.role}` }))}
          />
        )}
      </Group>
    </Group>
  );
}
