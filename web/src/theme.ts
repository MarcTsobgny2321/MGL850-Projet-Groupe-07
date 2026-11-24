// Thème sobre : police du système, une seule couleur d'accent, peu d'arrondis
import { createTheme } from "@mantine/core";

const POLICE_SYSTEME =
  'system-ui, -apple-system, "Segoe UI", Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif';

export const theme = createTheme({
  fontFamily: POLICE_SYSTEME,
  headings: { fontFamily: POLICE_SYSTEME, fontWeight: "600" },
  primaryColor: "encre",
  primaryShade: 7,
  defaultRadius: "sm",
  colors: {
    // Bleu ardoise discret
    encre: ["#eef3f8", "#dbe4ee", "#b5c7db", "#8ca8c7", "#6a8db6", "#5480ab", "#4874a0", "#3a6189", "#2f5277", "#204263"],
  },
});
