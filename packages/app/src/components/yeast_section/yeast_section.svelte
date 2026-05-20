<script lang="ts">
  import type { YeastEntry, YeastForm, Flocculation } from "@trub/types";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const YEAST_FORM_OPTIONS: { value: YeastForm; label: string }[] = [
    { value: "dry", label: "Dry" },
    { value: "liquid", label: "Liquid" },
  ];

  const FLOCCULATION_OPTIONS: { value: Flocculation; label: string }[] = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "very_high", label: "Very High" },
  ];

  const DEFAULT_YEAST: YeastEntry = {
    name: "",
    lab: "",
    product_code: "",
    attenuation_pct: 75,
    temp_min_c: 15,
    temp_max_c: 22,
    flocculation: "medium",
    form: "dry",
    notes: "",
  };

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    yeast: YeastEntry[];
    onadd: (entry: YeastEntry) => void;
    onremove: (index: number) => void;
    onupdate: (index: number, entry: YeastEntry) => void;
  }

  const { yeast, onadd, onremove, onupdate }: Props = $props();

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function handle_field_change(
    index: number,
    field: keyof YeastEntry,
    raw_value: string,
  ): void {
    const entry = yeast[index];
    if (entry === void 0) {
      return;
    }

    const numeric_fields = new Set<keyof YeastEntry>([
      "attenuation_pct",
      "temp_min_c",
      "temp_max_c",
    ]);

    const updated_entry: YeastEntry = {
      ...entry,
      [field]: numeric_fields.has(field)
        ? parseFloat(raw_value) || 0
        : raw_value,
    };

    onupdate(index, updated_entry);
  }

  function handle_add(): void {
    onadd({ ...DEFAULT_YEAST });
  }

  function handle_remove(index: number): void {
    onremove(index);
  }
</script>

