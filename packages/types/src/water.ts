export interface WaterProfile {
  id?: number;
  name: string;
  calcium_ppm: number;
  magnesium_ppm: number;
  sodium_ppm: number;
  sulfate_ppm: number;
  chloride_ppm: number;
  bicarbonate_ppm: number;
  is_default: boolean;
  custom: boolean;
}

export interface WaterAdjustment {
  gypsum_g: number;
  calcium_chloride_g: number;
  epsom_salt_g: number;
  baking_soda_g: number;
  chalk_g: number;
  table_salt_g: number;
  lactic_acid_ml: number;
  phosphoric_acid_ml: number;
  acidulated_malt_g: number;
}
