import type { EquipmentProfile } from "@trub/types";
import { EquipmentRepository } from "../repositories/equipment_repository";

// ---------------------------------------------------------------------------
// Fallback constants
// ---------------------------------------------------------------------------

const DEFAULT_BATCH_SIZE_L = 18.93; // 5 US gallons
const DEFAULT_EFFICIENCY_PCT = 72;

// ---------------------------------------------------------------------------
// Reactive state
// ---------------------------------------------------------------------------

let profiles = $state<EquipmentProfile[]>([]);
let default_profile = $state<EquipmentProfile | null>(null);
let is_loaded = $state(false);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function find_in_memory(equipment_id: number): EquipmentProfile | void {
  return profiles.find((p) => p.id === equipment_id) ?? void 0;
}

// ---------------------------------------------------------------------------
// Public store
// ---------------------------------------------------------------------------

export const equipment_store = {
  get profiles(): EquipmentProfile[] {
    return profiles;
  },
  get default_profile(): EquipmentProfile | null {
    return default_profile;
  },
  get is_loaded(): boolean {
    return is_loaded;
  },

  // -------------------------------------------------------------------------
  // Fetch all profiles and the default profile from the repository
  // -------------------------------------------------------------------------

  async load(): Promise<void> {
    const [all_profiles, found_default] = await Promise.all([
      EquipmentRepository.list(),
      EquipmentRepository.get_default(),
    ]);

    profiles = all_profiles;
    default_profile = found_default ?? null;
    is_loaded = true;
  },

  // -------------------------------------------------------------------------
  // Return the profile matching equipment_id, falling back to the default
  // profile, then to a repository lookup, then to null
  // -------------------------------------------------------------------------

  async get_profile_for_recipe(
    equipment_id: number | null,
  ): Promise<EquipmentProfile | null> {
    if (equipment_id === null) {
      return default_profile;
    }

    const in_memory = find_in_memory(equipment_id);
    if (in_memory !== void 0) {
      return in_memory;
    }

    const from_repo = await EquipmentRepository.get_by_id(equipment_id);
    return from_repo ?? null;
  },

  // -------------------------------------------------------------------------
  // Return batch_size_l for the resolved profile, or the 5-gal fallback
  // -------------------------------------------------------------------------

  async get_batch_size(equipment_id: number | null): Promise<number> {
    const profile = await this.get_profile_for_recipe(equipment_id);
    return profile?.batch_size_l ?? DEFAULT_BATCH_SIZE_L;
  },

  // -------------------------------------------------------------------------
  // Return efficiency_pct for the resolved profile, or the 72% fallback
  // -------------------------------------------------------------------------

  async get_efficiency(equipment_id: number | null): Promise<number> {
    const profile = await this.get_profile_for_recipe(equipment_id);
    return profile?.efficiency_pct ?? DEFAULT_EFFICIENCY_PCT;
  },
};
