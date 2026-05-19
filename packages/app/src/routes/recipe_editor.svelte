<script lang="ts">
  import { recipe_store } from "../stores/recipe_store.svelte";
  import FermentablesSection from "../components/fermentables_section/fermentables_section.svelte";
  import HopsSection from "../components/hops_section/hops_section.svelte";
  import WaterChemistrySection from "../components/water_chemistry_section/water_chemistry_section.svelte";
  import StatsDashboard from "../components/stats_dashboard/stats_dashboard.svelte";
  import type { FermentableEntry, HopEntry, WaterAdjustment } from "@trub/types";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const DEFAULT_BATCH_SIZE_L = 20;
  const DEFAULT_EFFICIENCY_PCT = 72;

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

    <!-- Stats -->
    <div class="stats-row" data-testid="stats-row">
      <StatsDashboard
        fermentables={recipe.fermentables}
        yeast={recipe.yeast}
        hops={recipe.hops}
        batch_size_l={DEFAULT_BATCH_SIZE_L}
        efficiency_pct={DEFAULT_EFFICIENCY_PCT}
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

    <!-- Water Chemistry -->
    <div class="section-row" data-testid="water-chemistry-section-row">
      <WaterChemistrySection
        water_adjustments={recipe.water_adjustments}
        fermentables={recipe.fermentables}
        batch_size_l={DEFAULT_BATCH_SIZE_L}
        mash_ph_formula={recipe.mash_ph_formula}
        onupdate_adjustments={handle_update_water_adjustments}
      />
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
    Content rows
  --------------------------------------------------------------------------- */

  .stats-row,
  .section-row {
    display: flex;
    flex-direction: column;
  }
</style>
