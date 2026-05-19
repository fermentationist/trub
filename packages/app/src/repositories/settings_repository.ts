import { db } from "$lib/db";
import type { AppSettings } from "@trub/types";

export const SettingsRepository = {
  async get<T = unknown>(key: string): Promise<T | void> {
    const row = await db.settings.get(key);
    return row ? (row.value as T) : void 0;
  },

  async set(key: string, value: unknown): Promise<void> {
    await db.settings.put({ key, value } as AppSettings);
  },

  async delete(key: string): Promise<void> {
    return db.settings.delete(key);
  },
};
