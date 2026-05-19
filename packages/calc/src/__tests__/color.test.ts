import { describe, it, expect } from "vitest";
import {
  calculate_mcu,
  calculate_srm_morey,
  calculate_srm_daniels,
  calculate_srm_mosher,
  srm_to_ebc,
  ebc_to_srm,
  srm_to_lovibond,
  lovibond_to_srm,
  srm_to_css_color,
} from "../color";

// ---------------------------------------------------------------------------
// Constants mirrored from src/constants.ts — used to hand-compute references
// ---------------------------------------------------------------------------

const KG_TO_LB = 2.20462;
const L_TO_GAL = 0.264172;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

// 5 kg of Pale Malt (3.5°L) in a 20 L batch
// batch_gal = 20 * L_TO_GAL = 5.28344
// weight_lb = 5 * KG_TO_LB = 11.0231
// MCU = (3.5 * 11.0231) / 5.28344 ≈ 7.303
const PALE_ALE_GRAIN = [{ amount_kg: 5, color_lovibond: 3.5 }];
const BATCH_20L = 20;
const PALE_ALE_MCU =
  (3.5 * (5 * KG_TO_LB)) / (BATCH_20L * L_TO_GAL);

// 10 kg of Crystal 10°L in a 20 L batch — pushes MCU well above 10
// MCU = (10 * (10 * KG_TO_LB)) / (20 * L_TO_GAL) ≈ 41.7
const HIGH_COLOR_GRAIN = [{ amount_kg: 10, color_lovibond: 10 }];
const HIGH_MCU = (10 * (10 * KG_TO_LB)) / (BATCH_20L * L_TO_GAL);

// 20 kg of 20°L grain in 20 L — very high MCU for cross-formula divergence tests
// MCU ≈ (20 * (20 * KG_TO_LB)) / (20 * L_TO_GAL) ≈ 166.9
// Daniels: 0.2 * 166.9 + 8.4 ≈ 41.8
// Mosher:  0.3 * 166.9 + 4.7 ≈ 54.8  (clearly different)
const VERY_HIGH_COLOR_GRAIN = [{ amount_kg: 20, color_lovibond: 20 }];

// ---------------------------------------------------------------------------
// calculate_mcu
// ---------------------------------------------------------------------------

describe("calculate_mcu", () => {
  it("returns 0 for an empty fermentables list", () => {
    expect(calculate_mcu([], BATCH_20L)).toBe(0);
  });

  it("returns 0 when batch_size_l is zero", () => {
    expect(calculate_mcu(PALE_ALE_GRAIN, 0)).toBe(0);
  });

  it("returns 0 when batch_size_l is negative", () => {
    expect(calculate_mcu(PALE_ALE_GRAIN, -10)).toBe(0);
  });

  it("calculates MCU correctly for a single fermentable", () => {
    // 5 kg of 3.5°L grain in 20 L
    // weight_lb = 5 * 2.20462 = 11.0231
    // batch_gal = 20 * 0.264172 = 5.28344
    // MCU = (3.5 * 11.0231) / 5.28344 ≈ 7.303
    const result = calculate_mcu(PALE_ALE_GRAIN, BATCH_20L);
    expect(result).toBeCloseTo(PALE_ALE_MCU, 4);
    expect(result).toBeCloseTo(7.303, 2);
  });

  it("sums MCU contributions from multiple fermentables", () => {
    const single = calculate_mcu(PALE_ALE_GRAIN, BATCH_20L);
    const split = calculate_mcu(
      [
        { amount_kg: 2.5, color_lovibond: 3.5 },
        { amount_kg: 2.5, color_lovibond: 3.5 },
      ],
      BATCH_20L,
    );
    expect(split).toBeCloseTo(single, 6);
  });

  it("darker grain (higher Lovibond) produces higher MCU", () => {
    const pale = calculate_mcu([{ amount_kg: 5, color_lovibond: 2 }], BATCH_20L);
    const crystal = calculate_mcu([{ amount_kg: 5, color_lovibond: 60 }], BATCH_20L);
    expect(crystal).toBeGreaterThan(pale);
  });

  it("larger batch size produces lower MCU (dilution effect)", () => {
    const small_batch = calculate_mcu(PALE_ALE_GRAIN, 10);
    const large_batch = calculate_mcu(PALE_ALE_GRAIN, 40);
    expect(small_batch).toBeGreaterThan(large_batch);
  });

  it("doubling batch size halves MCU", () => {
    const at_20l = calculate_mcu(PALE_ALE_GRAIN, 20);
    const at_40l = calculate_mcu(PALE_ALE_GRAIN, 40);
    expect(at_20l).toBeCloseTo(at_40l * 2, 6);
  });

  it("doubling grain amount doubles MCU", () => {
    const single = calculate_mcu([{ amount_kg: 5, color_lovibond: 3.5 }], BATCH_20L);
    const doubled = calculate_mcu([{ amount_kg: 10, color_lovibond: 3.5 }], BATCH_20L);
    expect(doubled).toBeCloseTo(single * 2, 6);
  });

  it("a mixed grain bill with different Lovibond values accumulates correctly", () => {
    const grain_a = calculate_mcu([{ amount_kg: 4, color_lovibond: 2 }], BATCH_20L);
    const grain_b = calculate_mcu([{ amount_kg: 1, color_lovibond: 60 }], BATCH_20L);
    const combined = calculate_mcu(
      [
        { amount_kg: 4, color_lovibond: 2 },
        { amount_kg: 1, color_lovibond: 60 },
      ],
      BATCH_20L,
    );
    expect(combined).toBeCloseTo(grain_a + grain_b, 6);
  });
});

