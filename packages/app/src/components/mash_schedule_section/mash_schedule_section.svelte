<script lang="ts">
  import type { MashStep, MashStepType } from "@trub/types";
  import UnitInput from "../unit_input/unit_input.svelte";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const MASH_STEP_TYPE_OPTIONS: { value: MashStepType; label: string }[] = [
    { value: "infusion", label: "Infusion" },
    { value: "decoction", label: "Decoction" },
    { value: "temperature", label: "Temperature" },
  ];

  const DEFAULT_MASH_STEP: MashStep = {
    name: "",
    type: "infusion",
    target_temp_c: 67,
    time_minutes: 60,
    water_amount_l: 0,
  };

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    mash_schedule: MashStep[];
    onadd: (step: MashStep) => void;
    onremove: (index: number) => void;
    onupdate: (index: number, step: MashStep) => void;
  }

  const { mash_schedule, onadd, onremove, onupdate }: Props = $props();

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function handle_field_change(
    index: number,
    field: keyof MashStep,
    raw_value: string,
  ): void {
    const step = mash_schedule[index];
    if (step === void 0) {
      return;
    }

    const numeric_fields = new Set<keyof MashStep>([
      "target_temp_c",
      "time_minutes",
      "water_amount_l",
    ]);

    const updated_step: MashStep = {
      ...step,
      [field]: numeric_fields.has(field)
        ? parseFloat(raw_value) || 0
        : raw_value,
    };

    onupdate(index, updated_step);
  }

  function handle_add(): void {
    onadd({ ...DEFAULT_MASH_STEP });
  }

  function handle_remove(index: number): void {
    onremove(index);
  }
</script>

<section class="mash-schedule-section" data-testid="mash-schedule-section">
  <!-- -------------------------------------------------------------------------
    Header
  --------------------------------------------------------------------------- -->
  <header class="section-header">
    <h2 class="section-title">Mash Schedule</h2>
    <button
      class="add-button"
      data-testid="mash-add-button"
      onclick={handle_add}
      type="button"
    >
      + Add
    </button>
  </header>

  <!-- -------------------------------------------------------------------------
    Empty state
  --------------------------------------------------------------------------- -->
  {#if mash_schedule.length === 0}
    <div class="empty-state" data-testid="mash-empty-state">
      <p class="empty-state-message">No mash steps added.</p>
    </div>

  <!-- -------------------------------------------------------------------------
    Mash schedule table
  --------------------------------------------------------------------------- -->
  {:else}
    <div class="table-wrapper">
      <table class="mash-table" data-testid="mash-table">
        <thead>
          <tr>
            <th class="col-name" scope="col">Name</th>
            <th class="col-type" scope="col">Type</th>
            <th class="col-temp" scope="col">Temp</th>
            <th class="col-time" scope="col">Time (min)</th>
            <th class="col-water" scope="col">Water</th>
            <th class="col-remove" scope="col">
              <span class="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each mash_schedule as step, index (index)}
            <tr class="mash-row" data-testid="mash-row-{index}">
              <!-- Name -->
              <td class="col-name">
                <input
                  class="cell-input"
                  data-testid="mash-name-input-{index}"
                  type="text"
                  value={step.name}
                  placeholder="e.g. Saccharification"
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
                  data-testid="mash-type-select-{index}"
                  value={step.type}
                  onchange={(e) =>
                    handle_field_change(
                      index,
                      "type",
                      (e.target as HTMLSelectElement).value,
                    )}
                >
                  {#each MASH_STEP_TYPE_OPTIONS as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </td>

              <!-- Target Temp -->
              <td class="col-temp">
                <UnitInput
                  value={step.target_temp_c}
                  category="TEMPERATURE"
                  onchange={(v) => onupdate(index, { ...step, target_temp_c: v })}
                  step={0.5}
                  data_testid="mash-temp-input-{index}"
                />
              </td>

              <!-- Time -->
              <td class="col-time">
                <input
                  class="cell-input cell-input--numeric"
                  data-testid="mash-time-input-{index}"
                  type="number"
                  min="0"
                  step="1"
                  value={step.time_minutes}
                  oninput={(e) =>
                    handle_field_change(
                      index,
                      "time_minutes",
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </td>

              <!-- Water -->
              <td class="col-water">
                <UnitInput
                  value={step.water_amount_l}
                  category="BATCH_VOLUME"
                  onchange={(v) => onupdate(index, { ...step, water_amount_l: v })}
                  step={0.1}
                  min={0}
                  data_testid="mash-water-input-{index}"
                />
              </td>

              <!-- Remove -->
              <td class="col-remove">
                <button
                  class="remove-button"
                  data-testid="mash-remove-button-{index}"
                  type="button"
                  aria-label="Remove {step.name || 'mash step'}"
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

  .mash-schedule-section {
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

  .mash-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  /* Header row */

  .mash-table thead tr {
    background: var(--color-surface-raised);
    border-bottom: 1px solid var(--color-border);
  }

  .mash-table th {
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

  .mash-row {
    border-bottom: 1px solid var(--color-border);
    transition: background var(--duration-fast) var(--easing-base);
  }

  .mash-row:last-of-type {
    border-bottom: none;
  }

  .mash-row:hover {
    background: var(--color-surface-raised);
  }

  .mash-table td {
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

  .col-temp {
    min-width: 120px;
  }

  .col-time {
    min-width: 90px;
  }

  .col-water {
    min-width: 90px;
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
