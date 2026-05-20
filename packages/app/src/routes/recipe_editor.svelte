<script lang="ts">
  import { recipe_store } from "../stores/recipe_store.svelte";
  import { equipment_store, DEFAULT_BATCH_SIZE_L, DEFAULT_EFFICIENCY_PCT } from "../stores/equipment_store.svelte";
  import FermentablesSection from "../components/fermentables_section/fermentables_section.svelte";
  import HopsSection from "../components/hops_section/hops_section.svelte";
  import YeastSection from "../components/yeast_section/yeast_section.svelte";
  import MiscSection from "../components/misc_section/misc_section.svelte";
  import MashScheduleSection from "../components/mash_schedule_section/mash_schedule_section.svelte";
  import FermentationScheduleSection from "../components/fermentation_schedule_section/fermentation_schedule_section.svelte";
  import WaterChemistrySection from "../components/water_chemistry_section/water_chemistry_section.svelte";
  import StatsDashboard from "../components/stats_dashboard/stats_dashboard.svelte";
  import type {
    FermentableEntry,
    HopEntry,
    YeastEntry,
    MiscEntry,
    MashStep,
    FermentationStep,
    WaterAdjustment,
  } from "@trub/types";

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    params?: Record<string, string>;
  }

  const { params = {} }: Props = $props();

  // ---------------------------------------------------------------------------
  // Lifecycle — load or create recipe, reset on unmount
  // ---------------------------------------------------------------------------

  $effect(() => {
    void equipment_store.load();
  });

  $effect(() => {
    const id_param = params.id;

    if (id_param === "new") {
      recipe_store.create_new();
    } else if (id_param !== void 0) {
      const numeric_id = parseInt(id_param, 10);
      if (!isNaN(numeric_id)) {
        void recipe_store.load(numeric_id);
      }
    }

    return () => {
      recipe_store.reset();
    };
  });

  // ---------------------------------------------------------------------------
  // Derived shortcuts — keep template readable
  // ---------------------------------------------------------------------------

  const recipe = $derived(recipe_store.current);
  const is_loading = $derived(recipe_store.is_loading);
  const is_dirty = $derived(recipe_store.is_dirty);
  const can_undo = $derived(recipe_store.can_undo);
  const can_redo = $derived(recipe_store.can_redo);

  const equipment_profiles = $derived(equipment_store.profiles);
  const batch_size_l = $derived(
    recipe !== null
      ? equipment_store.batch_size_for(recipe.equipment_id)
      : DEFAULT_BATCH_SIZE_L,
  );
  const efficiency_pct = $derived(
    recipe !== null
      ? equipment_store.efficiency_for(recipe.equipment_id)
      : DEFAULT_EFFICIENCY_PCT,
  );

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  function handle_name_input(e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    recipe_store.update("name", value);
  }

  function handle_add_fermentable(entry: FermentableEntry): void {
    recipe_store.add_fermentable(entry);
  }

  function handle_remove_fermentable(index: number): void {
    recipe_store.remove_fermentable(index);
  }

  function handle_update_fermentable(
    index: number,
    entry: FermentableEntry,
  ): void {
    recipe_store.update_fermentable(index, entry);
  }

  function handle_replace_all_fermentables(
    entries: FermentableEntry[],
  ): void {
    recipe_store.replace_all_fermentables(entries);
  }

  function handle_add_hop(entry: HopEntry): void {
    recipe_store.add_hop(entry);
  }

  function handle_remove_hop(index: number): void {
    recipe_store.remove_hop(index);
  }

  function handle_update_hop(index: number, entry: HopEntry): void {
    recipe_store.update_hop(index, entry);
  }

  function handle_add_yeast(entry: YeastEntry): void {
    recipe_store.add_yeast(entry);
  }

  function handle_remove_yeast(index: number): void {
    recipe_store.remove_yeast(index);
  }

  function handle_update_yeast(index: number, entry: YeastEntry): void {
    recipe_store.update_yeast(index, entry);
  }

  function handle_add_misc(entry: MiscEntry): void {
    recipe_store.add_misc(entry);
  }

  function handle_remove_misc(index: number): void {
    recipe_store.remove_misc(index);
  }

  function handle_update_misc(index: number, entry: MiscEntry): void {
    recipe_store.update_misc(index, entry);
  }

  function handle_add_mash_step(step: MashStep): void {
    recipe_store.add_mash_step(step);
  }

  function handle_remove_mash_step(index: number): void {
    recipe_store.remove_mash_step(index);
  }

  function handle_update_mash_step(index: number, step: MashStep): void {
    recipe_store.update_mash_step(index, step);
  }

  function handle_add_fermentation_step(step: FermentationStep): void {
    recipe_store.add_fermentation_step(step);
  }

  function handle_remove_fermentation_step(index: number): void {
    recipe_store.remove_fermentation_step(index);
  }

  function handle_update_fermentation_step(
    index: number,
    step: FermentationStep,
  ): void {
    recipe_store.update_fermentation_step(index, step);
  }

  function handle_equipment_change(e: Event): void {
    const value = (e.target as HTMLSelectElement).value;
    recipe_store.update("equipment_id", value === "" ? null : parseInt(value, 10));
  }

  function handle_notes_input(e: Event): void {
    const value = (e.target as HTMLTextAreaElement).value;
    recipe_store.update("notes", value);
  }

  function handle_update_water_adjustments(adjustments: WaterAdjustment): void {
    recipe_store.update("water_adjustments", adjustments);
  }

  function handle_undo(): void {
    recipe_store.undo();
  }

  function handle_redo(): void {
    recipe_store.redo();
  }
