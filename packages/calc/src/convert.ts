import type { UnitCategory } from "@trub/types";
import {
  KG_TO_LB,
  LB_TO_KG,
  L_TO_GAL,
  GAL_TO_L,
  G_PER_KG,
  OZ_PER_KG,
  ML_PER_L,
  TSP_PER_ML,
  TBSP_PER_ML,
  FL_OZ_PER_ML,
  PSI_PER_KPA,
  BAR_PER_KPA,
} from "./constants";
import { srm_to_ebc, ebc_to_srm, srm_to_lovibond, lovibond_to_srm } from "./color";

// ---------------------------------------------------------------------------
// Gravity — SG ↔ Plato
// ---------------------------------------------------------------------------

/**
 * Convert specific gravity (SG) to degrees Plato using the standard polynomial.
 * Valid for typical homebrewing range (SG 1.000–1.120).
 */
export function sg_to_plato(sg: number): number {
  return (
    -616.868 +
    1111.14 * sg -
    630.272 * sg * sg +
    135.997 * sg * sg * sg
  );
}

/**
 * Convert degrees Plato to specific gravity.
 */
export function plato_to_sg(plato: number): number {
  return 1 + plato / (258.6 - (plato * 227.1) / 258.2);
}

// ---------------------------------------------------------------------------
// Temperature — °C ↔ °F
// ---------------------------------------------------------------------------

export function c_to_f(c: number): number {
  return c * (9 / 5) + 32;
}

export function f_to_c(f: number): number {
  return (f - 32) * (5 / 9);
}

// ---------------------------------------------------------------------------
// Canonical unit per UnitCategory
// All volumes are stored as L; all weights as kg; temperature as C; etc.
// ---------------------------------------------------------------------------

const CATEGORY_CANONICAL: Record<UnitCategory, string> = {
  BATCH_VOLUME: "L",
  SMALL_VOLUME: "L",
  GRAIN_WEIGHT: "kg",
  HOP_WEIGHT: "kg",
  MISC_WEIGHT: "kg",
  TEMPERATURE: "C",
  GRAVITY: "SG",
  COLOR: "SRM",
  PRESSURE: "kPa",
  EVAP_RATE: "L_per_hr",
};

// ---------------------------------------------------------------------------
// Supported units per category — the authoritative list of what convert_units
// can handle. UI layers should read this to build dropdowns, never hardcode.
// ---------------------------------------------------------------------------

export const SUPPORTED_UNITS: Record<UnitCategory, readonly string[]> = {
  BATCH_VOLUME: ["L", "gal"],
  SMALL_VOLUME: ["L", "mL", "tsp", "tbsp", "fl_oz"],
  GRAIN_WEIGHT: ["kg", "lb_oz"],
  HOP_WEIGHT: ["kg", "g", "oz"],
  MISC_WEIGHT: ["kg", "g", "oz"],
  TEMPERATURE: ["C", "F"],
  GRAVITY: ["SG", "Plato"],
  COLOR: ["SRM", "EBC", "Lovibond"],
  PRESSURE: ["kPa", "PSI", "bar"],
  EVAP_RATE: ["L_per_hr", "gal_per_hr"],
};

// ---------------------------------------------------------------------------
// convert_units
// ---------------------------------------------------------------------------

/**
 * Convert `value` from `from_unit` to `to_unit` within the given `category`.
 * Unit strings match the type literals defined in @trub/types/units.ts.
 *
 * For BATCH_VOLUME and SMALL_VOLUME the canonical storage unit is "L";
 * for GRAIN_WEIGHT, HOP_WEIGHT, and MISC_WEIGHT the canonical unit is "kg".
 * The "lb_oz" unit is treated as total decimal pounds (compound lb+oz display
 * is handled by the UnitValue component).
 * The "tsp" MiscWeightUnit uses the approximation 1 tsp ≈ 5 g (200 tsp/kg).
 */
