import { db } from "$lib/db";
import type { StyleGuideline } from "@trub/types";

export const StyleRepository = {
  async list(): Promise<StyleGuideline[]> {
    return db.style_guidelines.orderBy("name").toArray();
  },

  async get_by_id(id: number): Promise<StyleGuideline | void> {
    return (await db.style_guidelines.get(id)) ?? void 0;
  },

  async search(query: string): Promise<StyleGuideline[]> {
    const lower = query.toLowerCase();
    return db.style_guidelines
      .filter(
        (s) => s.name.toLowerCase().includes(lower) || s.category.toLowerCase().includes(lower)
      )
      .toArray();
  },
};
