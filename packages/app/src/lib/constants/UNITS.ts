import type { UnitCategory, UnitPreferences } from "@trub/types";
import { SUPPORTED_UNITS } from "@trub/calc";

// ---------------------------------------------------------------------------
// Display metadata for unit strings — labels and suffixes for the UI.
// The set of units per category comes from @trub/calc's SUPPORTED_UNITS;
// this map only adds human-readable text.
// ---------------------------------------------------------------------------

const UNIT_DISPLAY: Record<string, { label: string; suffix: string }> = {
  // Volume
  L: { label: "Liters", suffix: "L" },
  gal: { label: "Gallons", suffix: "gal" },
  mL: { label: "Milliliters", suffix: "mL" },
  tsp: { label: "Teaspoons", suffix: "tsp" },
  tbsp: { label: "Tablespoons", suffix: "tbsp" },
  fl_oz: { label: "Fluid Ounces", suffix: "fl oz" },
  // Weight
  kg: { label: "Kilograms", suffix: "kg" },
  lb_oz: { label: "Pounds & Ounces", suffix: "lb" },
  g: { label: "Grams", suffix: "g" },
  oz: { label: "Ounces", suffix: "oz" },
  // Temperature
  C: { label: "Celsius", suffix: "°C" },
  F: { label: "Fahrenheit", suffix: "°F" },
  // Gravity
  SG: { label: "Specific Gravity", suffix: "" },
  Plato: { label: "Degrees Plato", suffix: "°P" },
  // Color
  SRM: { label: "SRM", suffix: "SRM" },
  EBC: { label: "EBC", suffix: "EBC" },
  Lovibond: { label: "Lovibond", suffix: "°L" },
  // Pressure
  PSI: { label: "PSI", suffix: "PSI" },
  kPa: { label: "Kilopascals", suffix: "kPa" },
  bar: { label: "Bar", suffix: "bar" },
  // Evaporation rate
  gal_per_hr: { label: "Gallons/hr", suffix: "gal/hr" },
  L_per_hr: { label: "Liters/hr", suffix: "L/hr" },
};

// ---------------------------------------------------------------------------
// UnitOption — derived from SUPPORTED_UNITS + display metadata
// ---------------------------------------------------------------------------

export interface UnitOption {
  value: string;
  label: string;
  suffix: string;
}

function build_options(category: UnitCategory): UnitOption[] {
  return SUPPORTED_UNITS[category].map((unit) => {
    const display = UNIT_DISPLAY[unit];
    return {
      value: unit,
      label: display?.label ?? unit,
      suffix: display?.suffix ?? unit,
    };
  });
}

export const UNIT_OPTIONS: Record<UnitCategory, UnitOption[]> = {
  BATCH_VOLUME: build_options("BATCH_VOLUME"),
  SMALL_VOLUME: build_options("SMALL_VOLUME"),
  GRAIN_WEIGHT: build_options("GRAIN_WEIGHT"),
  HOP_WEIGHT: build_options("HOP_WEIGHT"),
  MISC_WEIGHT: build_options("MISC_WEIGHT"),
  TEMPERATURE: build_options("TEMPERATURE"),
  GRAVITY: build_options("GRAVITY"),
  COLOR: build_options("COLOR"),
  PRESSURE: build_options("PRESSURE"),
  EVAP_RATE: build_options("EVAP_RATE"),
};

// ---------------------------------------------------------------------------
// Look up the display suffix for a given unit value
// ---------------------------------------------------------------------------

export function get_unit_suffix(category: UnitCategory, unit: string): string {
  const option = UNIT_OPTIONS[category].find((o) => o.value === unit);
  return option?.suffix ?? unit;
}

// ---------------------------------------------------------------------------
// Resolve the effective display unit: per-recipe override > user pref > default
// ---------------------------------------------------------------------------

export function resolve_display_unit(
  category: UnitCategory,
  user_prefs: UnitPreferences,
  recipe_overrides?: Partial<UnitPreferences>,
): string {
  if (recipe_overrides && category in recipe_overrides) {
    return recipe_overrides[category] as string;
  }
  return user_prefs[category];
}

// ---------------------------------------------------------------------------
// Default decimal places per category for display formatting
// ---------------------------------------------------------------------------

export const DEFAULT_PRECISION: Record<UnitCategory, number> = {
  BATCH_VOLUME: 2,
  SMALL_VOLUME: 1,
  GRAIN_WEIGHT: 3,
  HOP_WEIGHT: 1,
  MISC_WEIGHT: 1,
  TEMPERATURE: 1,
  GRAVITY: 3,
  COLOR: 1,
  PRESSURE: 1,
  EVAP_RATE: 2,
};
