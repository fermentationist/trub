import { db } from "$lib/db";
import type { WaterProfile } from "@trub/types";

export const WaterProfileRepository = {
  async list(): Promise<WaterProfile[]> {
    return db.water_profiles.toArray();
  },

  async get_by_id(id: number): Promise<WaterProfile | void> {
    return (await db.water_profiles.get(id)) ?? void 0;
  },

  async get_default(): Promise<WaterProfile | void> {
    return (await db.water_profiles.where("is_default").equals(1).first()) ?? void 0;
  },

  async save(profile: WaterProfile): Promise<number> {
    return db.water_profiles.put(profile);
  },

  async set_default(id: number): Promise<void> {
    await db.transaction("rw", db.water_profiles, async () => {
      await db.water_profiles.toCollection().modify({ is_default: false });
      await db.water_profiles.update(id, { is_default: true });
    });
  },

  async delete(id: number): Promise<void> {
    return db.water_profiles.delete(id);
  },
};