// ---------------------------------------------------------------------------
// calculate_srm_morey
// ---------------------------------------------------------------------------

describe("calculate_srm_morey", () => {
  it("returns 0 for an empty fermentables list", () => {
    expect(calculate_srm_morey([], BATCH_20L)).toBe(0);
  });

  it("returns 0 when batch_size_l is zero", () => {
    expect(calculate_srm_morey(PALE_ALE_GRAIN, 0)).toBe(0);
  });

  it("returns 0 when batch_size_l is negative", () => {
    expect(calculate_srm_morey(PALE_ALE_GRAIN, -10)).toBe(0);
  });

  it("returns a positive SRM for a typical pale ale grain bill", () => {
    expect(calculate_srm_morey(PALE_ALE_GRAIN, BATCH_20L)).toBeGreaterThan(0);
  });

  // Reference: MCU ≈ 7.303 → SRM = 1.4922 * 7.303^0.6859 ≈ 6.50
  it("matches the Morey formula output for a known pale ale grain bill", () => {
    const expected = 1.4922 * Math.pow(PALE_ALE_MCU, 0.6859);
    expect(calculate_srm_morey(PALE_ALE_GRAIN, BATCH_20L)).toBeCloseTo(
      expected,
      4,
    );
  });

  it("approximates ~5.8 SRM for a typical 5 kg pale malt / 20 L batch", () => {
    // actual: 1.4922 * 7.303^0.6859 ≈ 5.84
    expect(calculate_srm_morey(PALE_ALE_GRAIN, BATCH_20L)).toBeCloseTo(5.8, 0);
  });

  it("produces higher SRM for darker grain", () => {
    const pale = calculate_srm_morey(
      [{ amount_kg: 5, color_lovibond: 3.5 }],
      BATCH_20L,
    );
    const dark = calculate_srm_morey(
      [{ amount_kg: 5, color_lovibond: 60 }],
      BATCH_20L,
    );
    expect(dark).toBeGreaterThan(pale);
  });

  // Morey is a power function: SRM = 1.4922 * MCU^0.6859
  // Doubling MCU does not double SRM (exponent < 1)
  it("doubling MCU does NOT double SRM (non-linear power function)", () => {
    const srm_base = calculate_srm_morey(PALE_ALE_GRAIN, BATCH_20L);
    const srm_double_mcu = calculate_srm_morey(
      [{ amount_kg: 10, color_lovibond: 3.5 }],
      BATCH_20L,
    );
    // If it were linear, srm_double_mcu would equal srm_base * 2
    expect(srm_double_mcu).toBeLessThan(srm_base * 2);
  });

  it("larger batch produces lighter color", () => {
    const small = calculate_srm_morey(PALE_ALE_GRAIN, 10);
    const large = calculate_srm_morey(PALE_ALE_GRAIN, 40);
    expect(small).toBeGreaterThan(large);
  });
});

