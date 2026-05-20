<script lang="ts">
  import type { FermentableEntry, FermentableType } from "@trub/types";
  import UnitInput from "../unit_input/unit_input.svelte";
  import UnitValue from "../unit_value/unit_value.svelte";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const FERMENTABLE_TYPE_OPTIONS: { value: FermentableType; label: string }[] =
    [
      { value: "grain", label: "Grain" },
      { value: "sugar", label: "Sugar" },
      { value: "extract", label: "Extract" },
      { value: "dry_extract", label: "Dry Extract" },
      { value: "adjunct", label: "Adjunct" },
    ];

  const DEFAULT_FERMENTABLE: FermentableEntry = {
    name: "",
    type: "grain",
    origin: "",
    color_lovibond: 0,
    potential_ppg: 0,
    yield_pct: 0,
    amount_kg: 0,
    percentage: 0,
    notes: "",
  };

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    fermentables: FermentableEntry[];
    onadd: (entry: FermentableEntry) => void;
    onremove: (index: number) => void;
    onupdate: (index: number, entry: FermentableEntry) => void;
    onreplaceall: (entries: FermentableEntry[]) => void;
  }

  const { fermentables, onadd, onremove, onupdate, onreplaceall }: Props =
    $props();

  // ---------------------------------------------------------------------------
  // Derived: total kg used for percentage recalculation
  // ---------------------------------------------------------------------------

  const total_kg = $derived(
    fermentables.reduce((sum, f) => sum + f.amount_kg, 0),
  );

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Recalculates percentage for all entries based on current amounts.
   * Called whenever an amount changes so percentages stay in sync.
   */
  function recalculate_percentages(
    entries: FermentableEntry[],
    new_total_kg: number,
  ): FermentableEntry[] {
    return entries.map((entry) => ({
      ...entry,
      percentage:
        new_total_kg > 0
          ? Math.round((entry.amount_kg / new_total_kg) * 1000) / 10
          : 0,
    }));
  }

  function handle_field_change(
    index: number,
    field: keyof FermentableEntry,
    raw_value: string,
  ): void {
    const entry = fermentables[index];
    if (entry === void 0) {
      return;
    }

    // Build the updated entry for this row
    const numeric_fields = new Set<keyof FermentableEntry>([
      "color_lovibond",
      "potential_ppg",
      "yield_pct",
      "amount_kg",
      "percentage",
    ]);

    const updated_entry: FermentableEntry = {
      ...entry,
      [field]: numeric_fields.has(field)
        ? parseFloat(raw_value) || 0
        : raw_value,
    };

    // When amount changes, batch-replace all rows so percentages stay in sync
    // without creating N separate undo entries.
    if (field === "amount_kg") {
      const with_updated_amount = fermentables.map((f, i) =>
        i === index ? updated_entry : f,
      );
      const new_total = with_updated_amount.reduce(
        (sum, f) => sum + f.amount_kg,
        0,
      );
      onreplaceall(recalculate_percentages(with_updated_amount, new_total));
      return;
    }

    onupdate(index, updated_entry);
  }

  function handle_amount_change(index: number, canonical_kg: number): void {
    const entry = fermentables[index];
    if (entry === void 0) {
      return;
    }
    const updated_entry: FermentableEntry = { ...entry, amount_kg: canonical_kg };
    const with_updated_amount = fermentables.map((f, i) =>
      i === index ? updated_entry : f,
    );
    const new_total = with_updated_amount.reduce((sum, f) => sum + f.amount_kg, 0);
    onreplaceall(recalculate_percentages(with_updated_amount, new_total));
  }

  function handle_add(): void {
    const new_entry: FermentableEntry = { ...DEFAULT_FERMENTABLE };
    onadd(new_entry);
  }

  function handle_remove(index: number): void {
    onremove(index);
  }
</script>

