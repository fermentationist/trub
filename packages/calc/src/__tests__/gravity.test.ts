import { describe, it, expect } from "vitest";
import {
  calculate_og,
  calculate_fg,
  calculate_abv_simple,
  calculate_abv_alternate,
} from "../gravity";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const grain = (amount_kg: number, potential_ppg: number) => ({
  amount_kg,
  potential_ppg,
  type: "grain" as const,
});

const sugar = (amount_kg: number, potential_ppg: number) => ({
  amount_kg,
  potential_ppg,
  type: "sugar" as const,
});

const extract = (amount_kg: number, potential_ppg: number) => ({
  amount_kg,
  potential_ppg,
  type: "extract" as const,
});

const dry_extract = (amount_kg: number, potential_ppg: number) => ({
  amount_kg,
  potential_ppg,
  type: "dry_extract" as const,
});

const adjunct = (amount_kg: number, potential_ppg: number) => ({
  amount_kg,
  potential_ppg,
  type: "adjunct" as const,
});

// ---------------------------------------------------------------------------
// calculate_og
// ---------------------------------------------------------------------------

describe("calculate_og", () => {
  it("returns 1.0 for an empty fermentables array", () => {
    expect(calculate_og([], 20, 72)).toBe(1.0);
  });

  it("returns 1.0 when batch size is zero", () => {
    expect(calculate_og([grain(5, 37)], 0, 72)).toBe(1.0);
  });

  it("returns 1.0 when batch size is negative", () => {
    expect(calculate_og([grain(5, 37)], -10, 72)).toBe(1.0);
  });

  it("applies mash efficiency to a single grain addition", () => {
    // 1 kg of grain at 36 PPG, 19 L batch, 75% efficiency
    // weight_lb  = 1 * 2.20462 = 2.20462 lb
    // batch_gal  = 19 * 0.264172 = 5.01927 gal
    // points     = 36 * 2.20462 * 0.75 = 59.5247
    // OG         = 1 + 59.5247 / 5.01927 / 1000 ≈ 1.01186
    expect(calculate_og([grain(1, 36)], 19, 75)).toBeCloseTo(1.01186, 4);
  });

  it("does NOT apply efficiency to a sugar addition (type: sugar)", () => {
    // 1 kg of sugar at 46 PPG, 19 L batch, 72% efficiency — efficiency = 1
    // weight_lb  = 2.20462 lb
    // batch_gal  = 5.01927 gal
    // points     = 46 * 2.20462 * 1 = 101.413
    // OG         = 1 + 101.413 / 5.01927 / 1000 ≈ 1.02020
    expect(calculate_og([sugar(1, 46)], 19, 72)).toBeCloseTo(1.02020, 4);
  });

  it("does NOT apply efficiency to a liquid extract addition (type: extract)", () => {
    const result = calculate_og([extract(1, 37)], 19, 72);
    // efficiency = 1 for extract
    // points = 37 * 2.20462 = 81.571
    // OG = 1 + 81.571 / 5.01927 / 1000 ≈ 1.01625
    expect(result).toBeCloseTo(1.01625, 4);
  });

  it("does NOT apply efficiency to a dry extract addition (type: dry_extract)", () => {
    const result = calculate_og([dry_extract(1, 44)], 19, 72);
    // efficiency = 1 for dry_extract
    // points = 44 * 2.20462 = 97.003
    // OG = 1 + 97.003 / 5.01927 / 1000 ≈ 1.01932
    expect(result).toBeCloseTo(1.01932, 4);
  });

  it("DOES apply efficiency to an adjunct addition (type: adjunct)", () => {
    // adjunct is not in EXTRACT_TYPES so efficiency applies
    const with_efficiency = calculate_og([adjunct(1, 32)], 19, 80);
    const full_efficiency = calculate_og([adjunct(1, 32)], 19, 100);
    expect(with_efficiency).toBeLessThan(full_efficiency);

    // points = 32 * 2.20462 * 0.80 = 56.438
    // OG = 1 + 56.438 / 5.01927 / 1000 ≈ 1.01124
    expect(with_efficiency).toBeCloseTo(1.01124, 4);
  });

  it("applies efficiency only to grain in a mixed grain + extract recipe", () => {
    const grain_only = calculate_og([grain(2, 37)], 19, 72);
    const extract_only = calculate_og([extract(1, 37)], 19, 72);
    const mixed = calculate_og([grain(2, 37), extract(1, 37)], 19, 72);

    // The mixed OG should be the sum of the individual point contributions
    // grain points  = 37 * (2 * 2.20462) * 0.72 = 117.30...
    // extract points = 37 * 2.20462 * 1   =  81.57...
    // total_points  = 198.87
    // OG = 1 + 198.87 / 5.01927 / 1000 ≈ 1.03962
    expect(mixed).toBeCloseTo(1.03962, 4);

    // Sanity: mixed must be greater than either ingredient alone
    expect(mixed).toBeGreaterThan(grain_only);
    expect(mixed).toBeGreaterThan(extract_only);
  });

  it("sums contributions from multiple grain additions", () => {
    const single = calculate_og([grain(4, 37)], 19, 72);
    const double = calculate_og([grain(2, 37), grain(2, 37)], 19, 72);
    expect(double).toBeCloseTo(single, 5);
  });

  it("matches a known brewing reference: 5 kg 2-row at 37 PPG, 20 L, 72% efficiency", () => {
    // weight_lb  = 5 * 2.20462   = 11.02310 lb
    // batch_gal  = 20 * 0.264172 =  5.28344 gal
    // points     = 37 * 11.02310 * 0.72 = 293.344
    // OG         = 1 + 293.344 / 5.28344 / 1000 ≈ 1.05558
    // Precision of 3 (±0.0005) is appropriate given intermediate rounding
    expect(calculate_og([grain(5, 37)], 20, 72)).toBeCloseTo(1.05558, 3);
  });

  it("returns 1.0 when efficiency is 0 and all fermentables are grain", () => {
    // All points multiplied by 0 → OG = 1.000
    expect(calculate_og([grain(5, 37)], 20, 0)).toBeCloseTo(1.0, 5);
  });

  it("returns higher OG for higher efficiency", () => {
    const low = calculate_og([grain(5, 37)], 20, 60);
    const high = calculate_og([grain(5, 37)], 20, 85);
    expect(high).toBeGreaterThan(low);
  });

  it("returns higher OG for larger grain bill, same batch size", () => {
    const small = calculate_og([grain(3, 37)], 20, 72);
    const large = calculate_og([grain(6, 37)], 20, 72);
    expect(large).toBeGreaterThan(small);
  });

  it("returns lower OG for larger batch size, same grain bill", () => {
    const small_batch = calculate_og([grain(5, 37)], 15, 72);
    const large_batch = calculate_og([grain(5, 37)], 30, 72);
    expect(large_batch).toBeLessThan(small_batch);
  });
});