// ---------------------------------------------------------------------------
// calculate_srm_daniels
// ---------------------------------------------------------------------------

describe("calculate_srm_daniels", () => {
  it("returns 0 for an empty fermentables list", () => {
    expect(calculate_srm_daniels([], BATCH_20L)).toBe(0);
  });

  it("returns 0 when batch_size_l is zero", () => {
    expect(calculate_srm_daniels(PALE_ALE_GRAIN, 0)).toBe(0);
  });

  it("returns 0 when batch_size_l is negative", () => {
    expect(calculate_srm_daniels(PALE_ALE_GRAIN, -10)).toBe(0);
  });

  it("returns a positive SRM for a typical pale ale grain bill", () => {
    expect(calculate_srm_daniels(PALE_ALE_GRAIN, BATCH_20L)).toBeGreaterThan(0);
  });

  // PALE_ALE_MCU ≈ 7.303 (≤ 10) → uses Mosher formula: 0.3 * MCU + 4.7
  it("uses 0.3 × MCU + 4.7 formula when MCU ≤ 10", () => {
    const mcu = PALE_ALE_MCU; // ≈ 7.303
    const expected = 0.3 * mcu + 4.7;
    expect(calculate_srm_daniels(PALE_ALE_GRAIN, BATCH_20L)).toBeCloseTo(
      expected,
      4,
    );
  });

  // HIGH_MCU ≈ 41.73 (> 10) → uses 0.2 * MCU + 8.4
  it("uses 0.2 × MCU + 8.4 formula when MCU > 10", () => {
    const mcu = HIGH_MCU; // ≈ 41.73
    const expected = 0.2 * mcu + 8.4;
    expect(calculate_srm_daniels(HIGH_COLOR_GRAIN, BATCH_20L)).toBeCloseTo(
      expected,
      4,
    );
  });

  // Construct a grain bill where MCU is exactly at the boundary (= 10).
  // We need: color * weight_lb / batch_gal = 10
  // batch_gal = 20 * 0.264172 = 5.28344
  // With color_lovibond = 20: weight_lb = 10 * 5.28344 / 20 = 2.64172
  // amount_kg = 2.64172 / 2.20462 ≈ 1.19826
  // At exactly MCU = 10 the implementation uses the ≤ 10 branch: 0.3*10 + 4.7 = 7.7
  it("at the MCU = 10 boundary uses the ≤ 10 branch (0.3 × 10 + 4.7 = 7.7)", () => {
    const amount_kg = (10 * (BATCH_20L * L_TO_GAL)) / (20 * KG_TO_LB);
    const grain = [{ amount_kg, color_lovibond: 20 }];
    expect(calculate_srm_daniels(grain, BATCH_20L)).toBeCloseTo(7.7, 1);
  });

  // One kg above the boundary: MCU just above 10 must switch to 0.2 * MCU + 8.4
  it("just above MCU = 10 uses the > 10 branch", () => {
    // Add a tiny extra grain to push MCU over 10
    const boundary_kg = (10 * (BATCH_20L * L_TO_GAL)) / (20 * KG_TO_LB);
    const over_boundary = [
      { amount_kg: boundary_kg + 0.1, color_lovibond: 20 },
    ];
    const mcu = calculate_mcu(over_boundary, BATCH_20L);
    expect(mcu).toBeGreaterThan(10);
    const expected = 0.2 * mcu + 8.4;
    expect(calculate_srm_daniels(over_boundary, BATCH_20L)).toBeCloseTo(
      expected,
      4,
    );
  });

  it("larger batch produces lighter color", () => {
    const small = calculate_srm_daniels(PALE_ALE_GRAIN, 10);
    const large = calculate_srm_daniels(PALE_ALE_GRAIN, 40);
    expect(small).toBeGreaterThan(large);
  });
});

// ---------------------------------------------------------------------------
// calculate_srm_mosher
// ---------------------------------------------------------------------------

