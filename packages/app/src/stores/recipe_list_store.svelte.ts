import type { Recipe } from "@trub/types";
import { RecipeRepository } from "../repositories/recipe_repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortField = "updated_at" | "created_at" | "name";
export type SortDirection = "asc" | "desc";

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

function apply_sort(
  list: Recipe[],
  field: SortField,
  direction: SortDirection,
): Recipe[] {
  const sorted = [...list].sort((a, b) => {
    if (field === "name") {
      const cmp = a.name.localeCompare(b.name);
      return direction === "asc" ? cmp : -cmp;
    }

    // Date fields
    const a_time = a[field].getTime();
    const b_time = b[field].getTime();
    const cmp = a_time - b_time;
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}

// ---------------------------------------------------------------------------
// Reactive state
// ---------------------------------------------------------------------------

let recipes = $state<Recipe[]>([]);
let is_loading = $state(false);
let search_query = $state("");
let sort_by = $state<SortField>("updated_at");
let sort_direction = $state<SortDirection>("desc");

// ---------------------------------------------------------------------------
// Public store
// ---------------------------------------------------------------------------

export const recipe_list_store = {
  get recipes(): Recipe[] {
    return recipes;
  },
  get is_loading(): boolean {
    return is_loading;
  },
  get search_query(): string {
    return search_query;
  },
  get sort_by(): SortField {
    return sort_by;
  },
  get sort_direction(): SortDirection {
    return sort_direction;
  },

  // -------------------------------------------------------------------------
  // Load all recipes from the repository
  // -------------------------------------------------------------------------

  async load(): Promise<void> {
    is_loading = true;
    try {
      const result = await RecipeRepository.list();
      recipes = apply_sort(result, sort_by, sort_direction);
    } finally {
      is_loading = false;
    }
  },

  // -------------------------------------------------------------------------
  // Search — filters by name via repository, then applies current sort
  // -------------------------------------------------------------------------

  async search(query: string): Promise<void> {
    search_query = query;
    is_loading = true;
    try {
      const result =
        query.trim() === ""
          ? await RecipeRepository.list()
          : await RecipeRepository.search(query);
      recipes = apply_sort(result, sort_by, sort_direction);
    } finally {
      is_loading = false;
    }
  },

  // -------------------------------------------------------------------------
  // Update sort state and re-sort the in-memory list
  // -------------------------------------------------------------------------

  set_sort(field: SortField, direction: SortDirection): void {
    sort_by = field;
    sort_direction = direction;
    recipes = apply_sort(recipes, field, direction);
  },

  // -------------------------------------------------------------------------
  // Delete a recipe by ID, then reload
  // -------------------------------------------------------------------------

  async delete_recipe(id: number): Promise<void> {
    await RecipeRepository.delete(id);
    await this.load();
  },

  // -------------------------------------------------------------------------
  // Duplicate a recipe by ID, then reload; returns the new recipe's ID
  // -------------------------------------------------------------------------

  async duplicate_recipe(id: number): Promise<number | void> {
    const new_id = await RecipeRepository.duplicate(id);
    await this.load();
    return new_id;
  },
};
