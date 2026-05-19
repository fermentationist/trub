import type { UnitPreferences, FormulaDefaults } from "@trub/types";
import { DEFAULT_UNIT_PREFERENCES, DEFAULT_FORMULAS } from "@trub/types";
import { SettingsRepository } from "../repositories/settings_repository";

// ---------------------------------------------------------------------------
// Settings keys
// ---------------------------------------------------------------------------

const KEYS = {
  UNIT_PREFERENCES: "unit_preferences",
  FORMULA_DEFAULTS: "formula_defaults",
  THEME: "theme",
} as const;

// ---------------------------------------------------------------------------
// Theme type
// ---------------------------------------------------------------------------

export type Theme = "dark" | "light";

const DEFAULT_THEME: Theme = "dark";

// ---------------------------------------------------------------------------
// Reactive state
// ---------------------------------------------------------------------------

let unit_preferences = $state<UnitPreferences>({ ...DEFAULT_UNIT_PREFERENCES });
let formula_defaults = $state<FormulaDefaults>({ ...DEFAULT_FORMULAS });
let theme = $state<Theme>(DEFAULT_THEME);
let is_loaded = $state(false);

// ---------------------------------------------------------------------------
// Public store
// ---------------------------------------------------------------------------

export const settings_store = {
  get unit_preferences(): UnitPreferences {
    return unit_preferences;
  },
  get formula_defaults(): FormulaDefaults {
    return formula_defaults;
  },
  get theme(): Theme {
    return theme;
  },
  get is_loaded(): boolean {
    return is_loaded;
  },

  async load(): Promise<void> {
    const [saved_units, saved_formulas, saved_theme] = await Promise.all([
      SettingsRepository.get<UnitPreferences>(KEYS.UNIT_PREFERENCES),
      SettingsRepository.get<FormulaDefaults>(KEYS.FORMULA_DEFAULTS),
      SettingsRepository.get<Theme>(KEYS.THEME),
    ]);

    if (saved_units !== void 0) {
      unit_preferences = saved_units;
    }
    if (saved_formulas !== void 0) {
      formula_defaults = saved_formulas;
    }
    if (saved_theme !== void 0) {
      theme = saved_theme;
    }

    document.documentElement.setAttribute("data-theme", theme);
    is_loaded = true;
  },

  async update_unit_preference<K extends keyof UnitPreferences>(
    category: K,
    value: UnitPreferences[K],
  ): Promise<void> {
    unit_preferences = { ...unit_preferences, [category]: value };
    await SettingsRepository.set(
      KEYS.UNIT_PREFERENCES,
      $state.snapshot(unit_preferences),
    );
  },

  async update_formula_default<K extends keyof FormulaDefaults>(
    key: K,
    value: FormulaDefaults[K],
  ): Promise<void> {
    formula_defaults = { ...formula_defaults, [key]: value };
    await SettingsRepository.set(
      KEYS.FORMULA_DEFAULTS,
      $state.snapshot(formula_defaults),
    );
  },

  async set_theme(value: Theme): Promise<void> {
    theme = value;
    document.documentElement.setAttribute("data-theme", value);
    await SettingsRepository.set(KEYS.THEME, value);
  },

  apply_theme(): void {
    document.documentElement.setAttribute("data-theme", theme);
  },

  async reset_to_defaults(): Promise<void> {
    unit_preferences = { ...DEFAULT_UNIT_PREFERENCES };
    formula_defaults = { ...DEFAULT_FORMULAS };
    theme = DEFAULT_THEME;
    document.documentElement.setAttribute("data-theme", DEFAULT_THEME);
    await Promise.all([
      SettingsRepository.set(
        KEYS.UNIT_PREFERENCES,
        $state.snapshot(unit_preferences),
      ),
      SettingsRepository.set(
        KEYS.FORMULA_DEFAULTS,
        $state.snapshot(formula_defaults),
      ),
      SettingsRepository.set(KEYS.THEME, DEFAULT_THEME),
    ]);
  },
};
