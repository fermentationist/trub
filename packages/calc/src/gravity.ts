import type { FermentableEntry } from "@trub/types";
import { KG_TO_LB, L_TO_GAL } from "./constants";

const EXTRACT_TYPES = new Set(["sugar", "extract", "dry_extract"]);

export function calculate_og(
  fermentables: Pick<FermentableEntry, "amount_kg" | "potential_ppg" | "type">[],
  batch_size_l: number,
  efficiency_pct: number,
): number {
  if (fermentables.length === 0 || batch_size_l <= 0) {
    return 1.0;
  }

  const batch_size_gal = batch_size_l * L_TO_GAL;

  const total_points = fermentables.reduce((sum, f) => {
    const weight_lb = f.amount_kg * KG_TO_LB;
    const efficiency = EXTRACT_TYPES.has(f.type) ? 1 : efficiency_pct / 100;
    return sum + f.potential_ppg * weight_lb * efficiency;
  }, 0);

  return 1 + total_points / batch_size_gal / 1000;
}

export function calculate_fg(og: number, attenuation_pct: number): number {
  return og - (og - 1) * (attenuation_pct / 100);
}

export function calculate_abv_simple(og: number, fg: number): number {
  return (og - fg) * 131.25;
}

export function calculate_abv_alternate(og: number, fg: number): number {
  return (76.08 * (og - fg)) / (1.775 - og) * (fg / 0.794);
}
