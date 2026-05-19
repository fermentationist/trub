import { describe, it, expect } from "vitest";
import {
  calculate_residual_alkalinity,
  calculate_mash_ph_brun_water,
  calculate_mash_ph_kaiser,
} from "../mash_ph";
import type { MineralProfile } from "../water";

// ---------------------------------------------------------------------------
// Shared constants (mirror of mash_ph.ts internals — used only to derive
// expected values in test comments; tests assert on computed results)
//
// BASE_MALT_DI_PH        = 5.72
// BASE_MALT_LOVIBOND     = 1.8
// BRUN_WATER_COLOR_COEFF = 0.01
// KAISER_COLOR_COEFF     = 0.012
// ALKALINITY_PH_FACTOR   = 0.00168
// LACTIC_ACID_STRENGTH   = 11.46  mEq/mL
// PHOSPHORIC_ACID_STRENGTH = 1.53 mEq/mL
// ACIDULATED_MALT_STRENGTH = 0.344 mEq/g
// ACID_PH_FACTOR         = 0.05
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const distilled_water: Pick<
  MineralProfile,
  "calcium_ppm" | "magnesium_ppm" | "bicarbonate_ppm"
> = {
  calcium_ppm: 0,
  magnesium_ppm: 0,
  bicarbonate_ppm: 0,
};

const high_alkalinity_water: Pick<
  MineralProfile,
  "calcium_ppm" | "magnesium_ppm" | "bicarbonate_ppm"
> = {
  calcium_ppm: 0,
  magnesium_ppm: 0,
  bicarbonate_ppm: 200,
};

const high_calcium_water: Pick<
  MineralProfile,
  "calcium_ppm" | "magnesium_ppm" | "bicarbonate_ppm"
> = {
  calcium_ppm: 200,
  magnesium_ppm: 0,
  bicarbonate_ppm: 0,
};

const pale_malt = (amount_kg: number) => ({
  amount_kg,
  color_lovibond: 1.8,
});

const crystal_60 = (amount_kg: number) => ({
  amount_kg,
  color_lovibond: 60,
});

const roasted_barley = (amount_kg: number) => ({
  amount_kg,
  color_lovibond: 300,
});

// ---------------------------------------------------------------------------
// calculate_residual_alkalinity
// ---------------------------------------------------------------------------

describe("calculate_residual_alkalinity", () => {
  it("returns 0 for a zero-mineral profile (distilled water)", () => {
    expect(
      calculate_residual_alkalinity({
        calcium_ppm: 0,
        magnesium_ppm: 0,
        bicarbonate_ppm: 0,
      }),
    ).toBeCloseTo(0, 4);
  });

  it("high bicarbonate with no Ca/Mg yields positive RA", () => {
    // alkalinity = 200 * 50/61 ≈ 163.93; RA = 163.93 - 0 - 0 = 163.93
    const ra = calculate_residual_alkalinity({
      calcium_ppm: 0,
      magnesium_ppm: 0,
      bicarbonate_ppm: 200,
    });
    expect(ra).toBeGreaterThan(0);
    expect(ra).toBeCloseTo(163.93, 1);
  });

  it("high calcium with no bicarbonate yields negative RA", () => {
    // alkalinity = 0; RA = 0 - (100/1.4) - 0 = -71.43
    const ra = calculate_residual_alkalinity({
      calcium_ppm: 100,
      magnesium_ppm: 0,
      bicarbonate_ppm: 0,
    });
    expect(ra).toBeLessThan(0);
    expect(ra).toBeCloseTo(-71.43, 1);
  });

  it("high magnesium with no bicarbonate yields negative RA", () => {
    // RA = 0 - 0 - (100/1.7) = -58.82
    const ra = calculate_residual_alkalinity({
      calcium_ppm: 0,
      magnesium_ppm: 100,
      bicarbonate_ppm: 0,
    });
    expect(ra).toBeLessThan(0);
    expect(ra).toBeCloseTo(-58.82, 1);
  });

  it("balanced profile: Ca and Mg partially offset bicarbonate alkalinity", () => {
    // alkalinity = 100 * 50/61 ≈ 81.97
    // Ca offset = 50/1.4 ≈ 35.71
    // Mg offset = 10/1.7 ≈ 5.88
    // RA ≈ 81.97 - 35.71 - 5.88 = 40.38
    const ra = calculate_residual_alkalinity({
      calcium_ppm: 50,
      magnesium_ppm: 10,
      bicarbonate_ppm: 100,
    });
    expect(ra).toBeCloseTo(40.38, 1);
  });

  it("RA increases linearly with bicarbonate", () => {
    const ra_100 = calculate_residual_alkalinity({
      calcium_ppm: 0,
      magnesium_ppm: 0,
      bicarbonate_ppm: 100,
    });
    const ra_200 = calculate_residual_alkalinity({
      calcium_ppm: 0,
      magnesium_ppm: 0,
      bicarbonate_ppm: 200,
    });
    expect(ra_200).toBeCloseTo(ra_100 * 2, 4);
  });

  it("RA decreases as calcium increases (Ca lowers alkalinity)", () => {
    const ra_low_ca = calculate_residual_alkalinity({
      calcium_ppm: 50,
      magnesium_ppm: 0,
      bicarbonate_ppm: 150,
    });
    const ra_high_ca = calculate_residual_alkalinity({
      calcium_ppm: 150,
      magnesium_ppm: 0,
      bicarbonate_ppm: 150,
    });
    expect(ra_high_ca).toBeLessThan(ra_low_ca);
  });
});

