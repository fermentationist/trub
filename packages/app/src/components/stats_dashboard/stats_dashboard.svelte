<script lang="ts">
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
  import type {
    FermentableEntry,
    YeastEntry,
    AbvFormula,
    HopEntry,
    IbuFormula,
    ColorFormula,
  } from "@trub/types";

  const DEFAULT_ATTENUATION_PCT = 75;

  interface Props {
    fermentables: FermentableEntry[];
    yeast: YeastEntry[];
    hops: HopEntry[];
    batch_size_l: number;
    efficiency_pct: number;
    abv_formula: AbvFormula;
    ibu_formula: IbuFormula;
    color_formula: ColorFormula;
  }

  const {
    fermentables,
    yeast,
    hops,
    batch_size_l,
    efficiency_pct,
    abv_formula,
    ibu_formula,
    color_formula,
  }: Props = $props();

  // Derive average attenuation from all yeast entries; fall back to default when
  // no yeast has been added yet so downstream calcs always have a valid input.
  const avg_attenuation_pct = $derived(
    yeast.length > 0
      ? yeast.reduce((sum, y) => sum + y.attenuation_pct, 0) / yeast.length
      : DEFAULT_ATTENUATION_PCT,
  );

  const og = $derived(calculate_og(fermentables, batch_size_l, efficiency_pct));

  const fg = $derived(calculate_fg(og, avg_attenuation_pct));

  const abv = $derived(
    abv_formula === "alternate"
      ? calculate_abv_alternate(og, fg)
      : calculate_abv_simple(og, fg),
  );

  const ibu = $derived(
    ibu_formula === "rager"
      ? calculate_ibu_rager(hops, og, batch_size_l)
      : ibu_formula === "mibu"
        ? calculate_ibu_mibu(hops, og, batch_size_l)
        : calculate_ibu_tinseth(hops, og, batch_size_l),
  );

  const srm = $derived(
    color_formula === "daniels"
      ? calculate_srm_daniels(fermentables, batch_size_l)
      : color_formula === "mosher"
        ? calculate_srm_mosher(fermentables, batch_size_l)
        : calculate_srm_morey(fermentables, batch_size_l),
  );

  const beer_color = $derived(srm_to_css_color(srm));

  // Formatting helpers keep display logic out of the template.
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
</script>

<section class="stats_dashboard" data-testid="stats-dashboard">
  <div class="stat_box" data-testid="stat-box-og">
    <span class="stat_label" data-testid="stat-label-og">OG</span>
    <span class="stat_value" data-testid="stat-og-value">{format_gravity(og)}</span>
  </div>

  <div class="stat_box" data-testid="stat-box-fg">
    <span class="stat_label" data-testid="stat-label-fg">FG</span>
    <span class="stat_value" data-testid="stat-fg-value">{format_gravity(fg)}</span>
  </div>

  <div class="stat_box" data-testid="stat-box-abv">
    <span class="stat_label" data-testid="stat-label-abv">ABV</span>
    <span class="stat_value" data-testid="stat-abv-value">{format_abv(abv)}</span>
  </div>

  <div class="stat_box" data-testid="stat-box-ibu">
    <span class="stat_label" data-testid="stat-label-ibu">IBU</span>
    <span class="stat_value" data-testid="stat-ibu-value">{format_ibu(ibu)}</span>
  </div>

  <div class="stat_box" data-testid="stat-box-srm">
    <span class="stat_label" data-testid="stat-label-srm">SRM</span>
    <div class="srm_display">
      <span class="stat_value" data-testid="stat-srm-value">{format_srm(srm)}</span>
      <span
        class="color_swatch"
        data-testid="color-swatch"
        style="background-color: {beer_color}"
      ></span>
    </div>
  </div>
</section>

<style>
  .stats_dashboard {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }

  .stat_box {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }

  .stat_label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .stat_value {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);
  }

  .srm_display {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .color_swatch {
    display: inline-block;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    border: 1px solid var(--color-border);
    flex-shrink: 0;
  }
</style>
