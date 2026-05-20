<script lang="ts">
  import type { HopEntry, HopForm, HopUse } from "@trub/types";
  import UnitInput from "../unit_input/unit_input.svelte";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const HOP_USE_OPTIONS: { value: HopUse; label: string }[] = [
    { value: "boil", label: "Boil" },
    { value: "dry_hop", label: "Dry Hop" },
    { value: "mash", label: "Mash" },
    { value: "first_wort", label: "First Wort" },
    { value: "aroma", label: "Aroma" },
    { value: "whirlpool", label: "Whirlpool" },
  ];

  const HOP_FORM_OPTIONS: { value: HopForm; label: string }[] = [
    { value: "pellet", label: "Pellet" },
    { value: "whole", label: "Whole" },
    { value: "plug", label: "Plug" },
  ];

  const DEFAULT_HOP: HopEntry = {
    name: "",
    origin: "",
    alpha_acid_pct: 0,
    amount_kg: 0,
    time_minutes: 60,
    use: "boil",
    form: "pellet",
    notes: "",
  };

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    hops: HopEntry[];
    onadd: (entry: HopEntry) => void;
    onremove: (index: number) => void;
    onupdate: (index: number, entry: HopEntry) => void;
  }

  const { hops, onadd, onremove, onupdate }: Props = $props();

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function handle_field_change(
    index: number,
    field: keyof HopEntry,
    raw_value: string,
  ): void {
    const entry = hops[index];
    if (entry === void 0) {
      return;
    }

    const numeric_fields = new Set<keyof HopEntry>([
      "alpha_acid_pct",
      "time_minutes",
    ]);

    let coerced_value: string | number = raw_value;

    if (numeric_fields.has(field)) {
      coerced_value = parseFloat(raw_value) || 0;
    }

    const updated_entry: HopEntry = {
      ...entry,
      [field]: coerced_value,
    };

    onupdate(index, updated_entry);
  }

  function handle_add(): void {
    onadd({ ...DEFAULT_HOP });
  }

  function handle_remove(index: number): void {
    onremove(index);
  }
</script>

<section class="hops-section" data-testid="hops-section">
  <!-- -------------------------------------------------------------------------
    Header
  --------------------------------------------------------------------------- -->
  <header class="section-header">
    <h2 class="section-title">Hops</h2>
    <button
      class="add-button"
      data-testid="hops-add-button"
      onclick={handle_add}
      type="button"
    >
      + Add
    </button>
  </header>

  <!-- -------------------------------------------------------------------------
    Empty state
  --------------------------------------------------------------------------- -->
  {#if hops.length === 0}
    <div class="empty-state" data-testid="hops-empty-state">
      <p class="empty-state-message">
        No hop additions yet. Add a hop to define bitterness, flavor, and
        aroma.
      </p>
    </div>

  <!-- -------------------------------------------------------------------------
    Hops table
  --------------------------------------------------------------------------- -->
  {:else}
    <div class="table-wrapper">
      <table class="hops-table" data-testid="hops-table">
        <thead>
          <tr>
            <th class="col-name" scope="col">Name</th>
            <th class="col-alpha" scope="col">Alpha (%)</th>
            <th class="col-amount" scope="col">Amount</th>
            <th class="col-time" scope="col">Time (min)</th>
            <th class="col-use" scope="col">Use</th>
            <th class="col-form" scope="col">Form</th>
            <th class="col-remove" scope="col">
              <span class="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each hops as entry, index (index)}
            <tr class="hop-row" data-testid="hop-row-{index}">
              <!-- Name -->
              <td class="col-name">
                <input
                  class="cell-input"
                  data-testid="hop-name-input-{index}"
                  type="text"
                  value={entry.name}
                  placeholder="e.g. Cascade"
                  oninput={(e) =>
                    handle_field_change(
                      index,
                      "name",
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </td>

              <!-- Alpha acid (%) -->
              <td class="col-alpha">
                <input
                  class="cell-input cell-input--numeric"
                  data-testid="hop-alpha-input-{index}"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={entry.alpha_acid_pct}
                  oninput={(e) =>
                    handle_field_change(
                      index,
                      "alpha_acid_pct",
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </td>

              <!-- Amount — canonical is kg; UnitInput handles conversion -->
              <td class="col-amount">
                <UnitInput
                  value={entry.amount_kg}
                  category="HOP_WEIGHT"
                  onchange={(v) => onupdate(index, { ...entry, amount_kg: v })}
                  step={0.1}
                  min={0}
                  data_testid="hop-amount-input-{index}"
                />
              </td>

              <!-- Time (minutes) -->
              <td class="col-time">
                <input
                  class="cell-input cell-input--numeric"
                  data-testid="hop-time-input-{index}"
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

              <!-- Use -->
              <td class="col-use">
                <select
                  class="cell-select"
                  data-testid="hop-use-select-{index}"
                  value={entry.use}
                  onchange={(e) =>
                    handle_field_change(
                      index,
                      "use",
                      (e.target as HTMLSelectElement).value,
                    )}
                >
                  {#each HOP_USE_OPTIONS as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </td>

              <!-- Form -->
              <td class="col-form">
                <select
                  class="cell-select"
                  data-testid="hop-form-select-{index}"
                  value={entry.form}
                  onchange={(e) =>
                    handle_field_change(
                      index,
                      "form",
                      (e.target as HTMLSelectElement).value,
                    )}
                >
                  {#each HOP_FORM_OPTIONS as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </td>

              <!-- Remove -->
              <td class="col-remove">
                <button
                  class="remove-button"
                  data-testid="hop-remove-button-{index}"
                  type="button"
                  aria-label="Remove {entry.name || 'hop'}"
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

  .hops-section {
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

  .hops-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  /* Header row */

  .hops-table thead tr {
    background: var(--color-surface-raised);
    border-bottom: 1px solid var(--color-border);
  }

  .hops-table th {
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

  .hop-row {
    border-bottom: 1px solid var(--color-border);
    transition: background var(--duration-fast) var(--easing-base);
  }

  .hop-row:last-of-type {
    border-bottom: none;
  }

  .hop-row:hover {
    background: var(--color-surface-raised);
  }

  .hops-table td {
    padding: var(--spacing-xs) var(--spacing-sm);
    vertical-align: middle;
  }

  /* ---------------------------------------------------------------------------
    Column widths
  --------------------------------------------------------------------------- */

  .col-name {
    min-width: 160px;
  }

  .col-alpha {
    min-width: 90px;
  }

  .col-amount {
    min-width: 90px;
  }

  .col-time {
    min-width: 80px;
  }

  .col-use {
    min-width: 120px;
  }

  .col-form {
    min-width: 100px;
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