export function convert_units(
  value: number,
  category: UnitCategory,
  from_unit: string,
  to_unit: string,
): number {
  if (from_unit === to_unit) {
    return value;
  }

  switch (category) {
    case "BATCH_VOLUME":
    case "SMALL_VOLUME":
      return convert_volume(value, from_unit, to_unit);

    case "GRAIN_WEIGHT":
      return convert_grain_weight(value, from_unit, to_unit);

    case "HOP_WEIGHT":
      return convert_hop_weight(value, from_unit, to_unit);

    case "MISC_WEIGHT":
      return convert_misc_weight(value, from_unit, to_unit);

    case "TEMPERATURE":
      return convert_temperature(value, from_unit, to_unit);

    case "GRAVITY":
      return convert_gravity(value, from_unit, to_unit);

    case "COLOR":
      return convert_color(value, from_unit, to_unit);

    case "PRESSURE":
      return convert_pressure(value, from_unit, to_unit);

    case "EVAP_RATE":
      return convert_evap_rate(value, from_unit, to_unit);
  }
}

// ---------------------------------------------------------------------------
// Convenience: from_canonical / to_canonical
// ---------------------------------------------------------------------------

/**
 * Convert `value` from the canonical storage unit for `category` to `to_unit`.
 * Example: from_canonical(19, "BATCH_VOLUME", "gal") → ~5.02
 */
export function from_canonical(
  value: number,
  category: UnitCategory,
  to_unit: string,
): number {
  const canonical = CATEGORY_CANONICAL[category];
  return convert_units(value, category, canonical, to_unit);
}

/**
 * Convert `value` from `from_unit` back to the canonical storage unit for `category`.
 * Example: to_canonical(5.02, "BATCH_VOLUME", "gal") → ~19
 */
export function to_canonical(
  value: number,
  category: UnitCategory,
  from_unit: string,
): number {
  const canonical = CATEGORY_CANONICAL[category];
  return convert_units(value, category, from_unit, canonical);
}

// ---------------------------------------------------------------------------
// Internal per-category converters
// All go through a canonical intermediate to keep the switch table small.
// ---------------------------------------------------------------------------

// Volume — canonical: L
// Supported: "L", "gal", "mL", "tsp", "tbsp", "fl_oz"
function convert_volume(value: number, from: string, to: string): number {
  const in_l = to_l(value, from);
  return from_l(in_l, to);
}

function to_l(value: number, unit: string): number {
  switch (unit) {
    case "L":
      return value;
    case "gal":
      return value * GAL_TO_L;
    case "mL":
      return value / ML_PER_L;
    case "tsp":
      return value / (TSP_PER_ML * ML_PER_L);
    case "tbsp":
      return value / (TBSP_PER_ML * ML_PER_L);
    case "fl_oz":
      return value / (FL_OZ_PER_ML * ML_PER_L);
    default:
      return value;
  }
}

function from_l(value_l: number, unit: string): number {
  switch (unit) {
    case "L":
      return value_l;
    case "gal":
      return value_l * L_TO_GAL;
    case "mL":
      return value_l * ML_PER_L;
    case "tsp":
      return value_l * ML_PER_L * TSP_PER_ML;
    case "tbsp":
      return value_l * ML_PER_L * TBSP_PER_ML;
    case "fl_oz":
      return value_l * ML_PER_L * FL_OZ_PER_ML;
    default:
      return value_l;
  }
}

// Grain weight — canonical: kg
// Supported: "kg", "lb_oz" (treated as decimal lb for conversion)
function convert_grain_weight(value: number, from: string, to: string): number {
  const in_kg = grain_to_kg(value, from);
  return grain_from_kg(in_kg, to);
}

function grain_to_kg(value: number, unit: string): number {
  switch (unit) {
    case "kg":
      return value;
    case "lb_oz":
      // lb_oz is decimal lb at the conversion level
      return value * LB_TO_KG;
    default:
      return value;
  }
}

function grain_from_kg(value_kg: number, unit: string): number {
  switch (unit) {
    case "kg":
      return value_kg;
    case "lb_oz":
      return value_kg * KG_TO_LB;
    default:
      return value_kg;
  }
}

