<script lang="ts">
  import type { WaterAdjustment, FermentableEntry, MashPhFormula } from "@trub/types";
  import {
    calculate_resulting_profile,
    calculate_sulfate_chloride_ratio,
    describe_sulfate_chloride_ratio,
    calculate_mash_ph_brun_water,
    calculate_mash_ph_kaiser,
  } from "@trub/calc";
  import type { MineralProfile } from "@trub/calc";

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  // Distilled water source profile — all zeros. Will be replaced with a
  // selectable profile when Water Profile CRUD lands in a later phase.
  const DISTILLED_WATER: Pick<
    MineralProfile,
    | "calcium_ppm"
    | "magnesium_ppm"
    | "sodium_ppm"
    | "sulfate_ppm"
    | "chloride_ppm"
    | "bicarbonate_ppm"
  > = {
    calcium_ppm: 0,
    magnesium_ppm: 0,
    sodium_ppm: 0,
    sulfate_ppm: 0,
    chloride_ppm: 0,
    bicarbonate_ppm: 0,
  };

  const FORMULA_LABELS: Record<MashPhFormula, string> = {
    brun_water: "Bru'n Water",
    kaiser: "Kaiser",
  };

  // Mineral target ranges for styling guidance (ppm)
  // Low / high thresholds used to flag out-of-range values as warnings.
  const MINERAL_RANGES: Record<
    keyof Omit<MineralProfile, never>,
    { low: number; high: number }
  > = {
    calcium_ppm: { low: 50, high: 150 },
    magnesium_ppm: { low: 0, high: 30 },
    sodium_ppm: { low: 0, high: 150 },
    sulfate_ppm: { low: 0, high: 350 },
    chloride_ppm: { low: 0, high: 250 },
    bicarbonate_ppm: { low: 0, high: 300 },
  };

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    water_adjustments: WaterAdjustment;
    fermentables: FermentableEntry[];
    batch_size_l: number;
    mash_ph_formula: MashPhFormula;
    onupdate_adjustments: (adjustments: WaterAdjustment) => void;
  }

  const {
    water_adjustments,
    fermentables,
    batch_size_l,
    mash_ph_formula,
    onupdate_adjustments,
  }: Props = $props();

  // ---------------------------------------------------------------------------
  // Derived: resulting mineral profile
  // ---------------------------------------------------------------------------

  const resulting_profile = $derived(
    calculate_resulting_profile(DISTILLED_WATER, water_adjustments, batch_size_l),
  );

  // ---------------------------------------------------------------------------
  // Derived: sulfate:chloride ratio and descriptor
  // ---------------------------------------------------------------------------

  const sc_ratio = $derived(
    calculate_sulfate_chloride_ratio(
      resulting_profile.sulfate_ppm,
      resulting_profile.chloride_ppm,
    ),
  );

  const sc_descriptor = $derived(describe_sulfate_chloride_ratio(sc_ratio));

  // ---------------------------------------------------------------------------
  // Derived: mash pH
  // ---------------------------------------------------------------------------

  const mash_ph = $derived(
    mash_ph_formula === "kaiser"
      ? calculate_mash_ph_kaiser(
          fermentables,
          resulting_profile,
          batch_size_l,
          water_adjustments.lactic_acid_ml,
          water_adjustments.phosphoric_acid_ml,
          water_adjustments.acidulated_malt_g,
        )
      : calculate_mash_ph_brun_water(
          fermentables,
          resulting_profile,
          batch_size_l,
          water_adjustments.lactic_acid_ml,
          water_adjustments.phosphoric_acid_ml,
          water_adjustments.acidulated_malt_g,
        ),
  );

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function parse_number(raw: string): number {
    const parsed = parseFloat(raw);
    return isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  function handle_salt_change(
    field: keyof WaterAdjustment,
    raw: string,
  ): void {
    onupdate_adjustments({
      ...water_adjustments,
      [field]: parse_number(raw),
    });
  }

  function mineral_status(
    key: keyof MineralProfile,
    value: number,
  ): "normal" | "warning" {
    const range = MINERAL_RANGES[key];
    if (value > range.high) {
      return "warning";
    }
    return "normal";
  }

  function format_ratio(ratio: number): string {
    if (!isFinite(ratio)) {
      return "\u221E";
    }
    return ratio.toFixed(1);
  }

  function ph_status(ph: number): "normal" | "warning" | "error" {
    if (ph >= 5.2 && ph <= 5.6) {
      return "normal";
    }
    if (ph >= 5.0 && ph < 5.2) {
      return "warning";
    }
    if (ph > 5.6 && ph <= 5.8) {
      return "warning";
    }
    return "error";
  }
</script>

<section class="water-chemistry-section" data-testid="water-chemistry-section">
  <!-- ---------------------------------------------------------------------------
    Header
  --------------------------------------------------------------------------- -->
  <header class="section-header">
    <h2 class="section-title">Water Chemistry</h2>
  </header>

  <!-- ---------------------------------------------------------------------------
    Salt Additions
  --------------------------------------------------------------------------- -->
  <div class="subsection">
    <h3 class="subsection-title">Salt Additions</h3>

    <div class="salt-grid">
      <!-- Gypsum -->
      <label class="salt-label" for="salt-gypsum">
        Gypsum <span class="chemical-formula">(CaSO&#x2084;)</span>
      </label>
      <div class="salt-input-group">
        <input
          id="salt-gypsum"
          class="salt-input"
          data-testid="salt-gypsum-input"
          type="number"
          min="0"
          step="0.1"
          value={water_adjustments.gypsum_g}
          oninput={(e) =>
            handle_salt_change("gypsum_g", (e.target as HTMLInputElement).value)}
        />
        <span class="salt-unit">g</span>
      </div>

      <!-- Calcium Chloride -->
      <label class="salt-label" for="salt-calcium-chloride">
        Calcium Chloride <span class="chemical-formula">(CaCl&#x2082;)</span>
      </label>
      <div class="salt-input-group">
        <input
          id="salt-calcium-chloride"
          class="salt-input"
          data-testid="salt-calcium-chloride-input"
          type="number"
          min="0"
          step="0.1"
          value={water_adjustments.calcium_chloride_g}
          oninput={(e) =>
            handle_salt_change(
              "calcium_chloride_g",
              (e.target as HTMLInputElement).value,
            )}
        />
        <span class="salt-unit">g</span>
      </div>

      <!-- Epsom Salt -->
      <label class="salt-label" for="salt-epsom">
        Epsom Salt <span class="chemical-formula">(MgSO&#x2084;)</span>
      </label>
      <div class="salt-input-group">
        <input
          id="salt-epsom"
          class="salt-input"
          data-testid="salt-epsom-input"
          type="number"
          min="0"
          step="0.1"
          value={water_adjustments.epsom_salt_g}
          oninput={(e) =>
            handle_salt_change(
              "epsom_salt_g",
              (e.target as HTMLInputElement).value,
            )}
        />
        <span class="salt-unit">g</span>
      </div>

      <!-- Baking Soda -->
      <label class="salt-label" for="salt-baking-soda">
        Baking Soda <span class="chemical-formula">(NaHCO&#x2083;)</span>
      </label>
      <div class="salt-input-group">
        <input
          id="salt-baking-soda"
          class="salt-input"
          data-testid="salt-baking-soda-input"
          type="number"
          min="0"
          step="0.1"
          value={water_adjustments.baking_soda_g}
          oninput={(e) =>
            handle_salt_change(
              "baking_soda_g",
              (e.target as HTMLInputElement).value,
            )}
        />
        <span class="salt-unit">g</span>
      </div>

      <!-- Chalk -->
      <label class="salt-label" for="salt-chalk">
        Chalk <span class="chemical-formula">(CaCO&#x2083;)</span>
      </label>
      <div class="salt-input-group">
        <input
          id="salt-chalk"
          class="salt-input"
          data-testid="salt-chalk-input"
          type="number"
          min="0"
          step="0.1"
          value={water_adjustments.chalk_g}
          oninput={(e) =>
            handle_salt_change("chalk_g", (e.target as HTMLInputElement).value)}
        />
        <span class="salt-unit">g</span>
      </div>

      <!-- Table Salt -->
      <label class="salt-label" for="salt-table-salt">
        Table Salt <span class="chemical-formula">(NaCl)</span>
      </label>
      <div class="salt-input-group">
        <input
          id="salt-table-salt"
          class="salt-input"
          data-testid="salt-table-salt-input"
          type="number"
          min="0"
          step="0.1"
          value={water_adjustments.table_salt_g}
          oninput={(e) =>
            handle_salt_change(
              "table_salt_g",
              (e.target as HTMLInputElement).value,
            )}
        />
        <span class="salt-unit">g</span>
      </div>

      <!-- Lactic Acid -->
      <label class="salt-label" for="acid-lactic">
        Lactic Acid <span class="chemical-formula">(88%)</span>
      </label>
      <div class="salt-input-group">
        <input
          id="acid-lactic"
          class="salt-input"
          data-testid="acid-lactic-input"
          type="number"
          min="0"
          step="0.1"
          value={water_adjustments.lactic_acid_ml}
          oninput={(e) =>
            handle_salt_change(
              "lactic_acid_ml",
              (e.target as HTMLInputElement).value,
            )}
        />
        <span class="salt-unit">mL</span>
      </div>

      <!-- Phosphoric Acid -->
      <label class="salt-label" for="acid-phosphoric">
        Phosphoric Acid <span class="chemical-formula">(10%)</span>
      </label>
      <div class="salt-input-group">
        <input
          id="acid-phosphoric"
          class="salt-input"
          data-testid="acid-phosphoric-input"
          type="number"
          min="0"
          step="0.1"
          value={water_adjustments.phosphoric_acid_ml}
          oninput={(e) =>
            handle_salt_change(
              "phosphoric_acid_ml",
              (e.target as HTMLInputElement).value,
            )}
        />
        <span class="salt-unit">mL</span>
      </div>

      <!-- Acidulated Malt -->
      <label class="salt-label" for="acid-acidulated-malt">
        Acidulated Malt
      </label>
      <div class="salt-input-group">
        <input
          id="acid-acidulated-malt"
          class="salt-input"
          data-testid="acid-acidulated-malt-input"
          type="number"
          min="0"
          step="0.1"
          value={water_adjustments.acidulated_malt_g}
          oninput={(e) =>
            handle_salt_change(
              "acidulated_malt_g",
              (e.target as HTMLInputElement).value,
            )}
        />
        <span class="salt-unit">g</span>
      </div>
    </div>
  </div>

  <!-- ---------------------------------------------------------------------------
    Resulting Water Profile
  --------------------------------------------------------------------------- -->
  <div class="subsection">
    <h3 class="subsection-title">Resulting Water Profile</h3>

    <div class="mineral-grid">
      <!-- Ca -->
      <div
        class="mineral-cell mineral-cell--{mineral_status('calcium_ppm', resulting_profile.calcium_ppm)}"
        data-testid="mineral-calcium"
      >
        <span class="mineral-symbol">Ca</span>
        <span class="mineral-value">
          {Math.round(resulting_profile.calcium_ppm)}
        </span>
        <span class="mineral-unit">ppm</span>
      </div>

      <!-- Mg -->
      <div
        class="mineral-cell mineral-cell--{mineral_status('magnesium_ppm', resulting_profile.magnesium_ppm)}"
        data-testid="mineral-magnesium"
      >
        <span class="mineral-symbol">Mg</span>
        <span class="mineral-value">
          {Math.round(resulting_profile.magnesium_ppm)}
        </span>
        <span class="mineral-unit">ppm</span>
      </div>

      <!-- Na -->
      <div
        class="mineral-cell mineral-cell--{mineral_status('sodium_ppm', resulting_profile.sodium_ppm)}"
        data-testid="mineral-sodium"
      >
        <span class="mineral-symbol">Na</span>
        <span class="mineral-value">
          {Math.round(resulting_profile.sodium_ppm)}
        </span>
        <span class="mineral-unit">ppm</span>
      </div>

      <!-- SO₄ -->
      <div
        class="mineral-cell mineral-cell--{mineral_status('sulfate_ppm', resulting_profile.sulfate_ppm)}"
        data-testid="mineral-sulfate"
      >
        <span class="mineral-symbol">SO&#x2084;</span>
        <span class="mineral-value">
          {Math.round(resulting_profile.sulfate_ppm)}
        </span>
        <span class="mineral-unit">ppm</span>
      </div>

      <!-- Cl -->
      <div
        class="mineral-cell mineral-cell--{mineral_status('chloride_ppm', resulting_profile.chloride_ppm)}"
        data-testid="mineral-chloride"
      >
        <span class="mineral-symbol">Cl</span>
        <span class="mineral-value">
          {Math.round(resulting_profile.chloride_ppm)}
        </span>
        <span class="mineral-unit">ppm</span>
      </div>

      <!-- HCO₃ -->
      <div
        class="mineral-cell mineral-cell--{mineral_status('bicarbonate_ppm', resulting_profile.bicarbonate_ppm)}"
        data-testid="mineral-bicarbonate"
      >
        <span class="mineral-symbol">HCO&#x2083;</span>
        <span class="mineral-value">
          {Math.round(resulting_profile.bicarbonate_ppm)}
        </span>
        <span class="mineral-unit">ppm</span>
      </div>
    </div>

    <!-- Sulfate:Chloride ratio -->
    <div class="ratio-row">
      <span class="ratio-label">SO&#x2084;:Cl</span>
      <span class="ratio-equals">=</span>
      <span class="ratio-value" data-testid="sulfate-chloride-ratio">
        {format_ratio(sc_ratio)}
      </span>
      <span
        class="ratio-descriptor"
        data-testid="sulfate-chloride-descriptor"
      >
        ({sc_descriptor})
      </span>
    </div>
  </div>

  <!-- ---------------------------------------------------------------------------
    Mash pH
  --------------------------------------------------------------------------- -->
  <div class="subsection subsection--ph">
    <div class="ph-row">
      <span class="ph-label">Mash pH</span>
      <span
        class="ph-value ph-value--{ph_status(mash_ph)}"
        data-testid="mash-ph-value"
      >
        {mash_ph.toFixed(2)}
      </span>
      <span class="ph-formula" data-testid="mash-ph-formula-label">
        {FORMULA_LABELS[mash_ph_formula]}
      </span>
    </div>
    <p class="ph-hint">Target range: 5.2 – 5.6</p>
  </div>
</section>

<style>
  /* ---------------------------------------------------------------------------
    Section shell
  --------------------------------------------------------------------------- */

  .water-chemistry-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
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

  /* ---------------------------------------------------------------------------
    Subsections
  --------------------------------------------------------------------------- */

  .subsection {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }

  .subsection-title {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ---------------------------------------------------------------------------
    Salt grid — two-column label/input layout
  --------------------------------------------------------------------------- */

  .salt-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: var(--spacing-xs) var(--spacing-md);
  }

  .salt-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    cursor: default;
  }

  .chemical-formula {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  .salt-input-group {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .salt-input {
    width: 72px;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-background);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    font-family: inherit;
    text-align: right;
    font-variant-numeric: tabular-nums;
    outline: none;
    transition:
      border-color var(--duration-fast) var(--easing-base),
      background var(--duration-fast) var(--easing-base);
    /* Hide browser spinners */
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .salt-input::-webkit-inner-spin-button,
  .salt-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .salt-input:hover {
    border-color: var(--color-accent);
  }

  .salt-input:focus {
    border-color: var(--color-accent);
    background: var(--color-surface-raised);
  }

  .salt-unit {
    min-width: 24px;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-align: left;
  }

  /* ---------------------------------------------------------------------------
    Mineral profile grid
  --------------------------------------------------------------------------- */

  .mineral-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: var(--spacing-sm);
  }

  @media (max-width: 600px) {
    .mineral-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .mineral-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: var(--spacing-sm) var(--spacing-xs);
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }

  .mineral-cell--warning {
    border-color: var(--color-warning);
    background: color-mix(in srgb, var(--color-warning) 8%, var(--color-surface-raised));
  }

  .mineral-symbol {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .mineral-value {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    font-variant-numeric: tabular-nums;
  }

  .mineral-unit {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  /* ---------------------------------------------------------------------------
    Sulfate:Chloride ratio
  --------------------------------------------------------------------------- */

  .ratio-row {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-xs);
    padding-top: var(--spacing-sm);
    border-top: 1px solid var(--color-border);
    font-size: var(--font-size-sm);
  }

  .ratio-label {
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }

  .ratio-equals {
    color: var(--color-text-secondary);
  }

  .ratio-value {
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    font-variant-numeric: tabular-nums;
  }

  .ratio-descriptor {
    color: var(--color-text-secondary);
    font-style: italic;
  }

  /* ---------------------------------------------------------------------------
    Mash pH
  --------------------------------------------------------------------------- */

  .subsection--ph {
    gap: var(--spacing-xs);
  }

  .ph-row {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-sm);
  }

  .ph-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }

  .ph-value {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .ph-value--normal {
    color: var(--color-success);
  }

  .ph-value--warning {
    color: var(--color-warning);
  }

  .ph-value--error {
    color: var(--color-error);
  }

  .ph-formula {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .ph-hint {
    margin: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }
</style>
