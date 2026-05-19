import type { FermentableEntry } from "@trub/types";
import type { MineralProfile } from "./water";

// ---------------------------------------------------------------------------
// Mash pH estimation
//
// Two models are implemented:
//   1. Bru'n Water (default) — uses grain color to estimate buffering capacity
//   2. Kaiser — similar approach with different coefficients
//
// Both models follow the same general structure:
//   - Calculate the distilled-water pH of the grain bill
//   - Adjust for water alkalinity (residual alkalinity)
//   - Adjust for acid additions
//
// These are simplified versions suitable for homebrewing. Commercial breweries
// use more sophisticated lab-based models.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared constants and helpers
// ---------------------------------------------------------------------------

// Distilled water pH for grain (base malt)
const BASE_MALT_DI_PH = 5.72;

// Grain color-to-acidity coefficient (how much darker grains lower pH)
// Each degree Lovibond above the base adds this much acidity
const BRUN_WATER_COLOR_COEFFICIENT = 0.01;
const KAISER_COLOR_COEFFICIENT = 0.012;

// Base malt reference Lovibond (pale 2-row)
const BASE_MALT_LOVIBOND = 1.8;

// Residual alkalinity coefficient (how bicarbonate raises mash pH)
// Based on Kolbach's residual alkalinity formula:
// RA = Alkalinity - (Ca/1.4) - (Mg/1.7)
// where alkalinity ≈ bicarbonate * 50 / 61
const ALKALINITY_PH_FACTOR = 0.00168;

// Acid addition constants
// Lactic acid (88% concentration): mEq/mL
const LACTIC_ACID_STRENGTH = 11.46;
// Phosphoric acid (10% concentration): mEq/mL
const PHOSPHORIC_ACID_STRENGTH = 1.53;
// Acidulated malt: effective mEq/g (approximately 3% lactic acid by weight)
const ACIDULATED_MALT_STRENGTH = 0.344;

// mEq needed to shift pH by 1 unit per liter of mash water
const ACID_PH_FACTOR = 0.05;

// ---------------------------------------------------------------------------
// Residual alkalinity
// ---------------------------------------------------------------------------

export function calculate_residual_alkalinity(
  profile: Pick<MineralProfile, "calcium_ppm" | "magnesium_ppm" | "bicarbonate_ppm">,
): number {
  const alkalinity = profile.bicarbonate_ppm * 50 / 61;
  return alkalinity - (profile.calcium_ppm / 1.4) - (profile.magnesium_ppm / 1.7);
}

// ---------------------------------------------------------------------------
// Grain bill weighted average color
// ---------------------------------------------------------------------------

function weighted_average_color(
  fermentables: Pick<FermentableEntry, "amount_kg" | "color_lovibond">[],
): number {
  const total_weight = fermentables.reduce((sum, f) => sum + f.amount_kg, 0);
  if (total_weight <= 0) {
    return BASE_MALT_LOVIBOND;
  }
  return (
    fermentables.reduce(
      (sum, f) => sum + f.color_lovibond * f.amount_kg,
      0,
    ) / total_weight
  );
}

// ---------------------------------------------------------------------------
// Acid contribution to pH shift
// ---------------------------------------------------------------------------

function acid_ph_shift(
  lactic_acid_ml: number,
  phosphoric_acid_ml: number,
  acidulated_malt_g: number,
  mash_volume_l: number,
): number {
  if (mash_volume_l <= 0) {
    return 0;
  }

  const total_meq =
    lactic_acid_ml * LACTIC_ACID_STRENGTH +
    phosphoric_acid_ml * PHOSPHORIC_ACID_STRENGTH +
    acidulated_malt_g * ACIDULATED_MALT_STRENGTH;

  return -(total_meq / mash_volume_l) * ACID_PH_FACTOR;
}

// ---------------------------------------------------------------------------
// Bru'n Water model (default)
// ---------------------------------------------------------------------------

export function calculate_mash_ph_brun_water(
  fermentables: Pick<FermentableEntry, "amount_kg" | "color_lovibond">[],
  water_profile: Pick<MineralProfile, "calcium_ppm" | "magnesium_ppm" | "bicarbonate_ppm">,
  mash_volume_l: number,
  lactic_acid_ml: number,
  phosphoric_acid_ml: number,
  acidulated_malt_g: number,
): number {
  if (fermentables.length === 0 || mash_volume_l <= 0) {
    return BASE_MALT_DI_PH;
  }

  const avg_color = weighted_average_color(fermentables);
  const color_delta = avg_color - BASE_MALT_LOVIBOND;

  // Grain bill pH contribution (darker grains lower pH)
  const grain_ph = BASE_MALT_DI_PH - color_delta * BRUN_WATER_COLOR_COEFFICIENT;

  // Water alkalinity contribution (higher RA raises pH)
  const ra = calculate_residual_alkalinity(water_profile);
  const water_ph_shift = ra * ALKALINITY_PH_FACTOR;

  // Acid additions lower pH
  const acid_shift = acid_ph_shift(
    lactic_acid_ml,
    phosphoric_acid_ml,
    acidulated_malt_g,
    mash_volume_l,
  );

  return grain_ph + water_ph_shift + acid_shift;
}

// ---------------------------------------------------------------------------
// Kaiser model
// Uses a higher color coefficient, producing slightly different estimates.
// ---------------------------------------------------------------------------

export function calculate_mash_ph_kaiser(
  fermentables: Pick<FermentableEntry, "amount_kg" | "color_lovibond">[],
  water_profile: Pick<MineralProfile, "calcium_ppm" | "magnesium_ppm" | "bicarbonate_ppm">,
  mash_volume_l: number,
  lactic_acid_ml: number,
  phosphoric_acid_ml: number,
  acidulated_malt_g: number,
): number {
  if (fermentables.length === 0 || mash_volume_l <= 0) {
    return BASE_MALT_DI_PH;
  }

  const avg_color = weighted_average_color(fermentables);
  const color_delta = avg_color - BASE_MALT_LOVIBOND;

  // Kaiser uses a higher color coefficient
  const grain_ph = BASE_MALT_DI_PH - color_delta * KAISER_COLOR_COEFFICIENT;

  const ra = calculate_residual_alkalinity(water_profile);
  const water_ph_shift = ra * ALKALINITY_PH_FACTOR;

  const acid_shift = acid_ph_shift(
    lactic_acid_ml,
    phosphoric_acid_ml,
    acidulated_malt_g,
    mash_volume_l,
  );

  return grain_ph + water_ph_shift + acid_shift;
}
