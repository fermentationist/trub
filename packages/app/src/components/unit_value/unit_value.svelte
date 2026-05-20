<script lang="ts">
  import type { UnitCategory } from "@trub/types";
  import { from_canonical } from "@trub/calc";
  import { settings_store } from "../../stores/settings_store.svelte";
  import {
    resolve_display_unit,
    get_unit_suffix,
    DEFAULT_PRECISION,
  } from "../../lib/constants/UNITS";

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    value: number;
    category: UnitCategory;
    precision?: number;
    show_suffix?: boolean;
    data_testid?: string;
  }

  const {
    value,
    category,
    precision,
    show_suffix = true,
    data_testid,
  }: Props = $props();

  // ---------------------------------------------------------------------------
  // Derived — display unit from global preferences
  // ---------------------------------------------------------------------------

  const display_unit = $derived(
    resolve_display_unit(category, settings_store.unit_preferences),
  );

  // ---------------------------------------------------------------------------
  // Derived — effective precision
  //
  // The precedence is: explicit prop > gravity special-case > category default.
  // Gravity SG uses 3 decimal places; Plato uses 1. Both of those are
  // overridden by an explicit precision prop when the caller provides one.
  // ---------------------------------------------------------------------------

  const effective_precision = $derived((): number => {
    if (precision !== void 0) {
      return precision;
    }
    if (category === "GRAVITY") {
      return display_unit === "Plato" ? 1 : 3;
    }
    return DEFAULT_PRECISION[category];
  });

  // ---------------------------------------------------------------------------
  // Derived — formatted text
  //
  // lb_oz compound display:
  //   from_canonical returns decimal pounds for "lb_oz".
  //   Split into whole pounds and ounces. If ounces round to 16, roll up.
  // ---------------------------------------------------------------------------

  const formatted_text = $derived((): string => {
    if (category === "GRAIN_WEIGHT" && display_unit === "lb_oz") {
      const decimal_lb = from_canonical(value, category, "lb_oz");
      let pounds = Math.floor(decimal_lb);
      let ounces = Math.round((decimal_lb - pounds) * 16);

      if (ounces === 16) {
        pounds += 1;
        ounces = 0;
      }

      return `${pounds} lb ${ounces} oz`;
    }

    const converted = from_canonical(value, category, display_unit);
    const numeric_part = converted.toFixed(effective_precision());

    if (!show_suffix) {
      return numeric_part;
    }

    const suffix = get_unit_suffix(category, display_unit);
    return suffix.length > 0 ? `${numeric_part} ${suffix}` : numeric_part;
  });

</script>

<span class="unit_value" data-testid={data_testid}>{formatted_text()}</span>

<style>
  .unit_value {
    font-variant-numeric: tabular-nums;
    color: inherit;
    font-size: inherit;
    font-weight: inherit;
  }
</style>
