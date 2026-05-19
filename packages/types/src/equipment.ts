export interface EquipmentProfile {
  id?: number;
  name: string;
  batch_size_l: number;
  boil_size_l: number;
  boil_time_min: number;
  efficiency_pct: number;
  evap_rate_l_per_hr: number;
  trub_chiller_loss_l: number;
  mash_tun_dead_space_l: number;
  mash_tun_thermal_mass: number;
  mash_thickness_l_per_kg: number;
  is_default: boolean;
}
