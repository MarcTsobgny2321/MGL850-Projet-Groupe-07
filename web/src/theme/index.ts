// Thème Mantine : police du système et palettes générées depuis couleurs.ts
import { createTheme, MantineColorsTuple } from "@mantine/core";
import { COULEURS, RoleCouleur } from "./couleurs";
import { palette } from "./palette";

const POLICE_SYSTEME =
  'system-ui, -apple-system, "Segoe UI", Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif';

const palettes = Object.fromEntries(
  Object.entries(COULEURS).map(([role, base]) => [role, palette(base)]),
) as Record<RoleCouleur, MantineColorsTuple>;

export const theme = createTheme({
  fontFamily: POLICE_SYSTEME,
  headings: { fontFamily: POLICE_SYSTEME, fontWeight: "600" },
  colors: palettes,
  primaryColor: "primaire",
  primaryShade: 6,
  defaultRadius: "md",
});

export type { RoleCouleur };