// Hop weight — canonical: kg
// Supported: "kg", "g", "oz"
function convert_hop_weight(value: number, from: string, to: string): number {
  const in_kg = hop_to_kg(value, from);
  return hop_from_kg(in_kg, to);
}

function hop_to_kg(value: number, unit: string): number {
  switch (unit) {
    case "kg":
      return value;
    case "g":
      return value / G_PER_KG;
    case "oz":
      return value / OZ_PER_KG;
    default:
      return value;
  }
}

function hop_from_kg(value_kg: number, unit: string): number {
  switch (unit) {
    case "kg":
      return value_kg;
    case "g":
      return value_kg * G_PER_KG;
    case "oz":
      return value_kg * OZ_PER_KG;
    default:
      return value_kg;
  }
}

// Misc weight — canonical: kg
// Supported: "kg", "g", "oz"
function convert_misc_weight(value: number, from: string, to: string): number {
  const in_kg = misc_to_kg(value, from);
  return misc_from_kg(in_kg, to);
}

function misc_to_kg(value: number, unit: string): number {
  switch (unit) {
    case "kg":
      return value;
    case "g":
      return value / G_PER_KG;
    case "oz":
      return value / OZ_PER_KG;
    default:
      return value;
  }
}

function misc_from_kg(value_kg: number, unit: string): number {
  switch (unit) {
    case "kg":
      return value_kg;
    case "g":
      return value_kg * G_PER_KG;
    case "oz":
      return value_kg * OZ_PER_KG;
    default:
      return value_kg;
  }
}

// Temperature — canonical: C
function convert_temperature(value: number, from: string, to: string): number {
  if (from === "C" && to === "F") {
    return c_to_f(value);
  }
  if (from === "F" && to === "C") {
    return f_to_c(value);
  }
  return value;
}

// Gravity — canonical: SG
function convert_gravity(value: number, from: string, to: string): number {
  if (from === "SG" && to === "Plato") {
    return sg_to_plato(value);
  }
  if (from === "Plato" && to === "SG") {
    return plato_to_sg(value);
  }
  return value;
}

// Color — canonical: SRM
// Uses the existing srm/ebc/lovibond converters from color.ts
function convert_color(value: number, from: string, to: string): number {
  const in_srm = color_to_srm(value, from);
  return color_from_srm(in_srm, to);
}

function color_to_srm(value: number, unit: string): number {
  switch (unit) {
    case "SRM":
      return value;
    case "EBC":
      return ebc_to_srm(value);
    case "Lovibond":
      return lovibond_to_srm(value);
    default:
      return value;
  }
}

function color_from_srm(value_srm: number, unit: string): number {
  switch (unit) {
    case "SRM":
      return value_srm;
    case "EBC":
      return srm_to_ebc(value_srm);
    case "Lovibond":
      return srm_to_lovibond(value_srm);
    default:
      return value_srm;
  }
}

// Pressure — canonical: kPa
function convert_pressure(value: number, from: string, to: string): number {
  const in_kpa = pressure_to_kpa(value, from);
  return pressure_from_kpa(in_kpa, to);
}

function pressure_to_kpa(value: number, unit: string): number {
  switch (unit) {
    case "kPa":
      return value;
    case "PSI":
      return value / PSI_PER_KPA;
    case "bar":
      return value / BAR_PER_KPA;
    default:
      return value;
  }
}

function pressure_from_kpa(value_kpa: number, unit: string): number {
  switch (unit) {
    case "kPa":
      return value_kpa;
    case "PSI":
      return value_kpa * PSI_PER_KPA;
    case "bar":
      return value_kpa * BAR_PER_KPA;
    default:
      return value_kpa;
  }
}

// Evaporation rate — canonical: L_per_hr
function convert_evap_rate(value: number, from: string, to: string): number {
  if (from === "L_per_hr" && to === "gal_per_hr") {
    return value * L_TO_GAL;
  }
  if (from === "gal_per_hr" && to === "L_per_hr") {
    return value * GAL_TO_L;
  }
  return value;
}
