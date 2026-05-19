<script lang="ts">
  import type { MiscEntry, MiscType, MiscUseStage } from "@trub/types";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const MISC_TYPE_OPTIONS: { value: MiscType; label: string }[] = [
    { value: "spice", label: "Spice" },
    { value: "fining", label: "Fining" },
    { value: "water_agent", label: "Water Agent" },
    { value: "herb", label: "Herb" },
    { value: "flavor", label: "Flavor" },
    { value: "other", label: "Other" },
  ];

  const MISC_USE_STAGE_OPTIONS: { value: MiscUseStage; label: string }[] = [
    { value: "boil", label: "Boil" },
    { value: "mash", label: "Mash" },
    { value: "primary", label: "Primary" },
    { value: "secondary", label: "Secondary" },
    { value: "bottling", label: "Bottling" },
  ];

  const DEFAULT_MISC: MiscEntry = {
    name: "",
    misc_type: "spice",
    use_stage: "boil",
    amount_kg: 0,
    time_minutes: 0,
    notes: "",
  };

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    misc: MiscEntry[];
    onadd: (entry: MiscEntry) => void;
    onremove: (index: number) => void;
    onupdate: (index: number, entry: MiscEntry) => void;
  }

  const { misc, onadd, onremove, onupdate }: Props = $props();

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the display value for the amount input (grams).
   * Canonical storage is kg; the input shows grams for readability.
   */
  function kg_to_g(kg: number): number {
    return Math.round(kg * 1000 * 10) / 10;
  }

  function handle_field_change(
    index: number,
    field: keyof MiscEntry,
    raw_value: string,
  ): void {
    const entry = misc[index];
    if (entry === void 0) {
      return;
    }

    const numeric_fields = new Set<keyof MiscEntry>([
      "amount_kg",
      "time_minutes",
    ]);

    let coerced_value: string | number = raw_value;

    if (numeric_fields.has(field)) {
      if (field === "amount_kg") {
        // Input is in grams — convert back to kg for canonical storage
        coerced_value = (parseFloat(raw_value) || 0) / 1000;
      } else {
        coerced_value = parseFloat(raw_value) || 0;
      }
    }

    const updated_entry: MiscEntry = {
      ...entry,
      [field]: coerced_value,
    };

    onupdate(index, updated_entry);
  }

  function handle_add(): void {
    onadd({ ...DEFAULT_MISC });
  }

  function handle_remove(index: number): void {
    onremove(index);
  }
</script>

<section class="misc-section" data-testid="misc-section">
  <!-- -------------------------------------------------------------------------
    Header
  --------------------------------------------------------------------------- -->
  <header class="section-header">
    <h2 class="section-title">Misc</h2>
    <button
      class="add-button"
      data-testid="misc-add-button"
      onclick={handle_add}
      type="button"
    >
      + Add
    </button>
  </header>

  <!-- -------------------------------------------------------------------------
    Empty state
  --------------------------------------------------------------------------- -->
  {#if misc.length === 0}
    <div class="empty-state" data-testid="misc-empty-state">
      <p class="empty-state-message">No miscellaneous ingredients added.</p>
    </div>

  <!-- -------------------------------------------------------------------------
    Misc table
  --------------------------------------------------------------------------- -->
  {:else}
    <div class="table-wrapper">
      <table class="misc-table" data-testid="misc-table">
        <thead>
          <tr>
            <th class="col-name" scope="col">Name</th>
            <th class="col-type" scope="col">Type</th>
            <th class="col-use-stage" scope="col">Use Stage</th>
            <th class="col-amount" scope="col">Amount (g)</th>
            <th class="col-time" scope="col">Time (min)</th>
            <th class="col-remove" scope="col">
              <span class="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each misc as entry, index (index)}
            <tr class="misc-row" data-testid="misc-row-{index}">
              <!-- Name -->
              <td class="col-name">
                <input
                  class="cell-input"
                  data-testid="misc-name-input-{index}"
                  type="text"
                  value={entry.name}
                  placeholder="e.g. Irish Moss"
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
                  data-testid="misc-type-select-{index}"
                  value={entry.misc_type}
                  onchange={(e) =>
                    handle_field_change(
                      index,
                      "misc_type",
                      (e.target as HTMLSelectElement).value,
                    )}
                >
                  {#each MISC_TYPE_OPTIONS as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </td>

              <!-- Use Stage -->
              <td class="col-use-stage">
                <select
                  class="cell-select"
                  data-testid="misc-use-stage-select-{index}"
                  value={entry.use_stage}
                  onchange={(e) =>
                    handle_field_change(
                      index,
                      "use_stage",
                      (e.target as HTMLSelectElement).value,
                    )}
                >
                  {#each MISC_USE_STAGE_OPTIONS as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </td>

              <!-- Amount (grams — canonical is kg) -->
              <td class="col-amount">
                <input
                  class="cell-input cell-input--numeric"
                  data-testid="misc-amount-input-{index}"
                  type="number"
                  min="0"
                  step="0.1"
                  value={kg_to_g(entry.amount_kg)}
                  oninput={(e) =>
                    handle_field_change(
                      index,
                      "amount_kg",
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </td>

              <!-- Time (minutes) -->
              <td class="col-time">
                <input
                  class="cell-input cell-input--numeric"
                  data-testid="misc-time-input-{index}"
                  type="number"
                  min="0"
                  step="1"
                  value={entry.time_minutes}
                  oninput={(e) =>
                    handle_field_change(
                      index,
                      "time_minutes",
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </td>

              <!-- Remove -->
              <td class="col-remove">
                <button
                  class="remove-button"
                  data-testid="misc-remove-button-{index}"
                  type="button"
                  aria-label="Remove {entry.name || 'misc ingredient'}"
                  onclick={() => handle_remove(index)}
                >
                  &#x2715;
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  /* ---------------------------------------------------------------------------
    Section shell
  --------------------------------------------------------------------------- */

  .misc-section {
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

  .misc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  /* Header row */

  .misc-table thead tr {
    background: var(--color-surface-raised);
    border-bottom: 1px solid var(--color-border);
  }

  .misc-table th {
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

  .misc-row {
    border-bottom: 1px solid var(--color-border);
    transition: background var(--duration-fast) var(--easing-base);
  }

  .misc-row:last-of-type {
    border-bottom: none;
  }

  .misc-row:hover {
    background: var(--color-surface-raised);
  }

  .misc-table td {
    padding: var(--spacing-xs) var(--spacing-sm);
    vertical-align: middle;
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

  .col-use-stage {
    min-width: 110px;
  }

  .col-amount {
    min-width: 90px;
  }

  .col-time {
    min-width: 80px;
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
