import { db } from "$lib/db";
import type { EquipmentProfile } from "@trub/types";

export const EquipmentRepository = {
  async list(): Promise<EquipmentProfile[]> {
    return db.equipment_profiles.toArray();
  },

  async get_by_id(id: number): Promise<EquipmentProfile | void> {
    return (await db.equipment_profiles.get(id)) ?? void 0;
  },

  async get_default(): Promise<EquipmentProfile | void> {
    return (await db.equipment_profiles.where("is_default").equals(1).first()) ?? void 0;
  },

  async save(profile: EquipmentProfile): Promise<number> {
    return db.equipment_profiles.put(profile);
  },

  async set_default(id: number): Promise<void> {
    await db.transaction("rw", db.equipment_profiles, async () => {
      await db.equipment_profiles.toCollection().modify({ is_default: false });
      await db.equipment_profiles.update(id, { is_default: true });
    });
  },

  async delete(id: number): Promise<void> {
    return db.equipment_profiles.delete(id);
  },
};
