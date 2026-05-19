// Unit string literal unions

export type BatchVolumeUnit = "gal" | "L";
export type SmallVolumeUnit = "mL" | "tsp" | "tbsp" | "fl_oz";
export type GrainWeightUnit = "lb_oz" | "kg";
export type HopWeightUnit = "oz" | "g";
export type MiscWeightUnit = "g" | "oz" | "tsp";
export type TemperatureUnit = "F" | "C";
export type GravityUnit = "SG" | "Plato";
export type ColorUnit = "SRM" | "EBC" | "Lovibond";
export type PressureUnit = "PSI" | "kPa" | "bar";
export type EvapRateUnit = "gal_per_hr" | "L_per_hr";

// Union of all unit category keys
export type UnitCategory =
  | "BATCH_VOLUME"
  | "SMALL_VOLUME"
  | "GRAIN_WEIGHT"
  | "HOP_WEIGHT"
  | "MISC_WEIGHT"
  | "TEMPERATURE"
  | "GRAVITY"
  | "COLOR"
  | "PRESSURE"
  | "EVAP_RATE";

// Maps each category to its corresponding unit type
export interface UnitPreferences {
  BATCH_VOLUME: BatchVolumeUnit;
  SMALL_VOLUME: SmallVolumeUnit;
  GRAIN_WEIGHT: GrainWeightUnit;
  HOP_WEIGHT: HopWeightUnit;
  MISC_WEIGHT: MiscWeightUnit;
  TEMPERATURE: TemperatureUnit;
  GRAVITY: GravityUnit;
  COLOR: ColorUnit;
  PRESSURE: PressureUnit;
  EVAP_RATE: EvapRateUnit;
}

// Per-recipe display unit overrides — any subset of UnitPreferences
export type RecipeUnitOverrides = Partial<UnitPreferences>;

// US-centric default display unit preferences
export const DEFAULT_UNIT_PREFERENCES: UnitPreferences = {
  BATCH_VOLUME: "gal",
  SMALL_VOLUME: "fl_oz",
  GRAIN_WEIGHT: "lb_oz",
  HOP_WEIGHT: "oz",
  MISC_WEIGHT: "oz",
  TEMPERATURE: "F",
  GRAVITY: "SG",
  COLOR: "SRM",
  PRESSURE: "PSI",
  EVAP_RATE: "gal_per_hr",
};

// Documents the canonical (storage) unit for each dimension — for reference only, not runtime use
export const CANONICAL_UNITS = {
  volume: "L",
  weight: "kg",
  temperature: "C",
  time: "min",
  color: "SRM",
  gravity: "SG",
  pressure: "kPa",
  evap_rate: "L_per_hr",
} as const;
