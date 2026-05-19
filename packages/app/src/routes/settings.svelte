<script lang="ts">
  import { settings_store } from "../stores/settings_store.svelte";
  import type { Theme } from "../stores/settings_store.svelte";
  import type { UnitPreferences, FormulaDefaults } from "@trub/types";
  import EquipmentProfilesSection from "../components/equipment_profiles_section/equipment_profiles_section.svelte";

  // ---------------------------------------------------------------------------
  // Lifecycle — load settings on mount
  // ---------------------------------------------------------------------------

  $effect(() => {
    void settings_store.load();
  });

  // ---------------------------------------------------------------------------
  // Derived shortcuts
  // ---------------------------------------------------------------------------

  const unit_preferences = $derived(settings_store.unit_preferences);
  const formula_defaults = $derived(settings_store.formula_defaults);
  const theme = $derived(settings_store.theme);
  const is_loaded = $derived(settings_store.is_loaded);

  // ---------------------------------------------------------------------------
  // Unit preference options
  // ---------------------------------------------------------------------------

  const UNIT_FIELDS: Array<{
    category: keyof UnitPreferences;
    label: string;
    options: Array<{ value: string; label: string }>;
  }> = [
    {
      category: "BATCH_VOLUME",
      label: "Batch Volume",
      options: [
        { value: "gal", label: "Gallons" },
        { value: "L", label: "Liters" },
      ],
    },
    {
      category: "SMALL_VOLUME",
      label: "Small Volume",
      options: [
        { value: "mL", label: "Milliliters" },
        { value: "tsp", label: "Teaspoons" },
        { value: "tbsp", label: "Tablespoons" },
        { value: "fl_oz", label: "Fluid Ounces" },
      ],
    },
    {
      category: "GRAIN_WEIGHT",
      label: "Grain Weight",
      options: [
        { value: "lb_oz", label: "Pounds/Ounces" },
        { value: "kg", label: "Kilograms" },
      ],
    },
    {
      category: "HOP_WEIGHT",
      label: "Hop Weight",
      options: [
        { value: "oz", label: "Ounces" },
        { value: "g", label: "Grams" },
      ],
    },
    {
      category: "MISC_WEIGHT",
      label: "Misc Weight",
      options: [
        { value: "g", label: "Grams" },
        { value: "oz", label: "Ounces" },
        { value: "tsp", label: "Teaspoons" },
      ],
    },
    {
      category: "TEMPERATURE",
      label: "Temperature",
      options: [
        { value: "F", label: "Fahrenheit" },
        { value: "C", label: "Celsius" },
      ],
    },
    {
      category: "GRAVITY",
      label: "Gravity",
      options: [
        { value: "SG", label: "Specific Gravity" },
        { value: "Plato", label: "Degrees Plato" },
      ],
    },
    {
      category: "COLOR",
      label: "Color",
      options: [
        { value: "SRM", label: "SRM" },
        { value: "EBC", label: "EBC" },
        { value: "Lovibond", label: "Lovibond" },
      ],
    },
    {
      category: "PRESSURE",
      label: "Pressure",
      options: [
        { value: "PSI", label: "PSI" },
        { value: "kPa", label: "kPa" },
        { value: "bar", label: "Bar" },
      ],
    },
    {
      category: "EVAP_RATE",
      label: "Evaporation Rate",
      options: [
        { value: "gal_per_hr", label: "Gallons/hr" },
        { value: "L_per_hr", label: "Liters/hr" },
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // Formula options
  // ---------------------------------------------------------------------------

  const FORMULA_FIELDS: Array<{
    key: keyof FormulaDefaults;
    label: string;
    options: Array<{ value: string; label: string }>;
  }> = [
    {
      key: "ibu",
      label: "IBU",
      options: [
        { value: "tinseth", label: "Tinseth" },
        { value: "rager", label: "Rager" },
        { value: "mibu", label: "mIBU" },
      ],
    },
    {
      key: "color",
      label: "Color (SRM)",
      options: [
        { value: "morey", label: "Morey" },
        { value: "daniels", label: "Daniels" },
        { value: "mosher", label: "Mosher" },
      ],
    },
    {
      key: "abv",
      label: "ABV",
      options: [
        { value: "simple", label: "Simple" },
        { value: "alternate", label: "Alternate (Daniels)" },
      ],
    },
    {
      key: "mash_ph",
      label: "Mash pH",
      options: [
        { value: "brun_water", label: "Bru'n Water" },
        { value: "kaiser", label: "Kaiser" },
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // Theme options
  // ---------------------------------------------------------------------------

  const THEME_OPTIONS: Array<{ value: Theme; label: string }> = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
  ];

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  function handle_unit_change<K extends keyof UnitPreferences>(
    category: K,
    e: Event,
  ): void {
    const value = (e.target as HTMLSelectElement).value as UnitPreferences[K];
    void settings_store.update_unit_preference(category, value);
  }

  function handle_formula_change<K extends keyof FormulaDefaults>(
    key: K,
    e: Event,
  ): void {
    const value = (e.target as HTMLSelectElement).value as FormulaDefaults[K];
    void settings_store.update_formula_default(key, value);
  }

  function handle_theme_change(e: Event): void {
    const value = (e.target as HTMLSelectElement).value as Theme;
    void settings_store.set_theme(value);
  }

  function handle_reset(): void {
    void settings_store.reset_to_defaults();
  }
</script>

<div class="settings-page" data-testid="settings-page">
  <!-- Back link -->
  <a class="back-link" data-testid="back-to-recipes" href="#/recipes">
    &larr; Recipes
  </a>

  <h1 class="page-title">Settings</h1>

  {#if !is_loaded}
    <!-- Loading state -->
    <div class="loading-state" data-testid="settings-loading">
      <p class="loading-message">Loading settings…</p>
    </div>
  {:else}
    <!-- -----------------------------------------------------------------------
      Section: Display Units
    ----------------------------------------------------------------------- -->
    <section class="settings-card" data-testid="units-section">
      <h2 class="section-title">Display Units</h2>
      <div class="fields-grid">
        {#each UNIT_FIELDS as field (field.category)}
          <label class="field-label" for="unit-select-{field.category}">
            {field.label}
          </label>
          <select
            id="unit-select-{field.category}"
            class="field-select"
            data-testid="unit-select-{field.category}"
            value={unit_preferences[field.category]}
            onchange={(e) => handle_unit_change(field.category, e)}
          >
            {#each field.options as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        {/each}
      </div>
    </section>

    <!-- -----------------------------------------------------------------------
      Section: Default Formulas
    ----------------------------------------------------------------------- -->
    <section class="settings-card" data-testid="formulas-section">
      <h2 class="section-title">Default Formulas</h2>
      <p class="section-subtitle">
        These defaults apply to new recipes. Existing recipes keep their chosen
        formulas.
      </p>
      <div class="fields-grid">
        {#each FORMULA_FIELDS as field (field.key)}
          <label class="field-label" for="formula-select-{field.key}">
            {field.label}
          </label>
          <select
            id="formula-select-{field.key}"
            class="field-select"
            data-testid="formula-select-{field.key}"
            value={formula_defaults[field.key]}
            onchange={(e) => handle_formula_change(field.key, e)}
          >
            {#each field.options as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        {/each}
      </div>
    </section>

    <!-- -----------------------------------------------------------------------
      Section: Appearance
    ----------------------------------------------------------------------- -->
    <section class="settings-card" data-testid="appearance-section">
      <h2 class="section-title">Appearance</h2>
      <div class="fields-grid">
        <label class="field-label" for="theme-select">Theme</label>
        <select
          id="theme-select"
          class="field-select"
          data-testid="theme-select"
          value={theme}
          onchange={handle_theme_change}
        >
          {#each THEME_OPTIONS as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    </section>

    <!-- -----------------------------------------------------------------------
      Section: Equipment Profiles
    ----------------------------------------------------------------------- -->
    <section class="settings-card" data-testid="equipment-settings-section">
      <EquipmentProfilesSection />
    </section>

    <!-- -----------------------------------------------------------------------
      Reset
    ----------------------------------------------------------------------- -->
    <div class="reset-row">
      <button
        class="reset-button"
        data-testid="reset-defaults-button"
        type="button"
        onclick={handle_reset}
      >
        Reset to Defaults
      </button>
    </div>
  {/if}
</div>

<style>
  /* ---------------------------------------------------------------------------
    Page shell
  --------------------------------------------------------------------------- */

  .settings-page {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    max-width: 960px;
    margin: 0 auto;
  }

  /* ---------------------------------------------------------------------------
    Back link
  --------------------------------------------------------------------------- */

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-decoration: none;
    transition: color var(--duration-fast) var(--easing-base);
    align-self: flex-start;
  }

  .back-link:hover {
    color: var(--color-accent);
  }

  /* ---------------------------------------------------------------------------
    Page title
  --------------------------------------------------------------------------- */

  .page-title {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  /* ---------------------------------------------------------------------------
    Loading state
  --------------------------------------------------------------------------- */

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-2xl);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  .loading-message {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  /* ---------------------------------------------------------------------------
    Settings card
  --------------------------------------------------------------------------- */

  .settings-card {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  /* ---------------------------------------------------------------------------
    Section headings
  --------------------------------------------------------------------------- */

  .section-title {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .section-subtitle {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
  }

  /* ---------------------------------------------------------------------------
    Two-column label + select grid
  --------------------------------------------------------------------------- */

  .fields-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: var(--spacing-sm) var(--spacing-lg);
  }

  .field-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .field-select {
    width: 100%;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-background);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-family: inherit;
    cursor: pointer;
    outline: none;
    transition:
      border-color var(--duration-fast) var(--easing-base),
      box-shadow var(--duration-fast) var(--easing-base);
  }

  .field-select:hover {
    border-color: var(--color-accent);
  }

  .field-select:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  /* ---------------------------------------------------------------------------
    Reset row
  --------------------------------------------------------------------------- */

  .reset-row {
    display: flex;
    justify-content: flex-end;
  }

  .reset-button {
    padding: var(--spacing-sm) var(--spacing-lg);
    background: transparent;
    color: var(--color-error);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--easing-base),
      color var(--duration-fast) var(--easing-base),
      opacity var(--duration-fast) var(--easing-base);
  }

  .reset-button:hover {
    background: var(--color-error);
    color: var(--color-background);
  }

  .reset-button:active {
    opacity: 0.85;
  }
</style>