describe("calculate_srm_mosher", () => {
  it("returns 0 for an empty fermentables list", () => {
    expect(calculate_srm_mosher([], BATCH_20L)).toBe(0);
  });

  it("returns 0 when batch_size_l is zero", () => {
    expect(calculate_srm_mosher(PALE_ALE_GRAIN, 0)).toBe(0);
  });

  it("returns 0 when batch_size_l is negative", () => {
    expect(calculate_srm_mosher(PALE_ALE_GRAIN, -10)).toBe(0);
  });

  it("returns a positive SRM for a typical pale ale grain bill", () => {
    expect(calculate_srm_mosher(PALE_ALE_GRAIN, BATCH_20L)).toBeGreaterThan(0);
  });

  // Mosher formula is always linear: 0.3 * MCU + 4.7
  it("applies 0.3 × MCU + 4.7 across the full MCU range (low MCU)", () => {
    const mcu = PALE_ALE_MCU; // ≈ 7.303
    const expected = 0.3 * mcu + 4.7;
    expect(calculate_srm_mosher(PALE_ALE_GRAIN, BATCH_20L)).toBeCloseTo(
      expected,
      4,
    );
  });

  it("applies 0.3 × MCU + 4.7 across the full MCU range (high MCU)", () => {
    const mcu = HIGH_MCU; // ≈ 41.73
    const expected = 0.3 * mcu + 4.7;
    expect(calculate_srm_mosher(HIGH_COLOR_GRAIN, BATCH_20L)).toBeCloseTo(
      expected,
      4,
    );
  });

  it("is always linear: doubling MCU increases SRM by the same absolute amount", () => {
    const srm_at_mcu = calculate_srm_mosher(PALE_ALE_GRAIN, BATCH_20L);
    const srm_at_2mcu = calculate_srm_mosher(
      [{ amount_kg: 10, color_lovibond: 3.5 }],
      BATCH_20L,
    );
    // For a linear function: f(2x) - f(x) ≈ f(x) - f(0) = slope * mcu
    const increment = 0.3 * PALE_ALE_MCU;
    expect(srm_at_2mcu - srm_at_mcu).toBeCloseTo(increment, 4);
  });

  it("larger batch produces lighter color", () => {
    const small = calculate_srm_mosher(PALE_ALE_GRAIN, 10);
    const large = calculate_srm_mosher(PALE_ALE_GRAIN, 40);
    expect(small).toBeGreaterThan(large);
  });
});

// ---------------------------------------------------------------------------
// Cross-formula comparisons
// ---------------------------------------------------------------------------

describe("cross-formula comparisons", () => {
  it("all three return 0 for an empty grain bill", () => {
    expect(calculate_srm_morey([], BATCH_20L)).toBe(0);
    expect(calculate_srm_daniels([], BATCH_20L)).toBe(0);
    expect(calculate_srm_mosher([], BATCH_20L)).toBe(0);
  });

  it("all three return a positive SRM for the same typical input", () => {
    expect(calculate_srm_morey(PALE_ALE_GRAIN, BATCH_20L)).toBeGreaterThan(0);
    expect(calculate_srm_daniels(PALE_ALE_GRAIN, BATCH_20L)).toBeGreaterThan(0);
    expect(calculate_srm_mosher(PALE_ALE_GRAIN, BATCH_20L)).toBeGreaterThan(0);
  });

  // For very high MCU, Morey (power law) and Daniels/Mosher (linear) diverge noticeably
  it("all three produce different SRM values for a very high-MCU grain bill", () => {
    const morey = calculate_srm_morey(VERY_HIGH_COLOR_GRAIN, BATCH_20L);
    const daniels = calculate_srm_daniels(VERY_HIGH_COLOR_GRAIN, BATCH_20L);
    const mosher = calculate_srm_mosher(VERY_HIGH_COLOR_GRAIN, BATCH_20L);
    // Daniels ≈ 41.8, Mosher ≈ 54.8, Morey (power law) ≈ different from both
    expect(morey).not.toBeCloseTo(daniels, 0);
    expect(morey).not.toBeCloseTo(mosher, 0);
    expect(daniels).not.toBeCloseTo(mosher, 0);
  });

  // Daniels and Mosher share the same formula below MCU 10 (0.3 * MCU + 4.7)
  it("Daniels and Mosher agree for MCU ≤ 10", () => {
    // PALE_ALE_MCU ≈ 7.303 — safely below 10
    const daniels = calculate_srm_daniels(PALE_ALE_GRAIN, BATCH_20L);
    const mosher = calculate_srm_mosher(PALE_ALE_GRAIN, BATCH_20L);
    expect(daniels).toBeCloseTo(mosher, 6);
  });

  // Daniels and Mosher use different formulas above MCU 10, so they diverge
  // The difference grows as MCU increases: Δ = 0.1 * MCU - 3.7
  // At very high MCU the gap becomes clearly measurable
  it("Daniels and Mosher disagree for very high MCU", () => {
    const daniels = calculate_srm_daniels(VERY_HIGH_COLOR_GRAIN, BATCH_20L);
    const mosher = calculate_srm_mosher(VERY_HIGH_COLOR_GRAIN, BATCH_20L);
    // Daniels ≈ 41.8, Mosher ≈ 54.8 — gap of ~13 SRM
    expect(Math.abs(mosher - daniels)).toBeGreaterThan(5);
  });

  // Morey is a power law; at high MCU it grows more slowly than the linear formulas
  it("Morey grows more slowly than Mosher at very high MCU", () => {
    const very_dark = [{ amount_kg: 30, color_lovibond: 10 }];
    const morey = calculate_srm_morey(very_dark, BATCH_20L);
    const mosher = calculate_srm_mosher(very_dark, BATCH_20L);
    expect(mosher).toBeGreaterThan(morey);
  });
});