// ---------------------------------------------------------------------------
// calculate_mash_ph_brun_water
// ---------------------------------------------------------------------------

describe("calculate_mash_ph_brun_water", () => {
  it("returns base pH 5.72 for empty fermentables array", () => {
    expect(
      calculate_mash_ph_brun_water([], distilled_water, 20, 0, 0, 0),
    ).toBe(5.72);
  });

  it("returns base pH 5.72 when mash volume is zero", () => {
    expect(
      calculate_mash_ph_brun_water(
        [pale_malt(4)],
        distilled_water,
        0,
        0,
        0,
        0,
      ),
    ).toBe(5.72);
  });

  it("returns base pH 5.72 when mash volume is negative", () => {
    expect(
      calculate_mash_ph_brun_water(
        [pale_malt(4)],
        distilled_water,
        -10,
        0,
        0,
        0,
      ),
    ).toBe(5.72);
  });

  // All-pale malt (1.8 Lovibond) with distilled water:
  // avg_color = 1.8, color_delta = 0
  // grain_ph = 5.72 - 0 = 5.72
  // RA = 0 → water_ph_shift = 0
  // acid_shift = 0
  // result = 5.72
  it("all-pale malt with distilled water returns exactly 5.72", () => {
    const result = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    expect(result).toBeCloseTo(5.72, 4);
  });

  it("darker grain bill produces lower pH than pale-only bill (Bru'n Water)", () => {
    const pale_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const dark_ph = calculate_mash_ph_brun_water(
      [pale_malt(4), crystal_60(1)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    expect(dark_ph).toBeLessThan(pale_ph);
  });

  it("very dark grain bill (roasted barley) produces significantly lower pH", () => {
    const pale_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const stout_ph = calculate_mash_ph_brun_water(
      [pale_malt(3), roasted_barley(2)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    // avg_color = (3*1.8 + 2*300)/5 = (5.4+600)/5 = 121.08
    // color_delta = 121.08 - 1.8 = 119.28
    // grain_ph = 5.72 - 119.28*0.01 = 5.72 - 1.1928 = 4.5272
    expect(stout_ph).toBeCloseTo(4.527, 2);
    expect(stout_ph).toBeLessThan(pale_ph - 1);
  });

  // High-alkalinity water: bicarbonate=200, Ca=0, Mg=0
  // RA = 200*50/61 ≈ 163.93
  // water_ph_shift = 163.93 * 0.00168 ≈ 0.2754
  it("high-alkalinity water raises mash pH above distilled-water baseline", () => {
    const distilled_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const alkaline_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      high_alkalinity_water,
      20,
      0,
      0,
      0,
    );
    expect(alkaline_ph).toBeGreaterThan(distilled_ph);
    expect(alkaline_ph).toBeCloseTo(distilled_ph + 0.275, 2);
  });

  it("high-calcium water lowers mash pH below distilled-water baseline (negative RA)", () => {
    const distilled_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const ca_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      high_calcium_water,
      20,
      0,
      0,
      0,
    );
    expect(ca_ph).toBeLessThan(distilled_ph);
  });

  // Lactic acid: 1mL in 10L mash
  // shift = -(1 * 11.46 / 10) * 0.05 = -0.0573
  it("lactic acid addition lowers mash pH", () => {
    const base_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      0,
      0,
    );
    const acid_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      1,
      0,
      0,
    );
    expect(acid_ph).toBeLessThan(base_ph);
    expect(acid_ph).toBeCloseTo(base_ph - 0.0573, 3);
  });

  // Phosphoric acid: 1mL in 10L mash
  // shift = -(1 * 1.53 / 10) * 0.05 = -0.00765
  it("phosphoric acid addition lowers mash pH", () => {
    const base_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      0,
      0,
    );
    const acid_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      1,
      0,
    );
    expect(acid_ph).toBeLessThan(base_ph);
    expect(acid_ph).toBeCloseTo(base_ph - 0.00765, 4);
  });

  // Acidulated malt: 100g in 10L mash
  // shift = -(100 * 0.344 / 10) * 0.05 = -0.172
  it("acidulated malt addition lowers mash pH", () => {
    const base_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      0,
      0,
    );
    const acid_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      0,
      100,
    );
    expect(acid_ph).toBeLessThan(base_ph);
    expect(acid_ph).toBeCloseTo(base_ph - 0.172, 3);
  });

  it("lactic acid effect is stronger than phosphoric acid for the same volume", () => {
    const lactic_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      1,
      0,
      0,
    );
    const phosphoric_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      1,
      0,
    );
    // Lactic: 11.46 mEq/mL vs Phosphoric: 1.53 mEq/mL — lactic lowers pH more
    expect(lactic_ph).toBeLessThan(phosphoric_ph);
  });

  it("acid additions combine additively in their pH-lowering effect", () => {
    const lactic_only = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      1,
      0,
      0,
    );
    const phosphoric_only = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      1,
      0,
    );
    const combined = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      1,
      1,
      0,
    );
    const base = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      0,
      0,
    );
    const expected_combined =
      base + (lactic_only - base) + (phosphoric_only - base);
    expect(combined).toBeCloseTo(expected_combined, 4);
  });

  it("larger mash volume dilutes acid effect: more volume → less pH drop per mL", () => {
    const small_volume_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      5,
      1,
      0,
      0,
    );
    const large_volume_ph = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      20,
      1,
      0,
      0,
    );
    // 5L mash → bigger pH drop per mL than 20L mash
    expect(small_volume_ph).toBeLessThan(large_volume_ph);
  });

  it("pH stays within reasonable brewing range (4.0–7.0) for typical inputs", () => {
    const inputs = [
      { fermentables: [pale_malt(5)], water: distilled_water, lactic: 0 },
      { fermentables: [pale_malt(4), crystal_60(1)], water: distilled_water, lactic: 1 },
      { fermentables: [pale_malt(5)], water: high_alkalinity_water, lactic: 0 },
      { fermentables: [pale_malt(3), roasted_barley(1)], water: distilled_water, lactic: 0 },
    ];
    for (const { fermentables, water, lactic } of inputs) {
      const ph = calculate_mash_ph_brun_water(
        fermentables,
        water,
        20,
        lactic,
        0,
        0,
      );
      expect(ph).toBeGreaterThan(4.0);
      expect(ph).toBeLessThan(7.0);
    }
  });

  it("single fermentable: weighted average color equals that grain's color", () => {
    // 5kg crystal 60L with distilled water
    // avg_color = 60, color_delta = 60 - 1.8 = 58.2
    // grain_ph = 5.72 - 58.2 * 0.01 = 5.72 - 0.582 = 5.138
    const result = calculate_mash_ph_brun_water(
      [crystal_60(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    expect(result).toBeCloseTo(5.138, 3);
  });

  it("mixed grain bill: weighted average color shifts pH proportionally", () => {
    // 4kg pale (1.8L) + 1kg crystal60 (60L) = total 5kg
    // avg_color = (4*1.8 + 1*60) / 5 = (7.2 + 60) / 5 = 67.2/5 = 13.44
    // color_delta = 13.44 - 1.8 = 11.64
    // grain_ph = 5.72 - 11.64*0.01 = 5.72 - 0.1164 = 5.6036
    const result = calculate_mash_ph_brun_water(
      [pale_malt(4), crystal_60(1)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    expect(result).toBeCloseTo(5.604, 2);
  });
});

// ---------------------------------------------------------------------------
// calculate_mash_ph_kaiser
// ---------------------------------------------------------------------------

describe("calculate_mash_ph_kaiser", () => {
  it("returns base pH 5.72 for empty fermentables array", () => {
    expect(
      calculate_mash_ph_kaiser([], distilled_water, 20, 0, 0, 0),
    ).toBe(5.72);
  });

  it("returns base pH 5.72 when mash volume is zero", () => {
    expect(
      calculate_mash_ph_kaiser([pale_malt(4)], distilled_water, 0, 0, 0, 0),
    ).toBe(5.72);
  });

  it("returns base pH 5.72 when mash volume is negative", () => {
    expect(
      calculate_mash_ph_kaiser(
        [pale_malt(4)],
        distilled_water,
        -10,
        0,
        0,
        0,
      ),
    ).toBe(5.72);
  });

  // All-pale malt (1.8L) with distilled water:
  // avg_color = 1.8, color_delta = 0 → grain_ph = 5.72
  // RA = 0 → result = 5.72
  it("all-pale malt with distilled water returns exactly 5.72", () => {
    const result = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    expect(result).toBeCloseTo(5.72, 4);
  });

  it("darker grain bill produces lower pH than pale-only bill (Kaiser)", () => {
    const pale_ph = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const dark_ph = calculate_mash_ph_kaiser(
      [pale_malt(4), crystal_60(1)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    expect(dark_ph).toBeLessThan(pale_ph);
  });

  it("lactic acid addition lowers Kaiser mash pH", () => {
    const base_ph = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      0,
      0,
    );
    const acid_ph = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      10,
      1,
      0,
      0,
    );
    expect(acid_ph).toBeLessThan(base_ph);
  });

  it("phosphoric acid addition lowers Kaiser mash pH", () => {
    const base_ph = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      0,
      0,
    );
    const acid_ph = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      1,
      0,
    );
    expect(acid_ph).toBeLessThan(base_ph);
  });

  it("acidulated malt addition lowers Kaiser mash pH", () => {
    const base_ph = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      0,
      0,
    );
    const acid_ph = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      0,
      100,
    );
    expect(acid_ph).toBeLessThan(base_ph);
  });

  it("Kaiser color coefficient (0.012) is higher than Bru'n Water (0.01)", () => {
    // For dark grains, Kaiser should predict lower pH than Bru'n Water
    const brun_ph = calculate_mash_ph_brun_water(
      [pale_malt(3), roasted_barley(2)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const kaiser_ph = calculate_mash_ph_kaiser(
      [pale_malt(3), roasted_barley(2)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    // Kaiser uses 0.012 vs 0.01 — predicts lower pH for dark grains
    expect(kaiser_ph).toBeLessThan(brun_ph);
  });

  it("Kaiser predicts lower pH than Bru'n Water for crystal-heavy grain bill", () => {
    const brun_ph = calculate_mash_ph_brun_water(
      [pale_malt(3), crystal_60(2)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const kaiser_ph = calculate_mash_ph_kaiser(
      [pale_malt(3), crystal_60(2)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    expect(kaiser_ph).toBeLessThan(brun_ph);
  });

  it("Kaiser produces different pH values than Bru'n Water for the same dark inputs", () => {
    const brun = calculate_mash_ph_brun_water(
      [pale_malt(4), crystal_60(1)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const kaiser = calculate_mash_ph_kaiser(
      [pale_malt(4), crystal_60(1)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    expect(kaiser).not.toBeCloseTo(brun, 3);
  });

  // All-pale malt: color_delta = 0 → both models return BASE_MALT_DI_PH = 5.72
  it("both models agree for all-pale malt with distilled water", () => {
    const brun = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const kaiser = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    expect(kaiser).toBeCloseTo(brun, 4);
  });

  it("Kaiser pH stays within reasonable brewing range (4.0–7.0) for typical inputs", () => {
    const inputs = [
      { fermentables: [pale_malt(5)], water: distilled_water, lactic: 0 },
      { fermentables: [pale_malt(4), crystal_60(1)], water: distilled_water, lactic: 1 },
      { fermentables: [pale_malt(5)], water: high_alkalinity_water, lactic: 0 },
      { fermentables: [pale_malt(3), roasted_barley(1)], water: distilled_water, lactic: 0 },
    ];
    for (const { fermentables, water, lactic } of inputs) {
      const ph = calculate_mash_ph_kaiser(
        fermentables,
        water,
        20,
        lactic,
        0,
        0,
      );
      expect(ph).toBeGreaterThan(4.0);
      expect(ph).toBeLessThan(7.0);
    }
  });

  it("Kaiser single crystal-60 grain: pH matches expected formula value", () => {
    // avg_color = 60, color_delta = 60 - 1.8 = 58.2
    // grain_ph = 5.72 - 58.2 * 0.012 = 5.72 - 0.6984 = 5.0216
    const result = calculate_mash_ph_kaiser(
      [crystal_60(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    expect(result).toBeCloseTo(5.022, 2);
  });

  it("Kaiser dark stout grain bill: pH matches expected formula value", () => {
    // 3kg pale (1.8L) + 2kg roasted barley (300L) = 5kg total
    // avg_color = (3*1.8 + 2*300) / 5 = 605.4/5 = 121.08
    // color_delta = 121.08 - 1.8 = 119.28
    // grain_ph = 5.72 - 119.28 * 0.012 = 5.72 - 1.43136 = 4.28864
    const result = calculate_mash_ph_kaiser(
      [pale_malt(3), roasted_barley(2)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    expect(result).toBeCloseTo(4.289, 2);
  });

  it("Kaiser dark stout lowers pH more aggressively than Bru'n Water (larger color coefficient)", () => {
    const brun_drop =
      calculate_mash_ph_brun_water([pale_malt(5)], distilled_water, 20, 0, 0, 0) -
      calculate_mash_ph_brun_water(
        [pale_malt(3), roasted_barley(2)],
        distilled_water,
        20,
        0,
        0,
        0,
      );
    const kaiser_drop =
      calculate_mash_ph_kaiser([pale_malt(5)], distilled_water, 20, 0, 0, 0) -
      calculate_mash_ph_kaiser(
        [pale_malt(3), roasted_barley(2)],
        distilled_water,
        20,
        0,
        0,
        0,
      );
    expect(kaiser_drop).toBeGreaterThan(brun_drop);
  });

  it("high-alkalinity water raises Kaiser mash pH above distilled baseline", () => {
    const distilled_ph = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const alkaline_ph = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      high_alkalinity_water,
      20,
      0,
      0,
      0,
    );
    expect(alkaline_ph).toBeGreaterThan(distilled_ph);
  });
});

// ---------------------------------------------------------------------------
// Cross-model comparisons
// ---------------------------------------------------------------------------

describe("cross-model comparisons", () => {
  it("both models return the same pH for all-pale malt with distilled water", () => {
    const brun = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const kaiser = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    expect(brun).toBeCloseTo(kaiser, 4);
  });

  it("both models produce a reasonable pH (4.5–6.0) for a typical pale ale grain bill", () => {
    const typical_grain = [pale_malt(4.5), crystal_60(0.5)];
    const typical_water = {
      calcium_ppm: 75,
      magnesium_ppm: 5,
      bicarbonate_ppm: 50,
    };
    const brun = calculate_mash_ph_brun_water(
      typical_grain,
      typical_water,
      20,
      0,
      0,
      0,
    );
    const kaiser = calculate_mash_ph_kaiser(
      typical_grain,
      typical_water,
      20,
      0,
      0,
      0,
    );
    expect(brun).toBeGreaterThan(4.5);
    expect(brun).toBeLessThan(6.0);
    expect(kaiser).toBeGreaterThan(4.5);
    expect(kaiser).toBeLessThan(6.0);
  });

  it("Kaiser shows lower pH than Bru'n Water for dark grain bills due to higher coefficient", () => {
    const dark_grain = [pale_malt(3), crystal_60(1), roasted_barley(1)];
    const brun = calculate_mash_ph_brun_water(
      dark_grain,
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const kaiser = calculate_mash_ph_kaiser(
      dark_grain,
      distilled_water,
      20,
      0,
      0,
      0,
    );
    expect(kaiser).toBeLessThan(brun);
  });

  it("both models respond identically to the same water profile shift (same RA formula)", () => {
    const brun_distilled = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const brun_alkaline = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      high_alkalinity_water,
      20,
      0,
      0,
      0,
    );
    const kaiser_distilled = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      20,
      0,
      0,
      0,
    );
    const kaiser_alkaline = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      high_alkalinity_water,
      20,
      0,
      0,
      0,
    );
    const brun_shift = brun_alkaline - brun_distilled;
    const kaiser_shift = kaiser_alkaline - kaiser_distilled;
    // Both models use the same RA factor, so water shifts should be identical
    expect(kaiser_shift).toBeCloseTo(brun_shift, 6);
  });

  it("both models respond identically to the same acid additions (same acid formula)", () => {
    const brun_base = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      0,
      0,
    );
    const brun_acid = calculate_mash_ph_brun_water(
      [pale_malt(5)],
      distilled_water,
      10,
      1,
      0,
      0,
    );
    const kaiser_base = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      10,
      0,
      0,
      0,
    );
    const kaiser_acid = calculate_mash_ph_kaiser(
      [pale_malt(5)],
      distilled_water,
      10,
      1,
      0,
      0,
    );
    const brun_shift = brun_acid - brun_base;
    const kaiser_shift = kaiser_acid - kaiser_base;
    // Both models use the same acid_ph_shift function, so shifts should be equal
    expect(kaiser_shift).toBeCloseTo(brun_shift, 6);
  });
});
