import Dexie, { type Table } from "dexie";
import type {
  Recipe,
  Ingredient,
  EquipmentProfile,
  WaterProfile,
  StyleGuideline,
  AppSettings,
} from "@trub/types";

export class TrubDatabase extends Dexie {
  recipes!: Table<Recipe, number>;
  ingredients!: Table<Ingredient, number>;
  equipment_profiles!: Table<EquipmentProfile, number>;
  water_profiles!: Table<WaterProfile, number>;
  style_guidelines!: Table<StyleGuideline, number>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super("trub");

    this.version(1).stores({
      recipes:
        "++id, name, *tags, style_id, equipment_id, water_profile_id, updated_at, created_at",
      ingredients: "++id, name, type, category, [type+category]",
      equipment_profiles: "++id, name, is_default",
      water_profiles: "++id, name, is_default, [is_default]",
      style_guidelines: "++id, name, category, source, [source+category]",
      settings: "key",
    });
  }
}

export const db = new TrubDatabase();
