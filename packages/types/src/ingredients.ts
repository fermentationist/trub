// String literal union types for ingredient categories

export type FermentableType = "grain" | "sugar" | "extract" | "dry_extract" | "adjunct";
export type HopForm = "pellet" | "whole" | "plug";
export type HopUse = "boil" | "dry_hop" | "mash" | "first_wort" | "aroma" | "whirlpool";
export type YeastType = "ale" | "lager" | "wheat" | "wine" | "champagne";
export type YeastForm = "liquid" | "dry";
export type Flocculation = "low" | "medium" | "high" | "very_high";
export type MiscType = "spice" | "fining" | "water_agent" | "herb" | "flavor" | "other";
export type MiscUseStage = "boil" | "mash" | "primary" | "secondary" | "bottling";

// ---------------------------------------------------------------------------
// Ingredient DB types — rows in the ingredients table
// id is optional (auto-incremented by Dexie)
// custom: true for user-created rows, false for seed data
// category is the discriminator used in compound indexes
// ---------------------------------------------------------------------------

export interface Fermentable {
  id?: number;
  name: string;
  type: FermentableType;
  category: "fermentable";
  origin: string;
  color_lovibond: number;
  potential_ppg: number;
  yield_pct: number;
  diastatic_power: number;
  max_usage_pct: number;
  notes: string;
  custom: boolean;
}

export interface Hop {
  id?: number;
  name: string;
  type: "hop";
  category: "hop";
  origin: string;
  alpha_acid_pct: number;
  beta_acid_pct: number;
  form: HopForm;
  purpose: string;
  substitutes: string[];
  notes: string;
  custom: boolean;
}

export interface Yeast {
  id?: number;
  name: string;
  type: "yeast";
  category: "yeast";
  lab: string;
  product_code: string;
  yeast_type: YeastType;
  form: YeastForm;
  attenuation_min: number;
  attenuation_max: number;
  temp_min_c: number;
  temp_max_c: number;
  flocculation: Flocculation;
  notes: string;
  custom: boolean;
}

export interface MiscIngredient {
  id?: number;
  name: string;
  type: "misc";
  category: "misc";
  misc_type: MiscType;
  use_stage: MiscUseStage;
  notes: string;
  custom: boolean;
}

export type Ingredient = Fermentable | Hop | Yeast | MiscIngredient;

// ---------------------------------------------------------------------------
// Recipe entry types — snapshots embedded in recipe documents
// No id field (not DB rows), no custom flag.
// Amount fields use canonical units: weight in kg, time in minutes.
// ---------------------------------------------------------------------------

export interface FermentableEntry {
  name: string;
  type: FermentableType;
  origin: string;
  color_lovibond: number;
  potential_ppg: number;
  yield_pct: number;
  amount_kg: number;
  percentage: number;
  notes: string;
}

export interface HopEntry {
  name: string;
  origin: string;
  alpha_acid_pct: number;
  amount_kg: number;
  time_minutes: number;
  use: HopUse;
  form: HopForm;
  notes: string;
}

export interface YeastEntry {
  name: string;
  lab: string;
  product_code: string;
  attenuation_pct: number;
  temp_min_c: number;
  temp_max_c: number;
  flocculation: Flocculation;
  form: YeastForm;
  notes: string;
}

export interface MiscEntry {
  name: string;
  misc_type: MiscType;
  use_stage: MiscUseStage;
  amount_kg: number;
  time_minutes: number;
  notes: string;
}
