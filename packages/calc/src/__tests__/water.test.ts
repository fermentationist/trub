import { describe, it, expect } from "vitest";
import {
  calculate_salt_contributions,
  calculate_resulting_profile,
  calculate_sulfate_chloride_ratio,
  describe_sulfate_chloride_ratio,
} from "../water";
import type { MineralProfile } from "../water";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const zero_adjustments = {
  gypsum_g: 0,
  calcium_chloride_g: 0,
  epsom_salt_g: 0,
  baking_soda_g: 0,
  chalk_g: 0,
  table_salt_g: 0,
  lactic_acid_ml: 0,
  phosphoric_acid_ml: 0,
  acidulated_malt_g: 0,
};

const zero_source: MineralProfile = {
  calcium_ppm: 0,
  magnesium_ppm: 0,
  sodium_ppm: 0,
  sulfate_ppm: 0,
  chloride_ppm: 0,
  bicarbonate_ppm: 0,
};

const typical_source: MineralProfile = {
  calcium_ppm: 40,
  magnesium_ppm: 8,
  sodium_ppm: 10,
  sulfate_ppm: 20,
  chloride_ppm: 30,
  bicarbonate_ppm: 100,
};

// ---------------------------------------------------------------------------
// calculate_salt_contributions
// ---------------------------------------------------------------------------

