// Génère les 10 nuances attendues par Mantine (0 très clair, 9 très foncé) à partir d'une couleur de base
import { MantineColorsTuple } from "@mantine/core";

type Rgb = [number, number, number];

const versRgb = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const versHex = (rgb: Rgb) => "#" + rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");

// Mélange la couleur avec une autre (blanc ou noir) selon une proportion de 0 à 1
const melanger = (a: Rgb, b: Rgb, part: number): Rgb => a.map((c, i) => c + (b[i] - c) * part) as Rgb;

const BLANC: Rgb = [255, 255, 255];
const NOIR: Rgb = [0, 0, 0];
const VERS_BLANC = [0.93, 0.84, 0.68, 0.5, 0.3, 0.12]; // nuances 0 à 5
const VERS_NOIR = [0.14, 0.28, 0.42]; // nuances 7 à 9

export function palette(base: string): MantineColorsTuple {
  const rgb = versRgb(base);
  return [
    ...VERS_BLANC.map((p) => versHex(melanger(rgb, BLANC, p))),
    base,
    ...VERS_NOIR.map((p) => versHex(melanger(rgb, NOIR, p))),
  ] as unknown as MantineColorsTuple;
}
