import type { WaterProfile, WaterAdjustment } from "@trub/types";

// ---------------------------------------------------------------------------
// Salt mineral contributions (ppm per gram per liter of water)
//
// Each salt dissolves into specific ions. These constants represent how many
// ppm of each ion are added per gram of salt per liter of water.
// Sources: Bru'n Water spreadsheet, Palmer's "How to Brew", Brewer's Friend.
// ---------------------------------------------------------------------------

interface MineralContribution {
  calcium: number;
  magnesium: number;
  sodium: number;
  sulfate: number;
  chloride: number;
  bicarbonate: number;
}

// Gypsum: CaSO₄·2H₂O — MW 172.17
const GYPSUM: MineralContribution = {
  calcium: 232.8,
  magnesium: 0,
  sodium: 0,
  sulfate: 558.0,
  chloride: 0,
  bicarbonate: 0,
};

// Calcium Chloride: CaCl₂·2H₂O — MW 147.01
const CALCIUM_CHLORIDE: MineralContribution = {
  calcium: 272.6,
  magnesium: 0,
  sodium: 0,
  sulfate: 0,
  chloride: 482.3,
  bicarbonate: 0,
};

// Epsom Salt: MgSO₄·7H₂O — MW 246.47
const EPSOM_SALT: MineralContribution = {
  calcium: 0,
  magnesium: 98.6,
  sodium: 0,
  sulfate: 389.7,
  chloride: 0,
  bicarbonate: 0,
};

// Baking Soda: NaHCO₃ — MW 84.01
const BAKING_SODA: MineralContribution = {
  calcium: 0,
  magnesium: 0,
  sodium: 274.0,
  sulfate: 0,
  chloride: 0,
  bicarbonate: 726.0,
};

// Chalk: CaCO₃ — MW 100.09 (limited solubility, but included for completeness)
const CHALK: MineralContribution = {
  calcium: 400.0,
  magnesium: 0,
  sodium: 0,
  sulfate: 0,
  chloride: 0,
  bicarbonate: 610.0,
};

// Table Salt: NaCl (non-iodized) — MW 58.44
const TABLE_SALT: MineralContribution = {
  calcium: 0,
  magnesium: 0,
  sodium: 393.4,
  sulfate: 0,
  chloride: 606.6,
  bicarbonate: 0,
};

// ---------------------------------------------------------------------------
// Calculate mineral contributions from salt additions
// ---------------------------------------------------------------------------

export interface MineralProfile {
  calcium_ppm: number;
  magnesium_ppm: number;
  sodium_ppm: number;
  sulfate_ppm: number;
  chloride_ppm: number;
  bicarbonate_ppm: number;
}

function salt_contribution(
  salt: MineralContribution,
  grams: number,
  volume_l: number,
): MineralProfile {
  if (volume_l <= 0 || grams <= 0) {
    return {
      calcium_ppm: 0,
      magnesium_ppm: 0,
      sodium_ppm: 0,
      sulfate_ppm: 0,
      chloride_ppm: 0,
      bicarbonate_ppm: 0,
    };
  }

  const factor = grams / volume_l;
  return {
    calcium_ppm: salt.calcium * factor,
    magnesium_ppm: salt.magnesium * factor,
    sodium_ppm: salt.sodium * factor,
    sulfate_ppm: salt.sulfate * factor,
    chloride_ppm: salt.chloride * factor,
    bicarbonate_ppm: salt.bicarbonate * factor,
  };
}

export function calculate_salt_contributions(
  adjustments: WaterAdjustment,
  volume_l: number,
): MineralProfile {
  const contributions = [
    salt_contribution(GYPSUM, adjustments.gypsum_g, volume_l),
    salt_contribution(CALCIUM_CHLORIDE, adjustments.calcium_chloride_g, volume_l),
    salt_contribution(EPSOM_SALT, adjustments.epsom_salt_g, volume_l),
    salt_contribution(BAKING_SODA, adjustments.baking_soda_g, volume_l),
    salt_contribution(CHALK, adjustments.chalk_g, volume_l),
    salt_contribution(TABLE_SALT, adjustments.table_salt_g, volume_l),
  ];

  return contributions.reduce(
    (sum, c) => ({
      calcium_ppm: sum.calcium_ppm + c.calcium_ppm,
      magnesium_ppm: sum.magnesium_ppm + c.magnesium_ppm,
      sodium_ppm: sum.sodium_ppm + c.sodium_ppm,
      sulfate_ppm: sum.sulfate_ppm + c.sulfate_ppm,
      chloride_ppm: sum.chloride_ppm + c.chloride_ppm,
      bicarbonate_ppm: sum.bicarbonate_ppm + c.bicarbonate_ppm,
    }),
    {
      calcium_ppm: 0,
      magnesium_ppm: 0,
      sodium_ppm: 0,
      sulfate_ppm: 0,
      chloride_ppm: 0,
      bicarbonate_ppm: 0,
    },
  );
}

// ---------------------------------------------------------------------------
// Resulting water profile (source + salt contributions)
// ---------------------------------------------------------------------------

export function calculate_resulting_profile(
  source: Pick<
    WaterProfile,
    | "calcium_ppm"
    | "magnesium_ppm"
    | "sodium_ppm"
    | "sulfate_ppm"
    | "chloride_ppm"
    | "bicarbonate_ppm"
  >,
  adjustments: WaterAdjustment,
  volume_l: number,
): MineralProfile {
  const additions = calculate_salt_contributions(adjustments, volume_l);

  return {
    calcium_ppm: source.calcium_ppm + additions.calcium_ppm,
    magnesium_ppm: source.magnesium_ppm + additions.magnesium_ppm,
    sodium_ppm: source.sodium_ppm + additions.sodium_ppm,
    sulfate_ppm: source.sulfate_ppm + additions.sulfate_ppm,
    chloride_ppm: source.chloride_ppm + additions.chloride_ppm,
    bicarbonate_ppm: source.bicarbonate_ppm + additions.bicarbonate_ppm,
  };
}

// ---------------------------------------------------------------------------
// Sulfate-to-chloride ratio
// ---------------------------------------------------------------------------

export function calculate_sulfate_chloride_ratio(
  sulfate_ppm: number,
  chloride_ppm: number,
): number {
  if (chloride_ppm <= 0) {
    return sulfate_ppm > 0 ? Infinity : 0;
  }
  return sulfate_ppm / chloride_ppm;
}

// Flavor balance descriptors based on ratio
export function describe_sulfate_chloride_ratio(ratio: number): string {
  if (ratio >= 2) {
    return "very hoppy/bitter";
  }
  if (ratio >= 1.5) {
    return "hoppy";
  }
  if (ratio >= 0.8) {
    return "balanced";
  }
  if (ratio >= 0.4) {
    return "malty";
  }
  return "very malty/sweet";
}
