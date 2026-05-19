import { db } from "$lib/db";
import type { Recipe } from "@trub/types";

export const RecipeRepository = {
  async get_by_id(id: number): Promise<Recipe | void> {
    return (await db.recipes.get(id)) ?? void 0;
  },

  async list(): Promise<Recipe[]> {
    return db.recipes.orderBy("updated_at").reverse().toArray();
  },

  async save(recipe: Recipe): Promise<number> {
    const to_save = {
      ...recipe,
      updated_at: new Date(),
      created_at: recipe.id === void 0 ? new Date() : recipe.created_at,
    };
    return db.recipes.put(to_save);
  },

  async delete(id: number): Promise<void> {
    return db.recipes.delete(id);
  },

  async duplicate(id: number): Promise<number | void> {
    const original = await db.recipes.get(id);
    if (!original) {
      return void 0;
    }
    const { id: _id, ...rest } = original;
    return db.recipes.add({
      ...rest,
      name: `${original.name} (copy)`,
      created_at: new Date(),
      updated_at: new Date(),
    } as Recipe);
  },

  async search(query: string): Promise<Recipe[]> {
    const lower = query.toLowerCase();
    return db.recipes.filter((r) => r.name.toLowerCase().includes(lower)).toArray();
  },
};
