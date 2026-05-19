<script lang="ts">
  import { push } from "svelte-spa-router";
  import {
    calculate_og,
    calculate_fg,
    calculate_abv_simple,
    calculate_abv_alternate,
    calculate_ibu_tinseth,
    calculate_ibu_rager,
    calculate_ibu_mibu,
    calculate_srm_morey,
    calculate_srm_daniels,
    calculate_srm_mosher,
    srm_to_css_color,
  } from "@trub/calc";
  import type { Recipe, BrewType } from "@trub/types";
  import { equipment_store } from "../../stores/equipment_store.svelte";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const DEFAULT_ATTENUATION_PCT = 75;

  const BREW_TYPE_LABELS: Record<BrewType, string> = {
    all_grain: "All Grain",
    biab: "BIAB",
    partial_mash: "Partial Mash",
    extract: "Extract",
  };

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    recipe: Recipe;
    ondelete: (id: number) => void;
    onduplicate: (id: number) => void;
  }

  const { recipe, ondelete, onduplicate }: Props = $props();

  // ---------------------------------------------------------------------------
  // Derived stats — always use @trub/calc, never inline math
  // ---------------------------------------------------------------------------

  const card_batch_size = $derived(
    equipment_store.batch_size_for(recipe.equipment_id),
  );
  const card_efficiency = $derived(
    equipment_store.efficiency_for(recipe.equipment_id),
  );

  const avg_attenuation_pct = $derived(
    recipe.yeast.length > 0
      ? recipe.yeast.reduce((sum, y) => sum + y.attenuation_pct, 0) /
          recipe.yeast.length
      : DEFAULT_ATTENUATION_PCT,
  );

  const og = $derived(
    calculate_og(
      recipe.fermentables,
      card_batch_size,
      card_efficiency,
    ),
  );

  const fg = $derived(calculate_fg(og, avg_attenuation_pct));

  const abv = $derived(
    recipe.abv_formula === "alternate"
      ? calculate_abv_alternate(og, fg)
      : calculate_abv_simple(og, fg),
  );

  const ibu = $derived(
    recipe.ibu_formula === "rager"
      ? calculate_ibu_rager(recipe.hops, og, card_batch_size)
      : recipe.ibu_formula === "mibu"
        ? calculate_ibu_mibu(recipe.hops, og, card_batch_size)
        : calculate_ibu_tinseth(recipe.hops, og, card_batch_size),
  );

  const srm = $derived(
    recipe.color_formula === "daniels"
      ? calculate_srm_daniels(recipe.fermentables, card_batch_size)
      : recipe.color_formula === "mosher"
        ? calculate_srm_mosher(recipe.fermentables, card_batch_size)
        : calculate_srm_morey(recipe.fermentables, card_batch_size),
  );

  const srm_color = $derived(srm_to_css_color(srm));

  // ---------------------------------------------------------------------------
  // Formatting helpers — keep display logic out of the template
  // ---------------------------------------------------------------------------

  function format_gravity(value: number): string {
    return value.toFixed(3);
  }

  function format_abv(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  function format_ibu(value: number): string {
    return value.toFixed(1);
  }

  function format_srm(value: number): string {
    return value.toFixed(1);
  }

  function format_date(date: Date): string {
    return date.toLocaleDateString();
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  function handle_name_click(): void {
    if (recipe.id !== void 0) {
      push(`/recipes/${recipe.id}`);
    }
  }

  function handle_duplicate(): void {
    if (recipe.id !== void 0) {
      onduplicate(recipe.id);
    }
  }

  function handle_delete(): void {
    if (recipe.id !== void 0) {
      ondelete(recipe.id);
    }
  }
</script>

<article
  class="recipe_card"
  data-testid="recipe-card-{recipe.id}"
>
  <!-- -------------------------------------------------------------------------
    Header: name + brew type badge
  --------------------------------------------------------------------------- -->
  <header class="card_header">
    <button
      class="recipe_name"
      data-testid="recipe-card-name-{recipe.id}"
      type="button"
      onclick={handle_name_click}
    >
      {recipe.name || "Untitled Recipe"}
    </button>

    <span class="brew_type_badge brew_type_badge--{recipe.type}">
      {BREW_TYPE_LABELS[recipe.type]}
    </span>
  </header>

  <!-- -------------------------------------------------------------------------
    Stats row: OG · IBU · ABV · SRM
  --------------------------------------------------------------------------- -->
  <div class="stats_row">
    <div class="stat_item">
      <span class="stat_label">OG</span>
      <span
        class="stat_value"
        data-testid="recipe-card-og-{recipe.id}"
      >
        {format_gravity(og)}
      </span>
    </div>

    <div class="stat_divider" aria-hidden="true"></div>

    <div class="stat_item">
      <span class="stat_label">IBU</span>
      <span
        class="stat_value"
        data-testid="recipe-card-ibu-{recipe.id}"
      >
        {format_ibu(ibu)}
      </span>
    </div>

    <div class="stat_divider" aria-hidden="true"></div>

    <div class="stat_item">
      <span class="stat_label">ABV</span>
      <span
        class="stat_value"
        data-testid="recipe-card-abv-{recipe.id}"
      >
        {format_abv(abv)}
      </span>
    </div>

    <div class="stat_divider" aria-hidden="true"></div>

    <div class="stat_item">
      <span class="stat_label">SRM</span>
      <div
        class="srm_display"
        data-testid="recipe-card-srm-{recipe.id}"
      >
        <span class="stat_value">{format_srm(srm)}</span>
        <span
          class="srm_swatch"
          style="background-color: {srm_color}"
          aria-hidden="true"
        ></span>
      </div>
    </div>
  </div>

  <!-- -------------------------------------------------------------------------
    Footer: last modified + action buttons
  --------------------------------------------------------------------------- -->
  <footer class="card_footer">
    <span class="updated_at">
      Updated {format_date(recipe.updated_at)}
    </span>

    <div class="action_buttons">
      <button
        class="action_button action_button--secondary"
        data-testid="recipe-card-duplicate-{recipe.id}"
        type="button"
        aria-label="Duplicate {recipe.name}"
        onclick={handle_duplicate}
      >
        Duplicate
      </button>

      <button
        class="action_button action_button--danger"
        data-testid="recipe-card-delete-{recipe.id}"
        type="button"
        aria-label="Delete {recipe.name}"
        onclick={handle_delete}
      >
        Delete
      </button>
    </div>
  </footer>
</article>

<style>
  /* ---------------------------------------------------------------------------
    Card shell
  --------------------------------------------------------------------------- */

  .recipe_card {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    transition:
      box-shadow var(--duration-fast) var(--easing-base),
      border-color var(--duration-fast) var(--easing-base);
  }

  .recipe_card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--color-border-hover, var(--color-border));
  }

  /* ---------------------------------------------------------------------------
    Header
  --------------------------------------------------------------------------- */

  .card_header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-md);
  }

  .recipe_name {
    flex: 1;
    padding: 0;
    background: transparent;
    border: none;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent);
    text-align: left;
    cursor: pointer;
    line-height: var(--line-height-tight);
    transition: color var(--duration-fast) var(--easing-base);
  }

  .recipe_name:hover {
    color: var(--color-accent-hover);
  }

  .recipe_name:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  /* ---------------------------------------------------------------------------
    Brew type badge
  --------------------------------------------------------------------------- */

  .brew_type_badge {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    background: var(--color-surface-raised);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
  }

  /* ---------------------------------------------------------------------------
    Stats row
  --------------------------------------------------------------------------- */

  .stats_row {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }

  .stat_item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    flex: 1;
  }

  .stat_label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .stat_value {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);
    font-variant-numeric: tabular-nums;
  }

  .stat_divider {
    width: 1px;
    height: 32px;
    background: var(--color-border);
    flex-shrink: 0;
  }

  /* ---------------------------------------------------------------------------
    SRM swatch
  --------------------------------------------------------------------------- */

  .srm_display {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .srm_swatch {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: var(--radius-full);
    border: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  /* ---------------------------------------------------------------------------
    Footer
  --------------------------------------------------------------------------- */

  .card_footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
  }

  .updated_at {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  /* ---------------------------------------------------------------------------
    Action buttons
  --------------------------------------------------------------------------- */

  .action_buttons {
    display: flex;
    gap: var(--spacing-sm);
  }

  .action_button {
    display: inline-flex;
    align-items: center;
    padding: var(--spacing-xs) var(--spacing-md);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--easing-base),
      color var(--duration-fast) var(--easing-base),
      border-color var(--duration-fast) var(--easing-base),
      opacity var(--duration-fast) var(--easing-base);
  }

  .action_button--secondary {
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
  }

  .action_button--secondary:hover {
    background: var(--color-surface-raised);
    color: var(--color-text-primary);
    border-color: var(--color-text-secondary);
  }

  .action_button--secondary:active {
    opacity: 0.85;
  }

  .action_button--danger {
    background: transparent;
    color: var(--color-error);
    border: 1px solid var(--color-error);
  }

  .action_button--danger:hover {
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
  }

  .action_button--danger:active {
    opacity: 0.85;
  }
</style>
