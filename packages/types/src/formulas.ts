export type IbuFormula = "tinseth" | "rager" | "mibu";
export type ColorFormula = "morey" | "daniels" | "mosher";
export type AbvFormula = "simple" | "alternate";
export type MashPhFormula = "brun_water" | "kaiser";

export interface FormulaDefaults {
  ibu: IbuFormula;
  color: ColorFormula;
  abv: AbvFormula;
  mash_ph: MashPhFormula;
}

export const DEFAULT_FORMULAS: FormulaDefaults = {
  ibu: "tinseth",
  color: "morey",
  abv: "simple",
  mash_ph: "brun_water",
};
