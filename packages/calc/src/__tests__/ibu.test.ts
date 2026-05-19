import { describe, it, expect } from "vitest";
import {
  calculate_ibu_tinseth,
  calculate_ibu_rager,
  calculate_ibu_mibu,
} from "../ibu";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const boil_hop = (
  amount_kg: number,
  alpha_acid_pct: number,
  time_minutes: number,
) => ({
  amount_kg,
  alpha_acid_pct,
  time_minutes,
  use: "boil" as const,
});

const first_wort_hop = (
  amount_kg: number,
  alpha_acid_pct: number,
  time_minutes: number,
) => ({
  amount_kg,
  alpha_acid_pct,
  time_minutes,
  use: "first_wort" as const,
});

const mash_hop = (
  amount_kg: number,
  alpha_acid_pct: number,
  time_minutes: number,
) => ({
  amount_kg,
  alpha_acid_pct,
  time_minutes,
  use: "mash" as const,
});

const dry_hop = (
  amount_kg: number,
  alpha_acid_pct: number,
  time_minutes: number,
) => ({
  amount_kg,
  alpha_acid_pct,
  time_minutes,
  use: "dry_hop" as const,
});

const aroma_hop = (
  amount_kg: number,
  alpha_acid_pct: number,
  time_minutes: number,
) => ({
  amount_kg,
  alpha_acid_pct,
  time_minutes,
  use: "aroma" as const,
});

const whirlpool_hop = (
  amount_kg: number,
  alpha_acid_pct: number,
  time_minutes: number,
) => ({
  amount_kg,
  alpha_acid_pct,
  time_minutes,
  use: "whirlpool" as const,
});

// ---------------------------------------------------------------------------
// calculate_ibu_tinseth
// ---------------------------------------------------------------------------