<section class="fermentables-section" data-testid="fermentables-section">
  <!-- -------------------------------------------------------------------------
    Header
  --------------------------------------------------------------------------- -->
  <header class="section-header">
    <h2 class="section-title">Fermentables</h2>
    <button
      class="add-button"
      data-testid="fermentables-add-button"
      onclick={handle_add}
      type="button"
    >
      + Add
    </button>
  </header>

  <!-- -------------------------------------------------------------------------
    Empty state
  --------------------------------------------------------------------------- -->
  {#if fermentables.length === 0}
    <div class="empty-state" data-testid="fermentables-empty-state">
      <p class="empty-state-message">
        No fermentables yet. Add a grain, extract, or sugar to get started.
      </p>
    </div>

  <!-- -------------------------------------------------------------------------
    Fermentables table
  --------------------------------------------------------------------------- -->
  {:else}
    <div class="table-wrapper">
      <table class="fermentables-table" data-testid="fermentables-table">
        <thead>
          <tr>
            <th class="col-name" scope="col">Name</th>
            <th class="col-type" scope="col">Type</th>
            <th class="col-amount" scope="col">Amount</th>
            <th class="col-color" scope="col">Color (°L)</th>
            <th class="col-ppg" scope="col">PPG</th>
            <th class="col-pct" scope="col">%</th>
            <th class="col-remove" scope="col">
              <span class="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each fermentables as entry, index (index)}
            <tr
              class="fermentable-row"
              data-testid="fermentable-row-{index}"
            >
              <!-- Name -->
              <td class="col-name">
                <input
                  class="cell-input"
                  data-testid="fermentable-name-input-{index}"
                  type="text"
                  value={entry.name}
                  placeholder="e.g. Pale Malt (2-Row)"
                  oninput={(e) =>
                    handle_field_change(
                      index,
                      "name",
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </td>

              <!-- Type -->
              <td class="col-type">
                <select
                  class="cell-select"
                  data-testid="fermentable-type-select-{index}"
                  value={entry.type}
                  onchange={(e) =>
                    handle_field_change(
                      index,
                      "type",
                      (e.target as HTMLSelectElement).value,
                    )}
                >
                  {#each FERMENTABLE_TYPE_OPTIONS as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </td>

              <!-- Amount -->
              <td class="col-amount">
                <UnitInput
                  value={entry.amount_kg}
                  category="GRAIN_WEIGHT"
                  onchange={(canonical_kg) => handle_amount_change(index, canonical_kg)}
                  step={0.001}
                  min={0}
                  data_testid="fermentable-amount-input-{index}"
                />
              </td>

              <!-- Color (Lovibond) -->
              <td class="col-color">
                <input
                  class="cell-input cell-input--numeric"
                  data-testid="fermentable-color-input-{index}"
                  type="number"
                  min="0"
                  step="0.1"
                  value={entry.color_lovibond}
                  oninput={(e) =>
                    handle_field_change(
                      index,
                      "color_lovibond",
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </td>

              <!-- Potential (PPG) -->
              <td class="col-ppg">
                <input
                  class="cell-input cell-input--numeric"
                  data-testid="fermentable-ppg-input-{index}"
                  type="number"
                  min="0"
                  step="1"
                  value={entry.potential_ppg}
                  oninput={(e) =>
                    handle_field_change(
                      index,
                      "potential_ppg",
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </td>

              <!-- Percentage (read-only display, recalculated from amounts) -->
              <td class="col-pct">
                <span
                  class="pct-display"
                  data-testid="fermentable-pct-display-{index}"
                >
                  {entry.percentage.toFixed(1)}%
                </span>
              </td>

              <!-- Remove -->
              <td class="col-remove">
                <button
                  class="remove-button"
                  data-testid="fermentable-remove-button-{index}"
                  type="button"
                  aria-label="Remove {entry.name || 'fermentable'}"
                  onclick={() => handle_remove(index)}
                >
                  &#x2715;
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr class="totals-row" data-testid="fermentables-totals-row">
            <td class="col-name totals-label" colspan="2">Total</td>
            <td class="col-amount totals-value" data-testid="fermentables-total-kg">
              <UnitValue value={total_kg} category="GRAIN_WEIGHT" data_testid="fermentable-total-weight" />
            </td>
            <td class="col-color"></td>
            <td class="col-ppg"></td>
            <td class="col-pct totals-value" data-testid="fermentables-total-pct">
              {fermentables.reduce((sum, f) => sum + f.percentage, 0).toFixed(1)}%
            </td>
            <td class="col-remove"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  {/if}
</section>

<style>
  /* ---------------------------------------------------------------------------
    Section shell
  --------------------------------------------------------------------------- */

  .fermentables-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  /* ---------------------------------------------------------------------------
    Header
  --------------------------------------------------------------------------- */

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-title {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .add-button {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-md);
    background: var(--color-accent);
    color: var(--color-background);
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition:
      background var(--duration-fast) var(--easing-base),
      opacity var(--duration-fast) var(--easing-base);
  }

  .add-button:hover {
    background: var(--color-accent-hover);
  }

  .add-button:active {
    opacity: 0.85;
  }

  /* ---------------------------------------------------------------------------
    Empty state
  --------------------------------------------------------------------------- */

  .empty-state {
    padding: var(--spacing-xl);
    text-align: center;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  .empty-state-message {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  /* ---------------------------------------------------------------------------
    Table wrapper — horizontal scroll on narrow viewports
  --------------------------------------------------------------------------- */

  .table-wrapper {
    overflow-x: auto;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  /* ---------------------------------------------------------------------------
    Table
  --------------------------------------------------------------------------- */

  .fermentables-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  /* Header row */

  .fermentables-table thead tr {
    background: var(--color-surface-raised);
    border-bottom: 1px solid var(--color-border);
  }

  .fermentables-table th {
    padding: var(--spacing-sm) var(--spacing-md);
    text-align: left;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* Body rows */

  .fermentable-row {
    border-bottom: 1px solid var(--color-border);
    transition: background var(--duration-fast) var(--easing-base);
  }

  .fermentable-row:last-of-type {
    border-bottom: none;
  }

  .fermentable-row:hover {
    background: var(--color-surface-raised);
  }

  .fermentables-table td {
    padding: var(--spacing-xs) var(--spacing-sm);
    vertical-align: middle;
  }

  /* Totals footer */

  .totals-row {
    border-top: 1px solid var(--color-border);
    background: var(--color-surface-raised);
  }

  .totals-label {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .totals-value {
    padding: var(--spacing-sm) var(--spacing-sm);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  /* ---------------------------------------------------------------------------
    Column widths
  --------------------------------------------------------------------------- */

  .col-name {
    min-width: 160px;
  }

  .col-type {
    min-width: 120px;
  }

  .col-amount {
    min-width: 160px;
  }

  .col-color {
    min-width: 80px;
  }

  .col-ppg {
    min-width: 60px;
  }

  .col-pct {
    min-width: 60px;
    text-align: right;
  }

  .col-remove {
    width: 40px;
    text-align: center;
  }

  /* ---------------------------------------------------------------------------
    Cell inputs
  --------------------------------------------------------------------------- */

  .cell-input,
  .cell-select {
    width: 100%;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    color: var(--color-text-primary);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-family: inherit;
    transition:
      border-color var(--duration-fast) var(--easing-base),
      background var(--duration-fast) var(--easing-base);
    outline: none;
  }

  .cell-input:hover,
  .cell-select:hover {
    border-color: var(--color-border);
    background: var(--color-background);
  }

  .cell-input:focus,
  .cell-select:focus {
    border-color: var(--color-accent);
    background: var(--color-background);
  }

  .cell-input--numeric {
    text-align: right;
    /* Remove browser spinner arrows — they consume space without adding value */
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .cell-input--numeric::-webkit-inner-spin-button,
  .cell-input--numeric::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .cell-select {
    cursor: pointer;
    /* Style the native select arrow */
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23a0a0a0'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--spacing-sm) center;
    padding-right: var(--spacing-xl);
  }

  /* ---------------------------------------------------------------------------
    Percentage display
  --------------------------------------------------------------------------- */

  .pct-display {
    display: block;
    text-align: right;
    padding-right: var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    font-variant-numeric: tabular-nums;
  }

  /* ---------------------------------------------------------------------------
    Remove button
  --------------------------------------------------------------------------- */

  .remove-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition:
      color var(--duration-fast) var(--easing-base),
      border-color var(--duration-fast) var(--easing-base),
      background var(--duration-fast) var(--easing-base);
  }

  .remove-button:hover {
    color: var(--color-error);
    border-color: var(--color-error);
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
  }

  /* ---------------------------------------------------------------------------
    Accessibility utility
  --------------------------------------------------------------------------- */

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
