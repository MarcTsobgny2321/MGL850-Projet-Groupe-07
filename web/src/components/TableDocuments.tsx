// Documents attendus d'un dossier et leur situation
import { Badge, Table } from "@mantine/core";
import { DocumentDuDossier } from "../services/Plateforme";
import { RoleCouleur } from "../theme/couleurs";
import { dateLisible } from "../format";

function situation(d: DocumentDuDossier): { libelle: string; couleur: RoleCouleur } {
  if (!d.dateDepot) return { libelle: "Pas encore déposé", couleur: "neutre" };
  if (d.expire) return { libelle: "Expiré", couleur: "erreur" };
  if (d.enRetard) return { libelle: "Déposé en retard", couleur: "avertissement" };
  return { libelle: "Déposé à temps", couleur: "succes" };
}

export function TableDocuments({ documents }: { documents: DocumentDuDossier[] }) {
  return (
    <Table verticalSpacing="sm" highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Document</Table.Th>
          <Table.Th>Émetteur</Table.Th>
          <Table.Th>Déposé par</Table.Th>
          <Table.Th>Avant le</Table.Th>
          <Table.Th>Situation</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {documents.map((d) => {
          const s = situation(d);
          return (
            <Table.Tr key={d.type}>
              <Table.Td fw={500}>{d.type}</Table.Td>
              <Table.Td>{d.emetteur.role}</Table.Td>
              <Table.Td>{d.deposant.role}</Table.Td>
              <Table.Td style={{ whiteSpace: "nowrap" }}>{dateLisible(d.dateLimite)}</Table.Td>
              <Table.Td>
                <Badge color={s.couleur} variant="light" radius="sm" tt="none" fw={600}>
                  {s.libelle}
                </Badge>
                {d.dateDepot && (
                  <div style={{ fontSize: 12, color: "var(--mantine-color-neutre-7)", marginTop: 4 }}>
                    le {dateLisible(d.dateDepot)}
                  </div>
                )}
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