<section class="yeast-section" data-testid="yeast-section">
  <!-- -------------------------------------------------------------------------
    Header
  --------------------------------------------------------------------------- -->
  <header class="section-header">
    <h2 class="section-title">Yeast</h2>
    <button
      class="add-button"
      data-testid="yeast-add-button"
      onclick={handle_add}
      type="button"
    >
      + Add
    </button>
  </header>

  <!-- -------------------------------------------------------------------------
    Empty state
  --------------------------------------------------------------------------- -->
  {#if yeast.length === 0}
    <div class="empty-state" data-testid="yeast-empty-state">
      <p class="empty-state-message">
        No yeast added yet. Add a yeast strain to define fermentation character.
      </p>
    </div>

  <!-- -------------------------------------------------------------------------
    Yeast table
  --------------------------------------------------------------------------- -->
  {:else}
    <div class="table-wrapper">
      <table class="yeast-table" data-testid="yeast-table">
        <thead>
          <tr>
            <th class="col-name" scope="col">Name</th>
            <th class="col-lab" scope="col">Lab</th>
            <th class="col-form" scope="col">Form</th>
            <th class="col-attenuation" scope="col">Attenuation (%)</th>
            <th class="col-temp" scope="col">Temp Range (°C)</th>
            <th class="col-flocculation" scope="col">Flocculation</th>
            <th class="col-remove" scope="col">
              <span class="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each yeast as entry, index (index)}
            <tr class="yeast-row" data-testid="yeast-row-{index}">
              <!-- Name -->
              <td class="col-name">
                <input
                  class="cell-input"
                  data-testid="yeast-name-input-{index}"
                  type="text"
                  value={entry.name}
                  placeholder="e.g. US-05"
                  oninput={(e) =>
                    handle_field_change(
                      index,
                      "name",
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </td>

              <!-- Lab -->
              <td class="col-lab">
                <input
                  class="cell-input"
                  data-testid="yeast-lab-input-{index}"
                  type="text"
                  value={entry.lab}
                  placeholder="e.g. Fermentis"
                  oninput={(e) =>
                    handle_field_change(
                      index,
                      "lab",
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </td>

              <!-- Form -->
              <td class="col-form">
                <select
                  class="cell-select"
                  data-testid="yeast-form-select-{index}"
                  value={entry.form}
                  onchange={(e) =>
                    handle_field_change(
                      index,
                      "form",
                      (e.target as HTMLSelectElement).value,
                    )}
                >
                  {#each YEAST_FORM_OPTIONS as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </td>

              <!-- Attenuation (%) -->
              <td class="col-attenuation">
                <input
                  class="cell-input cell-input--numeric"
                  data-testid="yeast-attenuation-input-{index}"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={entry.attenuation_pct}
                  oninput={(e) =>
                    handle_field_change(
                      index,
                      "attenuation_pct",
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </td>

              <!-- Temp Range (min–max °C) -->
              <td class="col-temp">
                <div class="temp-range">
                  <input
                    class="cell-input cell-input--numeric cell-input--temp"
                    data-testid="yeast-temp-min-input-{index}"
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    value={entry.temp_min_c}
                    aria-label="Min temp °C"
                    oninput={(e) =>
                      handle_field_change(
                        index,
                        "temp_min_c",
                        (e.target as HTMLInputElement).value,
                      )}
                  />
                  <span class="temp-separator" aria-hidden="true">–</span>
                  <input
                    class="cell-input cell-input--numeric cell-input--temp"
                    data-testid="yeast-temp-max-input-{index}"
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    value={entry.temp_max_c}
                    aria-label="Max temp °C"
                    oninput={(e) =>
                      handle_field_change(
                        index,
                        "temp_max_c",
                        (e.target as HTMLInputElement).value,
                      )}
                  />
                </div>
              </td>

              <!-- Flocculation -->
              <td class="col-flocculation">
                <select
                  class="cell-select"
                  data-testid="yeast-flocculation-select-{index}"
                  value={entry.flocculation}
                  onchange={(e) =>
                    handle_field_change(
                      index,
                      "flocculation",
                      (e.target as HTMLSelectElement).value,
                    )}
                >
                  {#each FLOCCULATION_OPTIONS as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </td>

              <!-- Remove -->
              <td class="col-remove">
                <button
                  class="remove-button"
                  data-testid="yeast-remove-button-{index}"
                  type="button"
                  aria-label="Remove {entry.name || 'yeast'}"
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

  .yeast-section {
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

  .yeast-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  /* Header row */

  .yeast-table thead tr {
    background: var(--color-surface-raised);
    border-bottom: 1px solid var(--color-border);
  }

  .yeast-table th {
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

  .yeast-row {
    border-bottom: 1px solid var(--color-border);
    transition: background var(--duration-fast) var(--easing-base);
  }

  .yeast-row:last-of-type {
    border-bottom: none;
  }

  .yeast-row:hover {
    background: var(--color-surface-raised);
  }

  .yeast-table td {
    padding: var(--spacing-xs) var(--spacing-sm);
    vertical-align: middle;
  }

  /* ---------------------------------------------------------------------------
    Column widths
  --------------------------------------------------------------------------- */

  .col-name {
    min-width: 160px;
  }

  .col-lab {
    min-width: 120px;
  }

  .col-form {
    min-width: 90px;
  }

  .col-attenuation {
    min-width: 110px;
  }

  .col-temp {
    min-width: 140px;
  }

  .col-flocculation {
    min-width: 120px;
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
    Temp range
  --------------------------------------------------------------------------- */

  .temp-range {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .cell-input--temp {
    /* Override width: 100% — each half shares the space */
    width: 0;
    flex: 1 1 0;
  }

  .temp-separator {
    flex-shrink: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    user-select: none;
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

  /* ---------------------------------------------------------------------------
    Mobile card layout — stacks columns vertically below 640px, eliminating
    the horizontal scroll container that caused pointer interception in E2E
    tests on narrow viewports (e.g. Pixel 5 at 393px).
  --------------------------------------------------------------------------- */

  @media (max-width: 640px) {
    .table-wrapper {
      overflow-x: visible;
    }

    .yeast-table thead {
      display: none;
    }

    .yeast-table,
    .yeast-table tbody {
      display: block;
    }

    .yeast-row {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--color-border);
    }

    /* Cancel the desktop hover background that bleeds outside the wrapper
       when overflow is visible */
    .yeast-row:hover {
      background: var(--color-surface-raised);
    }

    .yeast-table td {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: 0;
      min-width: 0;
    }

    /* Shared label style — applied before individual content rules */
    .yeast-row td::before {
      flex-shrink: 0;
      width: 64px;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .yeast-row td.col-name::before {
      content: "Name";
    }

    .yeast-row td.col-lab::before {
      content: "Lab";
    }

    .yeast-row td.col-form::before {
      content: "Form";
    }

    .yeast-row td.col-attenuation::before {
      content: "Atten.";
    }

    .yeast-row td.col-temp::before {
      content: "Temp";
    }

    .yeast-row td.col-flocculation::before {
      content: "Flocc.";
    }

    .yeast-row td.col-remove {
      justify-content: flex-end;
    }

    .yeast-row td.col-remove::before {
      display: none;
    }

    /* Release fixed column min-widths so cells fill the card width */
    .col-name,
    .col-lab,
    .col-form,
    .col-attenuation,
    .col-temp,
    .col-flocculation {
      min-width: 0;
    }

    .col-remove {
      width: auto;
      text-align: unset;
    }

    .yeast-row .cell-input,
    .yeast-row .cell-select {
      flex: 1;
      min-width: 0;
    }

    /* Temp range inputs still share available space after the label */
    .yeast-row .temp-range {
      flex: 1;
      min-width: 0;
    }
  }
</style>