describe("calculate_salt_contributions", () => {
  it("returns all zeros for zero adjustments", () => {
    const result = calculate_salt_contributions(zero_adjustments, 10);
    expect(result.calcium_ppm).toBe(0);
    expect(result.magnesium_ppm).toBe(0);
    expect(result.sodium_ppm).toBe(0);
    expect(result.sulfate_ppm).toBe(0);
    expect(result.chloride_ppm).toBe(0);
    expect(result.bicarbonate_ppm).toBe(0);
  });

  it("returns all zeros when volume is zero", () => {
    const adj = { ...zero_adjustments, gypsum_g: 2 };
    const result = calculate_salt_contributions(adj, 0);
    expect(result.calcium_ppm).toBe(0);
    expect(result.sulfate_ppm).toBe(0);
  });

  it("returns all zeros when volume is negative", () => {
    const adj = { ...zero_adjustments, gypsum_g: 2 };
    const result = calculate_salt_contributions(adj, -5);
    expect(result.calcium_ppm).toBe(0);
    expect(result.sulfate_ppm).toBe(0);
  });

  // Known reference: 1g gypsum (CaSO4·2H2O) in 1L of water
  // Ca coefficient = 232.8, SO4 coefficient = 558.0
  it("gypsum 1g in 1L: Ca=232.8 ppm, SO4=558.0 ppm (known reference)", () => {
    const adj = { ...zero_adjustments, gypsum_g: 1 };
    const result = calculate_salt_contributions(adj, 1);
    expect(result.calcium_ppm).toBeCloseTo(232.8, 4);
    expect(result.sulfate_ppm).toBeCloseTo(558.0, 4);
    expect(result.magnesium_ppm).toBe(0);
    expect(result.sodium_ppm).toBe(0);
    expect(result.chloride_ppm).toBe(0);
    expect(result.bicarbonate_ppm).toBe(0);
  });

  it("gypsum dilution: 1g in 5L produces 1/5 the ppm of 1g in 1L", () => {
    const adj = { ...zero_adjustments, gypsum_g: 1 };
    const in_1l = calculate_salt_contributions(adj, 1);
    const in_5l = calculate_salt_contributions(adj, 5);
    expect(in_5l.calcium_ppm).toBeCloseTo(in_1l.calcium_ppm / 5, 4);
    expect(in_5l.sulfate_ppm).toBeCloseTo(in_1l.sulfate_ppm / 5, 4);
  });

  it("gypsum 2g in 1L is double the ppm of 1g in 1L", () => {
    const adj_1g = { ...zero_adjustments, gypsum_g: 1 };
    const adj_2g = { ...zero_adjustments, gypsum_g: 2 };
    const one = calculate_salt_contributions(adj_1g, 1);
    const two = calculate_salt_contributions(adj_2g, 1);
    expect(two.calcium_ppm).toBeCloseTo(one.calcium_ppm * 2, 4);
    expect(two.sulfate_ppm).toBeCloseTo(one.sulfate_ppm * 2, 4);
  });

  // Known reference: 1g CaCl2·2H2O in 1L
  // Ca coefficient = 272.6, Cl coefficient = 482.3
  it("calcium chloride 1g in 1L: Ca=272.6 ppm, Cl=482.3 ppm (known reference)", () => {
    const adj = { ...zero_adjustments, calcium_chloride_g: 1 };
    const result = calculate_salt_contributions(adj, 1);
    expect(result.calcium_ppm).toBeCloseTo(272.6, 4);
    expect(result.chloride_ppm).toBeCloseTo(482.3, 4);
    expect(result.sulfate_ppm).toBe(0);
    expect(result.magnesium_ppm).toBe(0);
    expect(result.sodium_ppm).toBe(0);
    expect(result.bicarbonate_ppm).toBe(0);
  });

  // Known reference: 1g MgSO4·7H2O in 1L
  // Mg coefficient = 98.6, SO4 coefficient = 389.7
  it("epsom salt 1g in 1L: Mg=98.6 ppm, SO4=389.7 ppm (known reference)", () => {
    const adj = { ...zero_adjustments, epsom_salt_g: 1 };
    const result = calculate_salt_contributions(adj, 1);
    expect(result.magnesium_ppm).toBeCloseTo(98.6, 4);
    expect(result.sulfate_ppm).toBeCloseTo(389.7, 4);
    expect(result.calcium_ppm).toBe(0);
    expect(result.chloride_ppm).toBe(0);
  });

  // Known reference: 1g NaHCO3 in 1L
  // Na coefficient = 274.0, HCO3 coefficient = 726.0
  it("baking soda 1g in 1L: Na=274.0 ppm, HCO3=726.0 ppm (known reference)", () => {
    const adj = { ...zero_adjustments, baking_soda_g: 1 };
    const result = calculate_salt_contributions(adj, 1);
    expect(result.sodium_ppm).toBeCloseTo(274.0, 4);
    expect(result.bicarbonate_ppm).toBeCloseTo(726.0, 4);
    expect(result.calcium_ppm).toBe(0);
    expect(result.sulfate_ppm).toBe(0);
    expect(result.chloride_ppm).toBe(0);
  });

  // Known reference: 1g CaCO3 in 1L
  // Ca coefficient = 400.0, HCO3 coefficient = 610.0
  it("chalk 1g in 1L: Ca=400.0 ppm, HCO3=610.0 ppm (known reference)", () => {
    const adj = { ...zero_adjustments, chalk_g: 1 };
    const result = calculate_salt_contributions(adj, 1);
    expect(result.calcium_ppm).toBeCloseTo(400.0, 4);
    expect(result.bicarbonate_ppm).toBeCloseTo(610.0, 4);
    expect(result.magnesium_ppm).toBe(0);
    expect(result.sulfate_ppm).toBe(0);
    expect(result.chloride_ppm).toBe(0);
  });

  // Known reference: 1g NaCl in 1L
  // Na coefficient = 393.4, Cl coefficient = 606.6
  it("table salt 1g in 1L: Na=393.4 ppm, Cl=606.6 ppm (known reference)", () => {
    const adj = { ...zero_adjustments, table_salt_g: 1 };
    const result = calculate_salt_contributions(adj, 1);
    expect(result.sodium_ppm).toBeCloseTo(393.4, 4);
    expect(result.chloride_ppm).toBeCloseTo(606.6, 4);
    expect(result.calcium_ppm).toBe(0);
    expect(result.magnesium_ppm).toBe(0);
    expect(result.sulfate_ppm).toBe(0);
    expect(result.bicarbonate_ppm).toBe(0);
  });

  it("multiple salts combine additively", () => {
    // 1g gypsum: Ca=232.8, SO4=558.0
    // 1g CaCl2: Ca=272.6, Cl=482.3
    // combined Ca = 232.8 + 272.6 = 505.4
    const adj = { ...zero_adjustments, gypsum_g: 1, calcium_chloride_g: 1 };
    const result = calculate_salt_contributions(adj, 1);
    expect(result.calcium_ppm).toBeCloseTo(232.8 + 272.6, 4);
    expect(result.sulfate_ppm).toBeCloseTo(558.0, 4);
    expect(result.chloride_ppm).toBeCloseTo(482.3, 4);
  });

  it("gypsum and epsom salt both contribute to sulfate, and contributions sum", () => {
    const gypsum_only = calculate_salt_contributions(
      { ...zero_adjustments, gypsum_g: 1 },
      10,
    );
    const epsom_only = calculate_salt_contributions(
      { ...zero_adjustments, epsom_salt_g: 1 },
      10,
    );
    const combined = calculate_salt_contributions(
      { ...zero_adjustments, gypsum_g: 1, epsom_salt_g: 1 },
      10,
    );
    expect(combined.sulfate_ppm).toBeCloseTo(
      gypsum_only.sulfate_ppm + epsom_only.sulfate_ppm,
      4,
    );
  });

  it("larger volume produces lower ppm (dilution effect)", () => {
    const adj = { ...zero_adjustments, gypsum_g: 5 };
    const in_10l = calculate_salt_contributions(adj, 10);
    const in_20l = calculate_salt_contributions(adj, 20);
    expect(in_20l.calcium_ppm).toBeCloseTo(in_10l.calcium_ppm / 2, 4);
    expect(in_20l.sulfate_ppm).toBeCloseTo(in_10l.sulfate_ppm / 2, 4);
  });

  it("acid additions (lactic, phosphoric, acidulated malt) do not contribute minerals", () => {
    const adj = {
      ...zero_adjustments,
      lactic_acid_ml: 5,
      phosphoric_acid_ml: 2,
      acidulated_malt_g: 50,
    };
    const result = calculate_salt_contributions(adj, 10);
    expect(result.calcium_ppm).toBe(0);
    expect(result.magnesium_ppm).toBe(0);
    expect(result.sodium_ppm).toBe(0);
    expect(result.sulfate_ppm).toBe(0);
    expect(result.chloride_ppm).toBe(0);
    expect(result.bicarbonate_ppm).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculate_resulting_profile
// ---------------------------------------------------------------------------

describe("calculate_resulting_profile", () => {
  it("no adjustments: result equals the source profile exactly", () => {
    const result = calculate_resulting_profile(
      typical_source,
      zero_adjustments,
      20,
    );
    expect(result.calcium_ppm).toBeCloseTo(typical_source.calcium_ppm, 4);
    expect(result.magnesium_ppm).toBeCloseTo(typical_source.magnesium_ppm, 4);
    expect(result.sodium_ppm).toBeCloseTo(typical_source.sodium_ppm, 4);
    expect(result.sulfate_ppm).toBeCloseTo(typical_source.sulfate_ppm, 4);
    expect(result.chloride_ppm).toBeCloseTo(typical_source.chloride_ppm, 4);
    expect(result.bicarbonate_ppm).toBeCloseTo(
      typical_source.bicarbonate_ppm,
      4,
    );
  });

  it("source + adjustments sum correctly: Ca increases by salt contribution", () => {
    const adj = { ...zero_adjustments, gypsum_g: 1 };
    const volume = 10;
    const salt = calculate_salt_contributions(adj, volume);
    const result = calculate_resulting_profile(typical_source, adj, volume);
    expect(result.calcium_ppm).toBeCloseTo(
      typical_source.calcium_ppm + salt.calcium_ppm,
      4,
    );
    expect(result.sulfate_ppm).toBeCloseTo(
      typical_source.sulfate_ppm + salt.sulfate_ppm,
      4,
    );
    // Unaffected minerals unchanged
    expect(result.magnesium_ppm).toBeCloseTo(typical_source.magnesium_ppm, 4);
    expect(result.chloride_ppm).toBeCloseTo(typical_source.chloride_ppm, 4);
  });

  it("zero-mineral source + salts: result equals only the salt contributions", () => {
    const adj = { ...zero_adjustments, calcium_chloride_g: 2 };
    const volume = 10;
    const salt = calculate_salt_contributions(adj, volume);
    const result = calculate_resulting_profile(zero_source, adj, volume);
    expect(result.calcium_ppm).toBeCloseTo(salt.calcium_ppm, 4);
    expect(result.chloride_ppm).toBeCloseTo(salt.chloride_ppm, 4);
    expect(result.sulfate_ppm).toBe(0);
    expect(result.bicarbonate_ppm).toBe(0);
  });

  it("multiple salts over a source profile: all ions sum independently", () => {
    const adj = {
      ...zero_adjustments,
      gypsum_g: 1,
      baking_soda_g: 1,
    };
    const volume = 5;
    const salt = calculate_salt_contributions(adj, volume);
    const result = calculate_resulting_profile(typical_source, adj, volume);
    expect(result.calcium_ppm).toBeCloseTo(
      typical_source.calcium_ppm + salt.calcium_ppm,
      4,
    );
    expect(result.sodium_ppm).toBeCloseTo(
      typical_source.sodium_ppm + salt.sodium_ppm,
      4,
    );
    expect(result.bicarbonate_ppm).toBeCloseTo(
      typical_source.bicarbonate_ppm + salt.bicarbonate_ppm,
      4,
    );
  });

  it("zero volume with adjustments: minerals come only from source (salt contributions are zero)", () => {
    const adj = { ...zero_adjustments, gypsum_g: 5 };
    const result = calculate_resulting_profile(typical_source, adj, 0);
    // Salt contributions are 0 when volume <= 0, so result === source
    expect(result.calcium_ppm).toBeCloseTo(typical_source.calcium_ppm, 4);
    expect(result.sulfate_ppm).toBeCloseTo(typical_source.sulfate_ppm, 4);
  });
});

// ---------------------------------------------------------------------------
// calculate_sulfate_chloride_ratio
// ---------------------------------------------------------------------------

describe("calculate_sulfate_chloride_ratio", () => {
  it("equal sulfate and chloride ppm yields ratio 1.0", () => {
    expect(calculate_sulfate_chloride_ratio(100, 100)).toBeCloseTo(1.0, 4);
  });

  it("high sulfate relative to chloride yields ratio > 1 (hoppy profile)", () => {
    expect(calculate_sulfate_chloride_ratio(200, 50)).toBeGreaterThan(1);
    expect(calculate_sulfate_chloride_ratio(200, 50)).toBeCloseTo(4.0, 4);
  });

  it("high chloride relative to sulfate yields ratio < 1 (malty profile)", () => {
    expect(calculate_sulfate_chloride_ratio(50, 200)).toBeLessThan(1);
    expect(calculate_sulfate_chloride_ratio(50, 200)).toBeCloseTo(0.25, 4);
  });

  it("zero chloride with positive sulfate yields Infinity", () => {
    expect(calculate_sulfate_chloride_ratio(100, 0)).toBe(Infinity);
  });

  it("zero chloride with negative chloride yields Infinity (treated as <= 0)", () => {
    expect(calculate_sulfate_chloride_ratio(100, -10)).toBe(Infinity);
  });

  it("both zero yields 0 (not Infinity)", () => {
    expect(calculate_sulfate_chloride_ratio(0, 0)).toBe(0);
  });

  it("zero sulfate with positive chloride yields 0", () => {
    expect(calculate_sulfate_chloride_ratio(0, 100)).toBeCloseTo(0, 4);
  });

  it("ratio scales proportionally with sulfate", () => {
    const r1 = calculate_sulfate_chloride_ratio(100, 100);
    const r2 = calculate_sulfate_chloride_ratio(200, 100);
    expect(r2).toBeCloseTo(r1 * 2, 4);
  });
});

// ---------------------------------------------------------------------------
// describe_sulfate_chloride_ratio
// ---------------------------------------------------------------------------

describe("describe_sulfate_chloride_ratio", () => {
  it("ratio >= 2 returns 'very hoppy/bitter'", () => {
    expect(describe_sulfate_chloride_ratio(2)).toBe("very hoppy/bitter");
    expect(describe_sulfate_chloride_ratio(3.5)).toBe("very hoppy/bitter");
    expect(describe_sulfate_chloride_ratio(Infinity)).toBe("very hoppy/bitter");
  });

  it("ratio exactly 2 returns 'very hoppy/bitter' (boundary inclusive)", () => {
    expect(describe_sulfate_chloride_ratio(2)).toBe("very hoppy/bitter");
  });

  it("ratio 1.5 returns 'hoppy'", () => {
    expect(describe_sulfate_chloride_ratio(1.5)).toBe("hoppy");
    expect(describe_sulfate_chloride_ratio(1.8)).toBe("hoppy");
  });

  it("ratio just below 2 returns 'hoppy'", () => {
    expect(describe_sulfate_chloride_ratio(1.99)).toBe("hoppy");
  });

  it("ratio 1.0 returns 'balanced'", () => {
    expect(describe_sulfate_chloride_ratio(1.0)).toBe("balanced");
  });

  it("ratio 0.8 returns 'balanced' (lower bound inclusive)", () => {
    expect(describe_sulfate_chloride_ratio(0.8)).toBe("balanced");
  });

  it("ratio just below 1.5 returns 'balanced'", () => {
    expect(describe_sulfate_chloride_ratio(1.49)).toBe("balanced");
  });

  it("ratio 0.5 returns 'malty'", () => {
    expect(describe_sulfate_chloride_ratio(0.5)).toBe("malty");
    expect(describe_sulfate_chloride_ratio(0.6)).toBe("malty");
  });

  it("ratio 0.4 returns 'malty' (lower bound inclusive)", () => {
    expect(describe_sulfate_chloride_ratio(0.4)).toBe("malty");
  });

  it("ratio just below 0.8 returns 'malty'", () => {
    expect(describe_sulfate_chloride_ratio(0.79)).toBe("malty");
  });

  it("ratio 0.2 returns 'very malty/sweet'", () => {
    expect(describe_sulfate_chloride_ratio(0.2)).toBe("very malty/sweet");
    expect(describe_sulfate_chloride_ratio(0)).toBe("very malty/sweet");
  });

  it("ratio just below 0.4 returns 'very malty/sweet'", () => {
    expect(describe_sulfate_chloride_ratio(0.39)).toBe("very malty/sweet");
  });

  it("returns a non-empty string for every representative ratio", () => {
    const ratios = [0, 0.2, 0.5, 0.8, 1.0, 1.5, 2.0, 4.0];
    for (const r of ratios) {
      const desc = describe_sulfate_chloride_ratio(r);
      expect(typeof desc).toBe("string");
      expect(desc.length).toBeGreaterThan(0);
    }
  });
});
