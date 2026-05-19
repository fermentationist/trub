import type {
  Recipe,
  FermentableEntry,
  HopEntry,
  YeastEntry,
  MiscEntry,
} from "@trub/types";
import { DEFAULT_FORMULAS } from "@trub/types";
import { RecipeRepository } from "../repositories/recipe_repository";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_HISTORY = 50;
const AUTO_SAVE_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Default recipe factory
// ---------------------------------------------------------------------------

function create_default_recipe(): Recipe {
  const now = new Date();
  return {
    name: "New Recipe",
    author: "",
    type: "all_grain",
    style_id: null,
    equipment_id: null,
    water_profile_id: null,
    tags: [],
    notes: "",
    fermentables: [],
    hops: [],
    yeast: [],
    misc: [],
    mash_schedule: [],
    fermentation_schedule: [],
    water_adjustments: {
      gypsum_g: 0,
      calcium_chloride_g: 0,
      epsom_salt_g: 0,
      baking_soda_g: 0,
      chalk_g: 0,
      table_salt_g: 0,
      lactic_acid_ml: 0,
      phosphoric_acid_ml: 0,
      acidulated_malt_g: 0,
    },
    ibu_formula: DEFAULT_FORMULAS.ibu,
    color_formula: DEFAULT_FORMULAS.color,
    abv_formula: DEFAULT_FORMULAS.abv,
    mash_ph_formula: DEFAULT_FORMULAS.mash_ph,
    display_unit_overrides: {},
    created_at: now,
    updated_at: now,
  };
}

// ---------------------------------------------------------------------------
// Snapshot helpers
// ---------------------------------------------------------------------------

function snapshot(recipe: Recipe): string {
  return JSON.stringify(recipe);
}

function restore_snapshot(raw: string): Recipe {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  // Dates are serialized as strings by JSON — restore them
  parsed.created_at = new Date(parsed.created_at as string);
  parsed.updated_at = new Date(parsed.updated_at as string);
  return parsed as unknown as Recipe;
}

// ---------------------------------------------------------------------------
// Internal reactive state
// ---------------------------------------------------------------------------

let current = $state<Recipe | null>(null);
let is_dirty = $state(false);
let is_loading = $state(false);

// Undo/redo history: parallel arrays of snapshots
// undo_stack holds snapshots taken *before* each mutation (most recent last)
// redo_stack holds snapshots that were undone (most recent last)
let undo_stack = $state<string[]>([]);
let redo_stack = $state<string[]>([]);

const can_undo = $derived(undo_stack.length > 0);
const can_redo = $derived(redo_stack.length > 0);

// ---------------------------------------------------------------------------
// Auto-save machinery
// ---------------------------------------------------------------------------

let auto_save_timer: ReturnType<typeof setTimeout> | null = null;

function schedule_auto_save(): void {
  if (auto_save_timer !== null) {
    clearTimeout(auto_save_timer);
  }
  auto_save_timer = setTimeout(() => {
    auto_save_timer = null;
    void recipe_store.save();
  }, AUTO_SAVE_DELAY_MS);
}

// ---------------------------------------------------------------------------
// Mutation helper — pushes an undo snapshot then applies the mutator
// ---------------------------------------------------------------------------

function mutate(mutator: (recipe: Recipe) => void): void {
  if (current === null) {
    return;
  }

  // Capture pre-mutation snapshot for undo
  const pre = snapshot(current);

  // Apply mutation
  mutator(current);

  // Push to undo stack, trim if over limit
  undo_stack = [...undo_stack, pre].slice(-MAX_HISTORY);

  // Any new mutation clears the redo stack
  redo_stack = [];

  is_dirty = true;
  schedule_auto_save();
}

// ---------------------------------------------------------------------------
// Public store object
// ---------------------------------------------------------------------------