// ---------------------------------------------------------------------------
// calculate_fg
// ---------------------------------------------------------------------------

describe("calculate_fg", () => {
  it("calculates FG for a typical beer (OG 1.050, 75% attenuation)", () => {
    // FG = 1.050 - (1.050 - 1) * 0.75 = 1.050 - 0.0375 = 1.0125
    expect(calculate_fg(1.05, 75)).toBeCloseTo(1.0125, 5);
  });

  it("returns OG when attenuation is 0%", () => {
    expect(calculate_fg(1.06, 0)).toBeCloseTo(1.06, 5);
  });

  it("returns 1.000 when attenuation is 100%", () => {
    expect(calculate_fg(1.07, 100)).toBeCloseTo(1.0, 5);
  });

  it("returns values between 1.000 and OG for attenuation between 0 and 100", () => {
    const fg = calculate_fg(1.055, 72);
    expect(fg).toBeGreaterThan(1.0);
    expect(fg).toBeLessThan(1.055);
  });

  it("produces lower FG with higher attenuation", () => {
    const low = calculate_fg(1.06, 65);
    const high = calculate_fg(1.06, 85);
    expect(high).toBeLessThan(low);
  });
});

// ---------------------------------------------------------------------------
// calculate_abv_simple
// ---------------------------------------------------------------------------

describe("calculate_abv_simple", () => {
  it("returns ~5.25% ABV for OG 1.050 / FG 1.010", () => {
    // (1.050 - 1.010) * 131.25 = 0.040 * 131.25 = 5.25
    expect(calculate_abv_simple(1.05, 1.01)).toBeCloseTo(5.25, 2);
  });

  it("returns 0% when OG equals FG (no fermentation)", () => {
    expect(calculate_abv_simple(1.05, 1.05)).toBe(0);
  });

  it("returns a positive value for any OG > FG", () => {
    expect(calculate_abv_simple(1.065, 1.012)).toBeGreaterThan(0);
  });

  it("scales linearly with gravity drop", () => {
    const single = calculate_abv_simple(1.05, 1.01);
    const double = calculate_abv_simple(1.1, 1.02);
    expect(double).toBeCloseTo(single * 2, 3);
  });

  it("calculates ~6.56% ABV for OG 1.065 / FG 1.015", () => {
    // (1.065 - 1.015) * 131.25 = 0.050 * 131.25 = 6.5625
    expect(calculate_abv_simple(1.065, 1.015)).toBeCloseTo(6.5625, 3);
  });
});

// ---------------------------------------------------------------------------
// calculate_abv_alternate
// ---------------------------------------------------------------------------

describe("calculate_abv_alternate", () => {
  it("returns a positive value for OG 1.050 / FG 1.010", () => {
    expect(calculate_abv_alternate(1.05, 1.01)).toBeGreaterThan(0);
  });

  it("calculates ~5.34% ABV for OG 1.050 / FG 1.010", () => {
    // (76.08 * 0.040) / (1.775 - 1.050) * (1.010 / 0.794)
    // = 3.0432 / 0.725 * 1.27204
    // = 4.19751 * 1.27204
    // ≈ 5.339
    expect(calculate_abv_alternate(1.05, 1.01)).toBeCloseTo(5.339, 1);
  });

  it("produces a result close to the simple formula for typical beer gravities", () => {
    const simple = calculate_abv_simple(1.055, 1.012);
    const alternate = calculate_abv_alternate(1.055, 1.012);
    // Both formulas should agree within 0.5% ABV for normal-strength beers
    expect(Math.abs(alternate - simple)).toBeLessThan(0.5);
  });

  it("is not identical to the simple formula", () => {
    // The two formulas use different math and must diverge at some OG
    const simple = calculate_abv_simple(1.09, 1.015);
    const alternate = calculate_abv_alternate(1.09, 1.015);
    expect(alternate).not.toBeCloseTo(simple, 2);
  });

  it("returns a higher result than the simple formula for high-gravity beers", () => {
    // The alternate formula accounts for FG density and tends to read higher
    // for stronger beers — verify directional relationship at OG 1.090
    const simple = calculate_abv_simple(1.09, 1.018);
    const alternate = calculate_abv_alternate(1.09, 1.018);
    expect(alternate).toBeGreaterThan(simple);
  });
});
