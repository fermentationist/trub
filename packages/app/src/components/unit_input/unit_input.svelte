<script lang="ts">
  import { untrack } from "svelte";
  import type { UnitCategory } from "@trub/types";
  import { from_canonical, to_canonical } from "@trub/calc";
  import { settings_store } from "../../stores/settings_store.svelte";
  import {
    resolve_display_unit,
    UNIT_OPTIONS,
    DEFAULT_PRECISION,
    type UnitOption,
  } from "../../lib/constants/UNITS";

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    value: number;
    category: UnitCategory;
    onchange: (canonical_value: number) => void;
    precision?: number;
    step?: number;
    min?: number;
    max?: number;
    disabled?: boolean;
    data_testid?: string;
  }

  const {
    value,
    category,
    onchange,
    precision,
    step,
    min,
    max,
    disabled = false,
    data_testid,
  }: Props = $props();

  // ---------------------------------------------------------------------------
  // Local state
  // ---------------------------------------------------------------------------

  // Capture the initial display unit without subscribing to reactive state.
  // `category` is not expected to change for the lifetime of this instance;
  // if it did, the parent should key-remount the component.
  let selected_unit = $state<string>(
    untrack(() => resolve_display_unit(category, settings_store.unit_preferences)),
  );

  // ---------------------------------------------------------------------------
  // Re-sync selected_unit when settings finish loading (or preferences change).
  // Only update if the current selected_unit is no longer a valid option for
  // this category (e.g. settings loaded after mount with a different default).
  // ---------------------------------------------------------------------------

  $effect(() => {
    const pref = resolve_display_unit(category, settings_store.unit_preferences);
    const valid_values = UNIT_OPTIONS[category].map((o: UnitOption) => o.value);
    if (valid_values.includes(pref) && !valid_values.includes(selected_unit)) {
      selected_unit = pref;
    }
  });

  // ---------------------------------------------------------------------------
  // Derived display value — recalculates when canonical value or unit changes
  // ---------------------------------------------------------------------------

  const effective_precision = $derived(
    precision !== void 0 ? precision : DEFAULT_PRECISION[category],
  );

  const display_value = $derived(
    parseFloat(
      from_canonical(value, category, selected_unit).toFixed(effective_precision),
    ),
  );

  const unit_options = $derived(UNIT_OPTIONS[category]);

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  function handle_input(e: Event): void {
    const raw = (e.target as HTMLInputElement).value;
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      onchange(to_canonical(parsed, category, selected_unit));
    }
  }

  function handle_unit_change(e: Event): void {
    selected_unit = (e.target as HTMLSelectElement).value;
    // The canonical value does not change — display_value re-derives automatically.
  }
</script>

<div
  class="unit_input"
  data-testid={data_testid ? `${data_testid}-wrapper` : void 0}
>
  <input
    type="number"
    class="unit_input_field"
    value={display_value}
    oninput={handle_input}
    {step}
    {min}
    {max}
    {disabled}
    data-testid={data_testid}
  />
  <select
    class="unit_input_select"
    data-testid={data_testid ? `${data_testid}-unit` : void 0}
    onchange={handle_unit_change}
    {disabled}
  >
    {#each unit_options as option (option.value)}
      <option value={option.value} selected={option.value === selected_unit}>
        {option.suffix}
      </option>
    {/each}
  </select>
</div>

<style>
  /* ---------------------------------------------------------------------------
    Wrapper — input and select sit side by side
  --------------------------------------------------------------------------- */

  .unit_input {
    display: flex;
    gap: var(--spacing-xs);
    align-items: center;
  }

  /* ---------------------------------------------------------------------------
    Numeric input
  --------------------------------------------------------------------------- */

  .unit_input_field {
    flex: 1;
    min-width: 0;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-family: inherit;
    text-align: right;
    font-variant-numeric: tabular-nums;
    transition:
      border-color var(--duration-fast) var(--easing-base),
      background var(--duration-fast) var(--easing-base);
    outline: none;
    /* Remove browser spinner arrows */
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .unit_input_field::-webkit-inner-spin-button,
  .unit_input_field::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .unit_input_field:hover:not(:disabled) {
    border-color: var(--color-border);
    background: var(--color-background);
  }

  .unit_input_field:focus:not(:disabled) {
    border-color: var(--color-accent);
    background: var(--color-background);
  }

  .unit_input_field:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ---------------------------------------------------------------------------
    Unit selector dropdown
  --------------------------------------------------------------------------- */

  .unit_input_select {
    flex-shrink: 0;
    padding: var(--spacing-xs) var(--spacing-xl) var(--spacing-xs) var(--spacing-sm);
    background: transparent;
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-family: inherit;
    cursor: pointer;
    transition:
      border-color var(--duration-fast) var(--easing-base),
      background var(--duration-fast) var(--easing-base);
    outline: none;
    /* Custom chevron */
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23a0a0a0'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--spacing-sm) center;
  }

  .unit_input_select:hover:not(:disabled) {
    border-color: var(--color-border);
    background-color: var(--color-background);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23a0a0a0'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--spacing-sm) center;
  }

  .unit_input_select:focus:not(:disabled) {
    border-color: var(--color-accent);
    background-color: var(--color-background);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23a0a0a0'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--spacing-sm) center;
  }

  .unit_input_select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
