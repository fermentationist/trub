<script lang="ts">
  import type { FermentationStep } from "@trub/types";
  import UnitInput from "../unit_input/unit_input.svelte";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const DEFAULT_FERMENTATION_STEP: FermentationStep = {
    name: "",
    temp_c: 18,
    duration_days: 14,
  };

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    fermentation_schedule: FermentationStep[];
    onadd: (step: FermentationStep) => void;
    onremove: (index: number) => void;
    onupdate: (index: number, step: FermentationStep) => void;
  }

  const { fermentation_schedule, onadd, onremove, onupdate }: Props = $props();

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function handle_field_change(
    index: number,
    field: keyof FermentationStep,
    raw_value: string,
  ): void {
    const step = fermentation_schedule[index];
    if (step === void 0) {
      return;
    }

    const numeric_fields = new Set<keyof FermentationStep>([
      "duration_days",
    ]);

    const updated_step: FermentationStep = {
      ...step,
      [field]: numeric_fields.has(field)
        ? parseFloat(raw_value) || 0
        : raw_value,
    };

    onupdate(index, updated_step);
  }

  function handle_add(): void {
    onadd({ ...DEFAULT_FERMENTATION_STEP });
  }

  function handle_remove(index: number): void {
    onremove(index);
  }
</script>

<section class="fermentation-schedule-section" data-testid="fermentation-schedule-section">
  <!-- -------------------------------------------------------------------------
    Header
  --------------------------------------------------------------------------- -->
  <header class="section-header">
    <h2 class="section-title">Fermentation Schedule</h2>
    <button
      class="add-button"
      data-testid="fermentation-add-button"
      onclick={handle_add}
      type="button"
    >
      + Add
    </button>
  </header>

  <!-- -------------------------------------------------------------------------
    Empty state
  --------------------------------------------------------------------------- -->
  {#if fermentation_schedule.length === 0}
    <div class="empty-state" data-testid="fermentation-empty-state">
      <p class="empty-state-message">No fermentation steps added.</p>
    </div>

  <!-- -------------------------------------------------------------------------
    Fermentation schedule table
  --------------------------------------------------------------------------- -->
  {:else}
    <div class="table-wrapper">
      <table class="fermentation-table" data-testid="fermentation-table">
        <thead>
          <tr>
            <th class="col-name" scope="col">Name</th>
            <th class="col-temp" scope="col">Temp</th>
            <th class="col-duration" scope="col">Duration (days)</th>
            <th class="col-remove" scope="col">
              <span class="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each fermentation_schedule as step, index (index)}
            <tr class="fermentation-row" data-testid="fermentation-row-{index}">
              <!-- Name -->
              <td class="col-name">
                <input
                  class="cell-input"
                  data-testid="fermentation-name-input-{index}"
                  type="text"
                  value={step.name}
                  placeholder="e.g. Primary"
                  oninput={(e) =>
                    handle_field_change(
                      index,
                      "name",
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </td>

              <!-- Temp -->
              <td class="col-temp">
                <UnitInput
                  value={step.temp_c}
                  category="TEMPERATURE"
                  onchange={(v) => onupdate(index, { ...step, temp_c: v })}
                  step={0.5}
                  data_testid="fermentation-temp-input-{index}"
                />
              </td>

              <!-- Duration (days) -->
              <td class="col-duration">
                <input
                  class="cell-input cell-input--numeric"
                  data-testid="fermentation-duration-input-{index}"
                  type="number"
                  min="1"
                  step="1"
                  value={step.duration_days}
                  oninput={(e) =>
                    handle_field_change(
                      index,
                      "duration_days",
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </td>

              <!-- Remove -->
              <td class="col-remove">
                <button
                  class="remove-button"
                  data-testid="fermentation-remove-button-{index}"
                  type="button"
                  aria-label="Remove {step.name || 'fermentation step'}"
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

  .fermentation-schedule-section {
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

  .fermentation-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  /* Header row */

  .fermentation-table thead tr {
    background: var(--color-surface-raised);
    border-bottom: 1px solid var(--color-border);
  }

  .fermentation-table th {
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

  .fermentation-row {
    border-bottom: 1px solid var(--color-border);
    transition: background var(--duration-fast) var(--easing-base);
  }

  .fermentation-row:last-of-type {
    border-bottom: none;
  }

  .fermentation-row:hover {
    background: var(--color-surface-raised);
  }

  .fermentation-table td {
    padding: var(--spacing-xs) var(--spacing-sm);
    vertical-align: middle;
  }

  /* ---------------------------------------------------------------------------
    Column widths
  --------------------------------------------------------------------------- */

  .col-name {
    min-width: 180px;
  }

  .col-temp {
    min-width: 110px;
  }

  .col-duration {
    min-width: 130px;
  }

  .col-remove {
    width: 40px;
    text-align: center;
  }

  /* ---------------------------------------------------------------------------
    Cell inputs
  --------------------------------------------------------------------------- */

  .cell-input {
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

  .cell-input:hover {
    border-color: var(--color-border);
    background: var(--color-background);
  }

  .cell-input:focus {
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
