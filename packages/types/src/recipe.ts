import type { FermentableEntry, HopEntry, YeastEntry, MiscEntry } from "./ingredients";
import type { MashStep, FermentationStep } from "./mash";
import type { WaterAdjustment } from "./water";
import type { RecipeUnitOverrides } from "./units";
import type { BrewType } from "./brew_type";
import type { IbuFormula, ColorFormula, AbvFormula, MashPhFormula } from "./formulas";

export interface Recipe {
  id?: number;
  name: string;
  author: string;
  type: BrewType;
  style_id: number | null;
  equipment_id: number | null;
  water_profile_id: number | null;
  tags: string[];
  notes: string;

  fermentables: FermentableEntry[];
  hops: HopEntry[];
  yeast: YeastEntry[];
  misc: MiscEntry[];

  mash_schedule: MashStep[];
  fermentation_schedule: FermentationStep[];
  water_adjustments: WaterAdjustment;

  ibu_formula: IbuFormula;
  color_formula: ColorFormula;
  abv_formula: AbvFormula;
  mash_ph_formula: MashPhFormula;

  display_unit_overrides: RecipeUnitOverrides;

  created_at: Date;
  updated_at: Date;
}
