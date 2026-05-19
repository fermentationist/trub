import { db } from "$lib/db";
import type { Ingredient } from "@trub/types";

export const IngredientRepository = {
  async get_by_id(id: number): Promise<Ingredient | void> {
    return (await db.ingredients.get(id)) ?? void 0;
  },

  async list_by_category(category: string): Promise<Ingredient[]> {
    return db.ingredients.where("category").equals(category).toArray();
  },

  async search(query: string, category?: string): Promise<Ingredient[]> {
    const lower = query.toLowerCase();
    const collection = category
      ? db.ingredients.where("category").equals(category)
      : db.ingredients.toCollection();
    return collection.filter((i) => i.name.toLowerCase().includes(lower)).toArray();
  },

  async save(ingredient: Ingredient): Promise<number> {
    return db.ingredients.put(ingredient);
  },

  async delete(id: number): Promise<void> {
    return db.ingredients.delete(id);
  },
};
