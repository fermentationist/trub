export type MashStepType = "infusion" | "decoction" | "temperature";

export interface MashStep {
  name: string;
  type: MashStepType;
  target_temp_c: number;
  time_minutes: number;
  water_amount_l: number;
}

export interface FermentationStep {
  name: string;
  temp_c: number;
  duration_days: number;
}