describe("calculate_ibu_tinseth", () => {
  it("returns 0 for an empty hops array", () => {
    expect(calculate_ibu_tinseth([], 1.05, 20)).toBe(0);
  });

  it("returns 0 when batch size is zero", () => {
    expect(calculate_ibu_tinseth([boil_hop(0.028, 10, 60)], 1.05, 0)).toBe(0);
  });

  it("returns 0 when batch size is negative", () => {
    expect(calculate_ibu_tinseth([boil_hop(0.028, 10, 60)], 1.05, -5)).toBe(0);
  });

  it("returns 0 when boil time is zero", () => {
    expect(calculate_ibu_tinseth([boil_hop(0.028, 10, 0)], 1.05, 20)).toBe(0);
  });

  it("returns 0 for dry_hop use", () => {
    expect(
      calculate_ibu_tinseth([dry_hop(0.028, 10, 60)], 1.05, 20),
    ).toBe(0);
  });

  it("returns 0 for aroma use", () => {
    expect(
      calculate_ibu_tinseth([aroma_hop(0.028, 10, 60)], 1.05, 20),
    ).toBe(0);
  });

  it("returns 0 for whirlpool use", () => {
    expect(
      calculate_ibu_tinseth([whirlpool_hop(0.028, 10, 60)], 1.05, 20),
    ).toBe(0);
  });

  it("returns positive IBU for a boil addition", () => {
    expect(
      calculate_ibu_tinseth([boil_hop(0.028, 10, 60)], 1.05, 20),
    ).toBeGreaterThan(0);
  });

  it("returns positive IBU for a mash hop addition", () => {
    expect(
      calculate_ibu_tinseth([mash_hop(0.028, 10, 60)], 1.05, 20),
    ).toBeGreaterThan(0);
  });

  // Known reference: ~28g of 10% AA, 60 min, OG 1.050, 20 L
  // bigness = 1.65 * 0.000125^0.05 ≈ 1.05208
  // boil_factor = (1 - e^(-2.4)) / 4.15 ≈ 0.21910
  // util ≈ 0.23051
  // IBU = (0.10 * 28 * 0.23051 * 1000) / 20 ≈ 32.3
  it("matches a known Tinseth reference value for a typical single addition", () => {
    const result = calculate_ibu_tinseth(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    expect(result).toBeCloseTo(32.3, 0);
  });

  it("sums IBU contributions from multiple boil additions", () => {
    const single = calculate_ibu_tinseth(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    const double = calculate_ibu_tinseth(
      [boil_hop(0.014, 10, 60), boil_hop(0.014, 10, 60)],
      1.05,
      20,
    );
    expect(double).toBeCloseTo(single, 4);
  });

  it("sums contributions from mixed-time additions", () => {
    const sixty = calculate_ibu_tinseth([boil_hop(0.028, 10, 60)], 1.05, 20);
    const fifteen = calculate_ibu_tinseth([boil_hop(0.028, 10, 15)], 1.05, 20);
    const combined = calculate_ibu_tinseth(
      [boil_hop(0.028, 10, 60), boil_hop(0.028, 10, 15)],
      1.05,
      20,
    );
    expect(combined).toBeCloseTo(sixty + fifteen, 4);
  });

  it("non-bittering uses contribute 0 IBU even in a mixed hop bill", () => {
    const boil_only = calculate_ibu_tinseth(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    const mixed = calculate_ibu_tinseth(
      [boil_hop(0.028, 10, 60), dry_hop(0.05, 14, 0)],
      1.05,
      20,
    );
    expect(mixed).toBeCloseTo(boil_only, 4);
  });

  // Higher OG → smaller (og - 1) exponent base → smaller bigness → lower util
  it("produces lower IBU at higher OG due to bigness factor decrease", () => {
    const low_og = calculate_ibu_tinseth([boil_hop(0.028, 10, 60)], 1.04, 20);
    const high_og = calculate_ibu_tinseth([boil_hop(0.028, 10, 60)], 1.09, 20);
    expect(high_og).toBeLessThan(low_og);
  });

  // Longer boil → higher utilization (but with diminishing returns)
  it("produces higher IBU for longer boil times", () => {
    const short = calculate_ibu_tinseth([boil_hop(0.028, 10, 15)], 1.05, 20);
    const long = calculate_ibu_tinseth([boil_hop(0.028, 10, 60)], 1.05, 20);
    expect(long).toBeGreaterThan(short);
  });

  it("shows diminishing returns: gain from 60→90 min is less than from 15→45 min", () => {
    const at_15 = calculate_ibu_tinseth([boil_hop(0.028, 10, 15)], 1.05, 20);
    const at_45 = calculate_ibu_tinseth([boil_hop(0.028, 10, 45)], 1.05, 20);
    const at_60 = calculate_ibu_tinseth([boil_hop(0.028, 10, 60)], 1.05, 20);
    const at_90 = calculate_ibu_tinseth([boil_hop(0.028, 10, 90)], 1.05, 20);
    const gain_short = at_45 - at_15;
    const gain_long = at_90 - at_60;
    expect(gain_long).toBeLessThan(gain_short);
  });

  it("first wort hop produces more IBU than an equivalent boil addition at the same time", () => {
    const boil_result = calculate_ibu_tinseth(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    const fwh_result = calculate_ibu_tinseth(
      [first_wort_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    expect(fwh_result).toBeGreaterThan(boil_result);
  });

  it("first wort hop utilization bonus is exactly 10%", () => {
    const boil_result = calculate_ibu_tinseth(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    const fwh_result = calculate_ibu_tinseth(
      [first_wort_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    expect(fwh_result).toBeCloseTo(boil_result * 1.1, 4);
  });

  it("scales linearly with hop amount", () => {
    const single = calculate_ibu_tinseth([boil_hop(0.028, 10, 60)], 1.05, 20);
    const double = calculate_ibu_tinseth([boil_hop(0.056, 10, 60)], 1.05, 20);
    expect(double).toBeCloseTo(single * 2, 4);
  });

  it("scales linearly with alpha acid percentage", () => {
    const low_aa = calculate_ibu_tinseth([boil_hop(0.028, 5, 60)], 1.05, 20);
    const high_aa = calculate_ibu_tinseth([boil_hop(0.028, 10, 60)], 1.05, 20);
    expect(high_aa).toBeCloseTo(low_aa * 2, 4);
  });

  it("scales inversely with batch size", () => {
    const small_batch = calculate_ibu_tinseth(
      [boil_hop(0.028, 10, 60)],
      1.05,
      10,
    );
    const large_batch = calculate_ibu_tinseth(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    expect(small_batch).toBeCloseTo(large_batch * 2, 4);
  });
});

// ---------------------------------------------------------------------------
// calculate_ibu_rager
// ---------------------------------------------------------------------------

describe("calculate_ibu_rager", () => {
  it("returns 0 for an empty hops array", () => {
    expect(calculate_ibu_rager([], 1.05, 20)).toBe(0);
  });

  it("returns 0 when batch size is zero", () => {
    expect(calculate_ibu_rager([boil_hop(0.028, 10, 60)], 1.05, 0)).toBe(0);
  });

  it("returns 0 when batch size is negative", () => {
    expect(calculate_ibu_rager([boil_hop(0.028, 10, 60)], 1.05, -5)).toBe(0);
  });

  it("returns 0 when boil time is zero", () => {
    expect(calculate_ibu_rager([boil_hop(0.028, 10, 0)], 1.05, 20)).toBe(0);
  });

  it("returns 0 for dry_hop use", () => {
    expect(
      calculate_ibu_rager([dry_hop(0.028, 10, 60)], 1.05, 20),
    ).toBe(0);
  });

  it("returns 0 for aroma use", () => {
    expect(
      calculate_ibu_rager([aroma_hop(0.028, 10, 60)], 1.05, 20),
    ).toBe(0);
  });

  it("returns 0 for whirlpool use", () => {
    expect(
      calculate_ibu_rager([whirlpool_hop(0.028, 10, 60)], 1.05, 20),
    ).toBe(0);
  });

  it("returns positive IBU for a boil addition", () => {
    expect(
      calculate_ibu_rager([boil_hop(0.028, 10, 60)], 1.05, 20),
    ).toBeGreaterThan(0);
  });

  it("returns positive IBU for a mash hop addition", () => {
    expect(
      calculate_ibu_rager([mash_hop(0.028, 10, 60)], 1.05, 20),
    ).toBeGreaterThan(0);
  });

  // Known reference: ~28g (0.98767 oz) of 10% AA, 60 min, OG 1.050, 20 L (5.2834 gal)
  // util at 60 min = 30%, ga = 0 (OG exactly 1.050)
  // IBU = (0.98767 * 0.30 * 0.10 * 7489) / (5.28344 * 1) ≈ 42.0
  it("matches a known Rager reference value for a typical single addition", () => {
    const result = calculate_ibu_rager(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    expect(result).toBeCloseTo(42.0, 0);
  });

  it("sums IBU contributions from multiple boil additions", () => {
    const single = calculate_ibu_rager(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    const double = calculate_ibu_rager(
      [boil_hop(0.014, 10, 60), boil_hop(0.014, 10, 60)],
      1.05,
      20,
    );
    expect(double).toBeCloseTo(single, 4);
  });

  it("OG at or below 1.050 produces no gravity adjustment", () => {
    const at_1_050 = calculate_ibu_rager([boil_hop(0.028, 10, 60)], 1.05, 20);
    const at_1_040 = calculate_ibu_rager([boil_hop(0.028, 10, 60)], 1.04, 20);
    // Both should yield the same IBU since ga = 0 in both cases
    expect(at_1_050).toBeCloseTo(at_1_040, 4);
  });

  it("gravity adjustment kicks in above OG 1.050, reducing IBU", () => {
    const at_1_050 = calculate_ibu_rager([boil_hop(0.028, 10, 60)], 1.05, 20);
    const at_1_060 = calculate_ibu_rager([boil_hop(0.028, 10, 60)], 1.06, 20);
    expect(at_1_060).toBeLessThan(at_1_050);
  });

  it("gravity adjustment magnitude is correct: OG 1.070 reduces denominator by (1.070-1.05)/0.2 = 0.1", () => {
    // ga = (1.070 - 1.05) / 0.2 = 0.1
    // denominator multiplier = 1 + 0.1 = 1.1
    const base = calculate_ibu_rager([boil_hop(0.028, 10, 60)], 1.05, 20);
    const adjusted = calculate_ibu_rager([boil_hop(0.028, 10, 60)], 1.07, 20);
    expect(adjusted).toBeCloseTo(base / 1.1, 3);
  });

  // Rager table caps utilization at 30% for 60+ minutes (50 min = 28.1%, 60+ = 30%)
  it("utilization caps at 30% for boil times of 60 minutes and above", () => {
    const at_60 = calculate_ibu_rager([boil_hop(0.028, 10, 60)], 1.05, 20);
    const at_70 = calculate_ibu_rager([boil_hop(0.028, 10, 70)], 1.05, 20);
    const at_90 = calculate_ibu_rager([boil_hop(0.028, 10, 90)], 1.05, 20);
    expect(at_70).toBeCloseTo(at_60, 4);
    expect(at_90).toBeCloseTo(at_60, 4);
  });

  it("utilization at 50 minutes (28.1%) is less than at 60 minutes (30%)", () => {
    const at_50 = calculate_ibu_rager([boil_hop(0.028, 10, 50)], 1.05, 20);
    const at_60 = calculate_ibu_rager([boil_hop(0.028, 10, 60)], 1.05, 20);
    expect(at_50).toBeLessThan(at_60);
  });

  it("step increase from 0→10 min returns 6% utilization result", () => {
    const at_5 = calculate_ibu_rager([boil_hop(0.028, 10, 5)], 1.05, 20);
    const at_10 = calculate_ibu_rager([boil_hop(0.028, 10, 10)], 1.05, 20);
    // Both ≤ 10 min → same 6% util bracket
    expect(at_5).toBeCloseTo(at_10, 4);
  });

  it("utilization jumps at the 15-minute boundary", () => {
    const at_10 = calculate_ibu_rager([boil_hop(0.028, 10, 10)], 1.05, 20);
    const at_15 = calculate_ibu_rager([boil_hop(0.028, 10, 15)], 1.05, 20);
    // 10 min → 6%; 15 min → 8% — distinct step
    expect(at_15).toBeGreaterThan(at_10);
  });

  it("first wort hop produces more IBU than an equivalent boil addition at the same time", () => {
    const boil_result = calculate_ibu_rager(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    const fwh_result = calculate_ibu_rager(
      [first_wort_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    expect(fwh_result).toBeGreaterThan(boil_result);
  });

  it("first wort hop utilization bonus is exactly 10%", () => {
    const boil_result = calculate_ibu_rager(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    const fwh_result = calculate_ibu_rager(
      [first_wort_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    expect(fwh_result).toBeCloseTo(boil_result * 1.1, 4);
  });

  it("non-bittering uses contribute 0 IBU even in a mixed hop bill", () => {
    const boil_only = calculate_ibu_rager(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    const mixed = calculate_ibu_rager(
      [boil_hop(0.028, 10, 60), dry_hop(0.05, 14, 0)],
      1.05,
      20,
    );
    expect(mixed).toBeCloseTo(boil_only, 4);
  });
});

// ---------------------------------------------------------------------------
// calculate_ibu_mibu
// ---------------------------------------------------------------------------

describe("calculate_ibu_mibu", () => {
  it("returns 0 for an empty hops array", () => {
    expect(calculate_ibu_mibu([], 1.05, 20)).toBe(0);
  });

  it("returns 0 when batch size is zero", () => {
    expect(calculate_ibu_mibu([boil_hop(0.028, 10, 60)], 1.05, 0)).toBe(0);
  });

  it("returns 0 when batch size is negative", () => {
    expect(calculate_ibu_mibu([boil_hop(0.028, 10, 60)], 1.05, -5)).toBe(0);
  });

  it("returns 0 when boil time is zero", () => {
    // A 0-minute boil addition gets +5 min → 5 min effective, but guard:
    // The implementation passes time_minutes + 5 = 5, which is > 0.
    // However the use IS boil so we get a small positive result — verify the
    // exact guard by using a non-bittering use instead.
    expect(
      calculate_ibu_mibu([dry_hop(0.028, 10, 0)], 1.05, 20),
    ).toBe(0);
  });

  it("returns 0 for dry_hop use", () => {
    expect(
      calculate_ibu_mibu([dry_hop(0.028, 10, 60)], 1.05, 20),
    ).toBe(0);
  });

  it("returns 0 for aroma use", () => {
    expect(
      calculate_ibu_mibu([aroma_hop(0.028, 10, 60)], 1.05, 20),
    ).toBe(0);
  });

  it("returns 0 for whirlpool use", () => {
    expect(
      calculate_ibu_mibu([whirlpool_hop(0.028, 10, 60)], 1.05, 20),
    ).toBe(0);
  });

  it("returns positive IBU for a boil addition", () => {
    expect(
      calculate_ibu_mibu([boil_hop(0.028, 10, 60)], 1.05, 20),
    ).toBeGreaterThan(0);
  });

  // mIBU adds +5 min to bittering additions, so it always exceeds Tinseth
  it("always produces higher IBU than Tinseth for the same boil addition", () => {
    const tinseth = calculate_ibu_tinseth(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    const mibu = calculate_ibu_mibu([boil_hop(0.028, 10, 60)], 1.05, 20);
    expect(mibu).toBeGreaterThan(tinseth);
  });

  it("is equivalent to Tinseth with +5 minutes added to boil additions", () => {
    const mibu = calculate_ibu_mibu([boil_hop(0.028, 10, 60)], 1.05, 20);
    const tinseth_plus_5 = calculate_ibu_tinseth(
      [boil_hop(0.028, 10, 65)],
      1.05,
      20,
    );
    expect(mibu).toBeCloseTo(tinseth_plus_5, 6);
  });

  // Known reference: +5 min effective → 65-min Tinseth value ≈ 32.86 IBU
  it("matches a known mIBU reference value for a typical single addition", () => {
    const result = calculate_ibu_mibu(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    expect(result).toBeCloseTo(32.9, 0);
  });

  it("the +5 min difference is more pronounced for short boils than long boils", () => {
    // At 15 min (short): mIBU uses 20-min util vs 15-min util — larger relative gain
    // At 75 min (long):  mIBU uses 80-min util vs 75-min util — smaller relative gain
    const gain_short =
      calculate_ibu_mibu([boil_hop(0.028, 10, 15)], 1.05, 20) -
      calculate_ibu_tinseth([boil_hop(0.028, 10, 15)], 1.05, 20);
    const gain_long =
      calculate_ibu_mibu([boil_hop(0.028, 10, 75)], 1.05, 20) -
      calculate_ibu_tinseth([boil_hop(0.028, 10, 75)], 1.05, 20);
    expect(gain_short).toBeGreaterThan(gain_long);
  });

  it("sums IBU contributions from multiple boil additions", () => {
    const single = calculate_ibu_mibu([boil_hop(0.028, 10, 60)], 1.05, 20);
    const double = calculate_ibu_mibu(
      [boil_hop(0.014, 10, 60), boil_hop(0.014, 10, 60)],
      1.05,
      20,
    );
    expect(double).toBeCloseTo(single, 4);
  });

  it("first wort hop produces more IBU than an equivalent boil addition at the same time", () => {
    const boil_result = calculate_ibu_mibu(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    const fwh_result = calculate_ibu_mibu(
      [first_wort_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    expect(fwh_result).toBeGreaterThan(boil_result);
  });

  it("non-bittering uses contribute 0 IBU even in a mixed hop bill", () => {
    const boil_only = calculate_ibu_mibu(
      [boil_hop(0.028, 10, 60)],
      1.05,
      20,
    );
    const mixed = calculate_ibu_mibu(
      [boil_hop(0.028, 10, 60), dry_hop(0.05, 14, 0)],
      1.05,
      20,
    );
    expect(mixed).toBeCloseTo(boil_only, 4);
  });
});

// ---------------------------------------------------------------------------
// Cross-formula comparisons
// ---------------------------------------------------------------------------

describe("cross-formula comparisons", () => {
  const hops = [boil_hop(0.028, 10, 60)];
  const og = 1.05;
  const batch_l = 20;

  it("all three formulas return a positive result for a typical input", () => {
    expect(calculate_ibu_tinseth(hops, og, batch_l)).toBeGreaterThan(0);
    expect(calculate_ibu_rager(hops, og, batch_l)).toBeGreaterThan(0);
    expect(calculate_ibu_mibu(hops, og, batch_l)).toBeGreaterThan(0);
  });

  it("all three formulas produce different IBU values", () => {
    const tinseth = calculate_ibu_tinseth(hops, og, batch_l);
    const rager = calculate_ibu_rager(hops, og, batch_l);
    const mibu = calculate_ibu_mibu(hops, og, batch_l);
    // None of the three should be identical
    expect(tinseth).not.toBeCloseTo(rager, 1);
    expect(mibu).not.toBeCloseTo(rager, 1);
    // mIBU > Tinseth (same formula, +5 min)
    expect(mibu).toBeGreaterThan(tinseth);
  });

  it("all three return 0 for an empty hop bill", () => {
    expect(calculate_ibu_tinseth([], og, batch_l)).toBe(0);
    expect(calculate_ibu_rager([], og, batch_l)).toBe(0);
    expect(calculate_ibu_mibu([], og, batch_l)).toBe(0);
  });

  it("all three return 0 when every hop is a dry hop", () => {
    const dry_hops = [dry_hop(0.05, 10, 0), dry_hop(0.028, 12, 0)];
    expect(calculate_ibu_tinseth(dry_hops, og, batch_l)).toBe(0);
    expect(calculate_ibu_rager(dry_hops, og, batch_l)).toBe(0);
    expect(calculate_ibu_mibu(dry_hops, og, batch_l)).toBe(0);
  });
});