</script>

<div class="recipe-editor" data-testid="recipe-editor">
  <!-- -------------------------------------------------------------------------
    Loading state
  --------------------------------------------------------------------------- -->
  {#if is_loading}
    <div class="loading-state" data-testid="recipe-editor-loading">
      <p class="loading-message">Loading recipe…</p>
    </div>

  <!-- -------------------------------------------------------------------------
    Error / not found state
  --------------------------------------------------------------------------- -->
  {:else if recipe === null}
    <div class="empty-state" data-testid="recipe-editor-empty">
      <p class="empty-state-message">Recipe not found.</p>
    </div>

  <!-- -------------------------------------------------------------------------
    Loaded recipe
  --------------------------------------------------------------------------- -->
  {:else}
    <!-- Toolbar -->
    <header class="editor-header" data-testid="recipe-editor-header">
      <div class="name-row">
        <input
          class="recipe-name-input"
          data-testid="recipe-name-input"
          type="text"
          aria-label="Recipe name"
          value={recipe.name}
          oninput={handle_name_input}
        />
        <div class="toolbar-actions">
          <button
            class="toolbar-button"
            data-testid="undo-button"
            type="button"
            aria-label="Undo"
            disabled={!can_undo}
            onclick={handle_undo}
          >
            Undo
          </button>
          <button
            class="toolbar-button"
            data-testid="redo-button"
            type="button"
            aria-label="Redo"
            disabled={!can_redo}
            onclick={handle_redo}
          >
            Redo
          </button>
        </div>
      </div>

      <div class="save-indicator" data-testid="save-indicator">
        {#if is_dirty}
          <span class="dirty-dot" aria-label="Unsaved changes">&#x2022;</span>
        {:else}
          <span class="saved-label">Saved</span>
        {/if}
      </div>
    </header>

    <!-- Equipment selector -->
    <div class="equipment-row" data-testid="equipment-row">
      <label class="equipment-label" for="equipment-select">Equipment</label>
      <select
        id="equipment-select"
        class="equipment-select"
        data-testid="equipment-select"
        value={recipe.equipment_id ?? ""}
        onchange={handle_equipment_change}
      >
        <option value="">None (defaults)</option>
        {#each equipment_profiles as profile (profile.id)}
          <option value={profile.id}>{profile.name}</option>
        {/each}
      </select>
    </div>

    <!-- Stats -->
    <div class="stats-row" data-testid="stats-row">
      <StatsDashboard
        fermentables={recipe.fermentables}
        yeast={recipe.yeast}
        hops={recipe.hops}
        batch_size_l={batch_size_l}
        efficiency_pct={efficiency_pct}
        abv_formula={recipe.abv_formula}
        ibu_formula={recipe.ibu_formula}
        color_formula={recipe.color_formula}
      />
    </div>

    <!-- Fermentables -->
    <div class="section-row" data-testid="fermentables-section-row">
      <FermentablesSection
        fermentables={recipe.fermentables}
        onadd={handle_add_fermentable}
        onremove={handle_remove_fermentable}
        onupdate={handle_update_fermentable}
        onreplaceall={handle_replace_all_fermentables}
      />
    </div>

    <!-- Hops -->
    <div class="section-row" data-testid="hops-section-row">
      <HopsSection
        hops={recipe.hops}
        onadd={handle_add_hop}
        onremove={handle_remove_hop}
        onupdate={handle_update_hop}
      />
    </div>

    <!-- Yeast -->
    <div class="section-row" data-testid="yeast-section-row">
      <YeastSection
        yeast={recipe.yeast}
        onadd={handle_add_yeast}
        onremove={handle_remove_yeast}
        onupdate={handle_update_yeast}
      />
    </div>

    <!-- Misc -->
    <div class="section-row" data-testid="misc-section-row">
      <MiscSection
        misc={recipe.misc}
        onadd={handle_add_misc}
        onremove={handle_remove_misc}
        onupdate={handle_update_misc}
      />
    </div>

    <!-- Mash Schedule -->
    <div class="section-row" data-testid="mash-schedule-section-row">
      <MashScheduleSection
        mash_schedule={recipe.mash_schedule}
        onadd={handle_add_mash_step}
        onremove={handle_remove_mash_step}
        onupdate={handle_update_mash_step}
      />
    </div>

    <!-- Fermentation Schedule -->
    <div class="section-row" data-testid="fermentation-schedule-section-row">
      <FermentationScheduleSection
        fermentation_schedule={recipe.fermentation_schedule}
        onadd={handle_add_fermentation_step}
        onremove={handle_remove_fermentation_step}
        onupdate={handle_update_fermentation_step}
      />
    </div>

    <!-- Water Chemistry -->
    <div class="section-row" data-testid="water-chemistry-section-row">
      <WaterChemistrySection
        water_adjustments={recipe.water_adjustments}
        fermentables={recipe.fermentables}
        batch_size_l={batch_size_l}
        mash_ph_formula={recipe.mash_ph_formula}
        onupdate_adjustments={handle_update_water_adjustments}
      />
    </div>

    <!-- Notes -->
    <div class="section-row" data-testid="notes-section-row">
      <section class="notes-section" data-testid="notes-section">
        <h2 class="notes-title">Notes</h2>
        <textarea
          class="notes-textarea"
          data-testid="notes-textarea"
          aria-label="Recipe notes"
          placeholder="Brew day notes, observations, ideas…"
          value={recipe.notes}
          oninput={handle_notes_input}
        ></textarea>
      </section>
    </div>
  {/if}
</div>

<style>
  /* ---------------------------------------------------------------------------
    Editor shell
  --------------------------------------------------------------------------- */

  .recipe-editor {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    max-width: 960px;
    margin: 0 auto;
  }

  /* ---------------------------------------------------------------------------
    Loading / empty states
  --------------------------------------------------------------------------- */

  .loading-state,
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-2xl);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  .loading-message,
  .empty-state-message {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  /* ---------------------------------------------------------------------------
    Header
  --------------------------------------------------------------------------- */

  .editor-header {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .name-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  /* ---------------------------------------------------------------------------
    Recipe name input
  --------------------------------------------------------------------------- */

  .recipe-name-input {
    flex: 1;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    font-family: inherit;
    outline: none;
    transition:
      border-color var(--duration-fast) var(--easing-base),
      box-shadow var(--duration-fast) var(--easing-base);
  }

  .recipe-name-input:hover {
    border-color: var(--color-accent);
  }

  .recipe-name-input:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  /* ---------------------------------------------------------------------------
    Toolbar actions (undo/redo)
  --------------------------------------------------------------------------- */

  .toolbar-actions {
    display: flex;
    gap: var(--spacing-xs);
    flex-shrink: 0;
  }

  .toolbar-button {
    padding: var(--spacing-xs) var(--spacing-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-family: inherit;
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--easing-base),
      border-color var(--duration-fast) var(--easing-base),
      opacity var(--duration-fast) var(--easing-base);
  }

  .toolbar-button:hover:not(:disabled) {
    background: var(--color-surface-raised);
    border-color: var(--color-accent);
  }

  .toolbar-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ---------------------------------------------------------------------------
    Save indicator
  --------------------------------------------------------------------------- */

  .save-indicator {
    display: flex;
    align-items: center;
    min-height: 1.25rem;
  }

  .dirty-dot {
    font-size: var(--font-size-xl);
    line-height: 1;
    color: var(--color-warning);
  }

  .saved-label {
    font-size: var(--font-size-xs);
    color: var(--color-success);
    font-weight: var(--font-weight-medium);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* ---------------------------------------------------------------------------
    Equipment selector
  --------------------------------------------------------------------------- */

  .equipment-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .equipment-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  .equipment-select {
    flex: 1;
    max-width: 300px;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-surface);
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

  .equipment-select:hover {
    border-color: var(--color-accent);
  }

  .equipment-select:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  /* ---------------------------------------------------------------------------
    Content rows
  --------------------------------------------------------------------------- */

  .stats-row,
  .section-row {
    display: flex;
    flex-direction: column;
  }

  /* ---------------------------------------------------------------------------
    Notes section
  --------------------------------------------------------------------------- */

  .notes-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .notes-title {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .notes-textarea {
    width: 100%;
    min-height: 120px;
    padding: var(--spacing-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: inherit;
    line-height: var(--line-height-relaxed);
    resize: vertical;
    outline: none;
    transition:
      border-color var(--duration-fast) var(--easing-base),
      box-shadow var(--duration-fast) var(--easing-base);
  }

  .notes-textarea:hover {
    border-color: var(--color-accent);
  }

  .notes-textarea:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  /* ---------------------------------------------------------------------------
    Mobile layout
  --------------------------------------------------------------------------- */

  @media (max-width: 640px) {
    .name-row {
      flex-wrap: wrap;
    }

    .recipe-name-input {
      min-width: 0;
      font-size: var(--font-size-lg);
    }

    .toolbar-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