// ---------------------------------------------------------------------------
// srm_to_ebc and ebc_to_srm
// ---------------------------------------------------------------------------

describe("srm_to_ebc", () => {
  it("converts SRM 0 to EBC 0", () => {
    expect(srm_to_ebc(0)).toBe(0);
  });

  it("converts SRM 10 to EBC 19.7", () => {
    expect(srm_to_ebc(10)).toBeCloseTo(19.7, 1);
  });

  it("converts SRM 20 to EBC 39.4", () => {
    expect(srm_to_ebc(20)).toBeCloseTo(39.4, 1);
  });

  it("converts SRM 40 to EBC 78.8", () => {
    expect(srm_to_ebc(40)).toBeCloseTo(78.8, 1);
  });

  it("scales linearly with SRM", () => {
    const at_10 = srm_to_ebc(10);
    const at_20 = srm_to_ebc(20);
    expect(at_20).toBeCloseTo(at_10 * 2, 6);
  });
});

describe("ebc_to_srm", () => {
  it("converts EBC 0 to SRM 0", () => {
    expect(ebc_to_srm(0)).toBe(0);
  });

  it("converts EBC 19.7 to SRM ≈ 10", () => {
    expect(ebc_to_srm(19.7)).toBeCloseTo(10, 1);
  });

  it("converts EBC 39.4 to SRM ≈ 20", () => {
    expect(ebc_to_srm(39.4)).toBeCloseTo(20, 1);
  });

  it("is the exact inverse of srm_to_ebc (round-trip)", () => {
    const srm_values = [1, 5, 10, 20, 40, 80];
    for (const srm of srm_values) {
      expect(ebc_to_srm(srm_to_ebc(srm))).toBeCloseTo(srm, 6);
    }
  });

  it("srm_to_ebc then ebc_to_srm round-trips across typical range", () => {
    const srm = 35;
    expect(ebc_to_srm(srm_to_ebc(srm))).toBeCloseTo(srm, 6);
  });
});

// ---------------------------------------------------------------------------
// srm_to_lovibond and lovibond_to_srm
// ---------------------------------------------------------------------------

describe("srm_to_lovibond", () => {
  // SRM = 1.3546 * L - 0.76  →  L = (SRM + 0.76) / 1.3546
  it("converts SRM 0 to the correct Lovibond value", () => {
    expect(srm_to_lovibond(0)).toBeCloseTo(0.76 / 1.3546, 4);
  });

  it("converts SRM 10 to Lovibond ≈ 7.95", () => {
    // (10 + 0.76) / 1.3546 = 10.76 / 1.3546 ≈ 7.944
    expect(srm_to_lovibond(10)).toBeCloseTo(7.944, 2);
  });

  it("converts SRM 20 to Lovibond ≈ 15.32", () => {
    // (20 + 0.76) / 1.3546 ≈ 15.326
    expect(srm_to_lovibond(20)).toBeCloseTo(15.326, 2);
  });

  it("is the exact inverse of lovibond_to_srm (round-trip)", () => {
    const srm_values = [1, 5, 10, 20, 40, 60];
    for (const srm of srm_values) {
      expect(lovibond_to_srm(srm_to_lovibond(srm))).toBeCloseTo(srm, 6);
    }
  });
});