export const recipe_store = {
  // Reactive state exposed as getters so consumers read from the $state cells
  get current(): Recipe | null {
    return current;
  },
  get is_dirty(): boolean {
    return is_dirty;
  },
  get is_loading(): boolean {
    return is_loading;
  },
  get can_undo(): boolean {
    return can_undo;
  },
  get can_redo(): boolean {
    return can_redo;
  },

  // -------------------------------------------------------------------------
  // Load an existing recipe by ID
  // -------------------------------------------------------------------------

  async load(id: number): Promise<void> {
    is_loading = true;
    try {
      const loaded = await RecipeRepository.get_by_id(id);
      if (loaded === void 0) {
        return;
      }
      current = loaded;
      undo_stack = [];
      redo_stack = [];
      is_dirty = false;
    } finally {
      is_loading = false;
    }
  },

  // -------------------------------------------------------------------------
  // Initialize a brand-new recipe (not yet persisted)
  // -------------------------------------------------------------------------

  create_new(): void {
    current = create_default_recipe();
    undo_stack = [];
    redo_stack = [];
    is_dirty = true;
    schedule_auto_save();
  },

  // -------------------------------------------------------------------------
  // Update a single top-level field
  // -------------------------------------------------------------------------

  update<K extends keyof Recipe>(field: K, value: Recipe[K]): void {
    mutate((recipe) => {
      recipe[field] = value;
    });
  },

  // -------------------------------------------------------------------------
  // Fermentable helpers
  // -------------------------------------------------------------------------

  add_fermentable(entry: FermentableEntry): void {
    mutate((recipe) => {
      recipe.fermentables = [...recipe.fermentables, entry];
    });
  },

  remove_fermentable(index: number): void {
    mutate((recipe) => {
      recipe.fermentables = recipe.fermentables.filter((_, i) => i !== index);
    });
  },

  update_fermentable(index: number, entry: FermentableEntry): void {
    mutate((recipe) => {
      recipe.fermentables = recipe.fermentables.map((f, i) =>
        i === index ? entry : f,
      );
    });
  },

  replace_all_fermentables(entries: FermentableEntry[]): void {
    mutate((recipe) => {
      recipe.fermentables = entries;
    });
  },

  // -------------------------------------------------------------------------
  // Hop helpers
  // -------------------------------------------------------------------------

  add_hop(entry: HopEntry): void {
    mutate((recipe) => {
      recipe.hops = [...recipe.hops, entry];
    });
  },

  remove_hop(index: number): void {
    mutate((recipe) => {
      recipe.hops = recipe.hops.filter((_, i) => i !== index);
    });
  },

  update_hop(index: number, entry: HopEntry): void {
    mutate((recipe) => {
      recipe.hops = recipe.hops.map((h, i) => (i === index ? entry : h));
    });
  },

  // -------------------------------------------------------------------------
  // Yeast helpers
  // -------------------------------------------------------------------------

  add_yeast(entry: YeastEntry): void {
    mutate((recipe) => {
      recipe.yeast = [...recipe.yeast, entry];
    });
  },

  remove_yeast(index: number): void {
    mutate((recipe) => {
      recipe.yeast = recipe.yeast.filter((_, i) => i !== index);
    });
  },

  update_yeast(index: number, entry: YeastEntry): void {
    mutate((recipe) => {
      recipe.yeast = recipe.yeast.map((y, i) => (i === index ? entry : y));
    });
  },

  // -------------------------------------------------------------------------
  // Misc helpers
  // -------------------------------------------------------------------------

  add_misc(entry: MiscEntry): void {
    mutate((recipe) => {
      recipe.misc = [...recipe.misc, entry];
    });
  },

  remove_misc(index: number): void {
    mutate((recipe) => {
      recipe.misc = recipe.misc.filter((_, i) => i !== index);
    });
  },

  update_misc(index: number, entry: MiscEntry): void {
    mutate((recipe) => {
      recipe.misc = recipe.misc.map((m, i) => (i === index ? entry : m));
    });
  },

  // -------------------------------------------------------------------------
  // Persist to IndexedDB
  // -------------------------------------------------------------------------

  async save(): Promise<number | void> {
    if (current === null) {
      return void 0;
    }
    const saved_id = await RecipeRepository.save(current);
    if (current.id === void 0) {
      current.id = saved_id;
    }
    is_dirty = false;
    return saved_id;
  },

  // -------------------------------------------------------------------------
  // Undo
  // -------------------------------------------------------------------------

  undo(): void {
    if (undo_stack.length === 0 || current === null) {
      return;
    }

    // Push current state onto redo stack before restoring
    redo_stack = [...redo_stack, snapshot(current)];

    // Length guard above ensures this is defined
    const previous_raw = undo_stack[undo_stack.length - 1] as string;
    undo_stack = undo_stack.slice(0, -1);

    current = restore_snapshot(previous_raw);
    is_dirty = true;
    schedule_auto_save();
  },

  // -------------------------------------------------------------------------
  // Redo
  // -------------------------------------------------------------------------

  redo(): void {
    if (redo_stack.length === 0 || current === null) {
      return;
    }

    // Push current state onto undo stack before restoring
    undo_stack = [...undo_stack, snapshot(current)];

    // Length guard above ensures this is defined
    const next_raw = redo_stack[redo_stack.length - 1] as string;
    redo_stack = redo_stack.slice(0, -1);

    current = restore_snapshot(next_raw);
    is_dirty = true;
    schedule_auto_save();
  },

  // -------------------------------------------------------------------------
  // Reset — clears the editor back to a blank slate
  // -------------------------------------------------------------------------

  reset(): void {
    if (auto_save_timer !== null) {
      clearTimeout(auto_save_timer);
      auto_save_timer = null;
    }
    current = null;
    undo_stack = [];
    redo_stack = [];
    is_dirty = false;
    is_loading = false;
  },
};
