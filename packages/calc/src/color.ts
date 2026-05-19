import type { FermentableEntry } from "@trub/types";
import { KG_TO_LB, L_TO_GAL } from "./constants";

// ---------------------------------------------------------------------------
// MCU (Malt Color Units) — shared input to all SRM formulas
// ---------------------------------------------------------------------------

export function calculate_mcu(
  fermentables: Pick<FermentableEntry, "amount_kg" | "color_lovibond">[],
  batch_size_l: number,
): number {
  if (fermentables.length === 0 || batch_size_l <= 0) {
    return 0;
  }

  const batch_gal = batch_size_l * L_TO_GAL;

  return fermentables.reduce((sum, f) => {
    const weight_lb = f.amount_kg * KG_TO_LB;
    return sum + (f.color_lovibond * weight_lb) / batch_gal;
  }, 0);
}

// ---------------------------------------------------------------------------
// Morey (default) — SRM = 1.4922 × MCU^0.6859
// ---------------------------------------------------------------------------

export function calculate_srm_morey(
  fermentables: Pick<FermentableEntry, "amount_kg" | "color_lovibond">[],
  batch_size_l: number,
): number {
  const mcu = calculate_mcu(fermentables, batch_size_l);
  if (mcu <= 0) {
    return 0;
  }
  return 1.4922 * Math.pow(mcu, 0.6859);
}

// ---------------------------------------------------------------------------
// Daniels — linear approximation
// SRM = 0.2 × MCU + 8.4  (MCU > 10)
// SRM = 0.3 × MCU + 4.7  (MCU ≤ 10)  — Daniels uses Mosher's low-MCU line
// ---------------------------------------------------------------------------

export function calculate_srm_daniels(
  fermentables: Pick<FermentableEntry, "amount_kg" | "color_lovibond">[],
  batch_size_l: number,
): number {
  const mcu = calculate_mcu(fermentables, batch_size_l);
  if (mcu <= 0) {
    return 0;
  }
  if (mcu > 10) {
    return 0.2 * mcu + 8.4;
  }
  return 0.3 * mcu + 4.7;
}

// ---------------------------------------------------------------------------
// Mosher — linear approximation
// SRM = 0.3 × MCU + 4.7  (full range)
// ---------------------------------------------------------------------------

export function calculate_srm_mosher(
  fermentables: Pick<FermentableEntry, "amount_kg" | "color_lovibond">[],
  batch_size_l: number,
): number {
  const mcu = calculate_mcu(fermentables, batch_size_l);
  if (mcu <= 0) {
    return 0;
  }
  return 0.3 * mcu + 4.7;
}

// ---------------------------------------------------------------------------
// Color unit conversions (non-linear — cannot use `convert` package)
// ---------------------------------------------------------------------------

export function srm_to_ebc(srm: number): number {
  return srm * 1.97;
}

export function ebc_to_srm(ebc: number): number {
  return ebc / 1.97;
}

export function srm_to_lovibond(srm: number): number {
  return (srm + 0.76) / 1.3546;
}

export function lovibond_to_srm(lovibond: number): number {
  return 1.3546 * lovibond - 0.76;
}

// ---------------------------------------------------------------------------
// SRM to approximate CSS color for preview rendering
// Uses the widely-published SRM-to-RGB mapping table.
// ---------------------------------------------------------------------------

const SRM_COLORS: [number, string][] = [
  [0, "#FFE699"],
  [1, "#FFD878"],
  [2, "#FFCA5A"],
  [3, "#FFBF42"],
  [4, "#FBB123"],
  [5, "#F8A600"],
  [6, "#F39C00"],
  [7, "#EA8F00"],
  [8, "#E58500"],
  [9, "#DE7C00"],
  [10, "#D77200"],
  [11, "#CF6900"],
  [12, "#CB6200"],
  [13, "#C35900"],
  [14, "#BB5100"],
  [15, "#B54C00"],
  [16, "#AE4700"],
  [17, "#A63E00"],
  [18, "#A13700"],
  [19, "#9B3200"],
  [20, "#952D00"],
  [21, "#8E2900"],
  [22, "#882300"],
  [23, "#821E00"],
  [24, "#7B1A00"],
  [25, "#761700"],
  [26, "#701400"],
  [27, "#6A0E00"],
  [28, "#660D00"],
  [29, "#5E0B00"],
  [30, "#5A0A02"],
  [35, "#470606"],
  [40, "#340405"],
  [45, "#260304"],
  [50, "#200204"],
  [55, "#190203"],
  [60, "#120102"],
  [70, "#0A0102"],
  [80, "#050101"],
];

export function srm_to_css_color(srm: number): string {
  if (srm <= 0) {
    return SRM_COLORS[0]![1];
  }

  for (let i = SRM_COLORS.length - 1; i >= 0; i--) {
    if (srm >= SRM_COLORS[i]![0]) {
      return SRM_COLORS[i]![1];
    }
  }

  return SRM_COLORS[0]![1];
}