describe("lovibond_to_srm", () => {
  // SRM = 1.3546 * L - 0.76
  it("converts Lovibond 1 to SRM ≈ 0.59", () => {
    expect(lovibond_to_srm(1)).toBeCloseTo(1.3546 - 0.76, 4);
  });

  it("converts Lovibond 10 to SRM ≈ 12.79", () => {
    // 1.3546 * 10 - 0.76 = 13.546 - 0.76 = 12.786
    expect(lovibond_to_srm(10)).toBeCloseTo(12.786, 2);
  });

  it("converts Lovibond 40 to SRM ≈ 53.42", () => {
    // 1.3546 * 40 - 0.76 = 54.184 - 0.76 = 53.424
    expect(lovibond_to_srm(40)).toBeCloseTo(53.424, 2);
  });

  it("is the exact inverse of srm_to_lovibond (round-trip)", () => {
    const lovibond_values = [2, 8, 15, 30, 60, 120];
    for (const l of lovibond_values) {
      expect(srm_to_lovibond(lovibond_to_srm(l))).toBeCloseTo(l, 6);
    }
  });

  it("scales linearly: doubling Lovibond increases SRM by the same amount", () => {
    const increment = lovibond_to_srm(20) - lovibond_to_srm(10);
    const same_increment = lovibond_to_srm(10) - lovibond_to_srm(0);
    expect(increment).toBeCloseTo(same_increment, 4);
  });
});

// ---------------------------------------------------------------------------
// srm_to_css_color
// ---------------------------------------------------------------------------

describe("srm_to_css_color", () => {
  it("returns the first color (#FFE699) for SRM 0", () => {
    expect(srm_to_css_color(0)).toBe("#FFE699");
  });

  it("returns the first color (#FFE699) for negative SRM", () => {
    expect(srm_to_css_color(-5)).toBe("#FFE699");
  });

  it("returns #FFD878 for SRM 1", () => {
    expect(srm_to_css_color(1)).toBe("#FFD878");
  });

  it("returns #F8A600 for SRM 5", () => {
    expect(srm_to_css_color(5)).toBe("#F8A600");
  });

  it("returns #D77200 for SRM 10", () => {
    expect(srm_to_css_color(10)).toBe("#D77200");
  });

  it("returns #952D00 for SRM 20", () => {
    expect(srm_to_css_color(20)).toBe("#952D00");
  });

  it("returns #470606 for SRM 35", () => {
    expect(srm_to_css_color(35)).toBe("#470606");
  });

  it("returns #340405 for SRM 40", () => {
    expect(srm_to_css_color(40)).toBe("#340405");
  });

  it("returns the darkest entry (#050101) for SRM 80", () => {
    expect(srm_to_css_color(80)).toBe("#050101");
  });

  it("returns the darkest entry (#050101) for SRM above 80", () => {
    expect(srm_to_css_color(100)).toBe("#050101");
    expect(srm_to_css_color(200)).toBe("#050101");
  });

  // Between exact table entries, should return the lower bound entry
  it("returns the lower table entry for SRM values between table entries", () => {
    // Between SRM 30 (#5A0A02) and SRM 35 (#470606), SRM 32 should give SRM 30's color
    expect(srm_to_css_color(32)).toBe("#5A0A02");
  });

  it("returns a valid hex color string (# followed by 6 hex digits)", () => {
    const hex_re = /^#[0-9A-Fa-f]{6}$/;
    const test_srm_values = [0, 1, 5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 100];
    for (const srm of test_srm_values) {
      expect(srm_to_css_color(srm)).toMatch(hex_re);
    }
  });

  it("produces darker colors (lower luminance) for higher SRM values", () => {
    // Compare hex values numerically — higher SRM should produce darker (lower) hex value
    const parse_hex = (color: string): number =>
      parseInt(color.replace("#", ""), 16);
    expect(parse_hex(srm_to_css_color(5))).toBeGreaterThan(
      parse_hex(srm_to_css_color(40)),
    );
    expect(parse_hex(srm_to_css_color(1))).toBeGreaterThan(
      parse_hex(srm_to_css_color(20)),
    );
  });
});
