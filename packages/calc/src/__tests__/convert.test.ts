import { describe, it, expect } from "vitest";
import {
  sg_to_plato,
  plato_to_sg,
  c_to_f,
  f_to_c,
  convert_units,
  from_canonical,
  to_canonical,
} from "../convert";

// ---------------------------------------------------------------------------
// sg_to_plato
// ---------------------------------------------------------------------------

describe("sg_to_plato", () => {
  it("converts SG 1.000 to 0 Plato", () => {
    expect(sg_to_plato(1.0)).toBeCloseTo(0, 1);
  });

  it("converts SG 1.040 to approximately 9.99 Plato", () => {
    // Reference: published Plato tables give ~9.99°P at SG 1.040
    expect(sg_to_plato(1.04)).toBeCloseTo(9.99, 1);
  });

  it("converts SG 1.060 to approximately 14.7 Plato", () => {
    expect(sg_to_plato(1.06)).toBeCloseTo(14.7, 0);
  });

  it("converts SG 1.080 to approximately 19.3 Plato", () => {
    expect(sg_to_plato(1.08)).toBeCloseTo(19.3, 0);
  });

  it("converts SG 1.100 to approximately 23.8 Plato", () => {
    expect(sg_to_plato(1.1)).toBeCloseTo(23.8, 0);
  });

  it("returns a positive value for any SG above 1.000", () => {
    expect(sg_to_plato(1.05)).toBeGreaterThan(0);
  });

  it("produces a higher Plato for higher SG", () => {
    expect(sg_to_plato(1.08)).toBeGreaterThan(sg_to_plato(1.05));
  });
});

// ---------------------------------------------------------------------------
// plato_to_sg
// ---------------------------------------------------------------------------

describe("plato_to_sg", () => {
  it("converts 0 Plato to SG 1.000", () => {
    expect(plato_to_sg(0)).toBeCloseTo(1.0, 3);
  });

  it("converts 10 Plato to approximately SG 1.040", () => {
    expect(plato_to_sg(10)).toBeCloseTo(1.04, 2);
  });

  it("converts 15 Plato to approximately SG 1.061", () => {
    expect(plato_to_sg(15)).toBeCloseTo(1.061, 2);
  });

  it("converts 20 Plato to approximately SG 1.083", () => {
    expect(plato_to_sg(20)).toBeCloseTo(1.083, 2);
  });

  it("produces a higher SG for higher Plato", () => {
    expect(plato_to_sg(20)).toBeGreaterThan(plato_to_sg(10));
  });
});

// ---------------------------------------------------------------------------
// SG ↔ Plato round-trips
// ---------------------------------------------------------------------------

describe("sg_to_plato / plato_to_sg round-trips", () => {
  const sg_values = [1.0, 1.04, 1.06, 1.08, 1.1];

  for (const sg of sg_values) {
    it(`plato_to_sg(sg_to_plato(${sg})) round-trips to within 0.001 SG`, () => {
      expect(plato_to_sg(sg_to_plato(sg))).toBeCloseTo(sg, 3);
    });
  }

  // The Plato→SG and SG→Plato functions use two different published polynomial
  // approximations. Each is accurate to ~0.001 SG individually, but the cross-
  // formula round-trip accumulates ~0.003 Plato of drift at typical gravities.
  // Precision 1 (within 0.05 Plato) is the correct tolerance here.
  it("sg_to_plato(plato_to_sg(12)) round-trips to within 0.05 Plato", () => {
    expect(sg_to_plato(plato_to_sg(12))).toBeCloseTo(12, 1);
  });

  it("sg_to_plato(plato_to_sg(20)) round-trips to within 0.05 Plato", () => {
    expect(sg_to_plato(plato_to_sg(20))).toBeCloseTo(20, 1);
  });
});

// ---------------------------------------------------------------------------
// c_to_f
// ---------------------------------------------------------------------------

describe("c_to_f", () => {
  it("converts 0°C to 32°F", () => {
    expect(c_to_f(0)).toBe(32);
  });

  it("converts 100°C to 212°F", () => {
    expect(c_to_f(100)).toBe(212);
  });

  it("converts 20°C to 68°F", () => {
    expect(c_to_f(20)).toBeCloseTo(68, 4);
  });

  it("converts -40°C to -40°F", () => {
    expect(c_to_f(-40)).toBeCloseTo(-40, 4);
  });

  it("converts typical mash temperature 68°C to approximately 154.4°F", () => {
    expect(c_to_f(68)).toBeCloseTo(154.4, 1);
  });
});

// ---------------------------------------------------------------------------
// f_to_c
// ---------------------------------------------------------------------------

describe("f_to_c", () => {
  it("converts 32°F to 0°C", () => {
    expect(f_to_c(32)).toBe(0);
  });

  it("converts 212°F to 100°C", () => {
    expect(f_to_c(212)).toBeCloseTo(100, 4);
  });

  it("converts 68°F to 20°C", () => {
    expect(f_to_c(68)).toBeCloseTo(20, 4);
  });

  it("converts -40°F to -40°C", () => {
    expect(f_to_c(-40)).toBeCloseTo(-40, 4);
  });

  it("round-trips: f_to_c(c_to_f(c)) === c for several values", () => {
    for (const c of [0, 20, 37, 68, 100, -10]) {
      expect(f_to_c(c_to_f(c))).toBeCloseTo(c, 6);
    }
  });

  it("round-trips: c_to_f(f_to_c(f)) === f for several values", () => {
    for (const f of [32, 68, 154.4, 212, -40]) {
      expect(c_to_f(f_to_c(f))).toBeCloseTo(f, 6);
    }
  });
});

// ---------------------------------------------------------------------------
// convert_units — BATCH_VOLUME
// ---------------------------------------------------------------------------

describe("convert_units BATCH_VOLUME", () => {
  it("identity: L to L returns the same value", () => {
    expect(convert_units(19, "BATCH_VOLUME", "L", "L")).toBe(19);
  });

  it("converts 19 L to approximately 5.02 gal", () => {
    expect(convert_units(19, "BATCH_VOLUME", "L", "gal")).toBeCloseTo(5.019, 2);
  });

  it("converts 1 L to 0.264172 gal", () => {
    expect(convert_units(1, "BATCH_VOLUME", "L", "gal")).toBeCloseTo(
      0.264172,
      4,
    );
  });

  it("converts 1 gal to approximately 3.785 L", () => {
    expect(convert_units(1, "BATCH_VOLUME", "gal", "L")).toBeCloseTo(3.785, 2);
  });

  it("converts 5 gal to approximately 18.93 L", () => {
    expect(convert_units(5, "BATCH_VOLUME", "gal", "L")).toBeCloseTo(18.93, 1);
  });

  it("round-trips: L → gal → L", () => {
    const liters = 23;
    expect(
      convert_units(convert_units(liters, "BATCH_VOLUME", "L", "gal"), "BATCH_VOLUME", "gal", "L"),
    ).toBeCloseTo(liters, 6);
  });

  it("converts 0 L to 0 gal", () => {
    expect(convert_units(0, "BATCH_VOLUME", "L", "gal")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// convert_units — SMALL_VOLUME
// ---------------------------------------------------------------------------

describe("convert_units SMALL_VOLUME", () => {
  it("identity: mL to mL returns the same value", () => {
    expect(convert_units(50, "SMALL_VOLUME", "mL", "mL")).toBe(50);
  });

  it("converts 1 L to 1000 mL", () => {
    expect(convert_units(1, "SMALL_VOLUME", "L", "mL")).toBeCloseTo(1000, 4);
  });

  it("converts 1000 mL to 1 L", () => {
    expect(convert_units(1000, "SMALL_VOLUME", "mL", "L")).toBeCloseTo(1, 4);
  });

  it("converts 1 L to approximately 33.814 fl_oz", () => {
    expect(convert_units(1, "SMALL_VOLUME", "L", "fl_oz")).toBeCloseTo(33.814, 1);
  });

  it("converts 29.5735 mL (1 fl oz) to approximately 1 fl_oz", () => {
    // 1 fl oz = 29.5735 mL
    expect(convert_units(29.5735, "SMALL_VOLUME", "mL", "fl_oz")).toBeCloseTo(1, 2);
  });

  it("converts 1 L to approximately 202.884 tsp", () => {
    expect(convert_units(1, "SMALL_VOLUME", "L", "tsp")).toBeCloseTo(202.884, 1);
  });

  it("converts 1 L to approximately 67.628 tbsp", () => {
    expect(convert_units(1, "SMALL_VOLUME", "L", "tbsp")).toBeCloseTo(67.628, 1);
  });

  it("round-trips: mL → fl_oz → mL", () => {
    const ml = 100;
    expect(
      convert_units(convert_units(ml, "SMALL_VOLUME", "mL", "fl_oz"), "SMALL_VOLUME", "fl_oz", "mL"),
    ).toBeCloseTo(ml, 4);
  });

  it("round-trips: L → tsp → L", () => {
    const liters = 0.05;
    expect(
      convert_units(convert_units(liters, "SMALL_VOLUME", "L", "tsp"), "SMALL_VOLUME", "tsp", "L"),
    ).toBeCloseTo(liters, 6);
  });

  it("converts 0 mL to 0 fl_oz", () => {
    expect(convert_units(0, "SMALL_VOLUME", "mL", "fl_oz")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// convert_units — GRAIN_WEIGHT
// ---------------------------------------------------------------------------

describe("convert_units GRAIN_WEIGHT", () => {
  it("identity: kg to kg returns the same value", () => {
    expect(convert_units(5, "GRAIN_WEIGHT", "kg", "kg")).toBe(5);
  });

  it("converts 1 kg to approximately 2.20462 lb (lb_oz)", () => {
    expect(convert_units(1, "GRAIN_WEIGHT", "kg", "lb_oz")).toBeCloseTo(
      2.20462,
      4,
    );
  });

  it("converts 1 lb (lb_oz) to approximately 0.4536 kg", () => {
    expect(convert_units(1, "GRAIN_WEIGHT", "lb_oz", "kg")).toBeCloseTo(
      0.4536,
      3,
    );
  });

  it("converts 5 kg to approximately 11.023 lb (lb_oz)", () => {
    expect(convert_units(5, "GRAIN_WEIGHT", "kg", "lb_oz")).toBeCloseTo(
      11.023,
      2,
    );
  });

  it("round-trips: kg → lb_oz → kg", () => {
    const kg = 4.536;
    expect(
      convert_units(convert_units(kg, "GRAIN_WEIGHT", "kg", "lb_oz"), "GRAIN_WEIGHT", "lb_oz", "kg"),
    ).toBeCloseTo(kg, 6);
  });

  it("converts 0 kg to 0 lb_oz", () => {
    expect(convert_units(0, "GRAIN_WEIGHT", "kg", "lb_oz")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// convert_units — HOP_WEIGHT
// ---------------------------------------------------------------------------

describe("convert_units HOP_WEIGHT", () => {
  it("identity: g to g returns the same value", () => {
    expect(convert_units(28, "HOP_WEIGHT", "g", "g")).toBe(28);
  });

  it("converts 1 kg to 1000 g", () => {
    expect(convert_units(1, "HOP_WEIGHT", "kg", "g")).toBeCloseTo(1000, 4);
  });

  it("converts 1000 g to 1 kg", () => {
    expect(convert_units(1000, "HOP_WEIGHT", "g", "kg")).toBeCloseTo(1, 4);
  });

  it("converts 1 kg to approximately 35.274 oz", () => {
    expect(convert_units(1, "HOP_WEIGHT", "kg", "oz")).toBeCloseTo(35.274, 2);
  });

  it("converts 1 oz to approximately 28.35 g", () => {
    // 1 oz = 1/35.274 kg = 28.35 g
    expect(
      convert_units(convert_units(1, "HOP_WEIGHT", "oz", "kg"), "HOP_WEIGHT", "kg", "g"),
    ).toBeCloseTo(28.35, 1);
  });

  it("converts 28 g (1 oz) to approximately 1 oz", () => {
    expect(convert_units(28, "HOP_WEIGHT", "g", "oz")).toBeCloseTo(0.988, 2);
  });

  it("round-trips: g → oz → g", () => {
    const grams = 28;
    expect(
      convert_units(convert_units(grams, "HOP_WEIGHT", "g", "oz"), "HOP_WEIGHT", "oz", "g"),
    ).toBeCloseTo(grams, 4);
  });

  it("round-trips: kg → g → kg", () => {
    const kg = 0.028;
    expect(
      convert_units(convert_units(kg, "HOP_WEIGHT", "kg", "g"), "HOP_WEIGHT", "g", "kg"),
    ).toBeCloseTo(kg, 6);
  });

  it("converts 0 g to 0 oz", () => {
    expect(convert_units(0, "HOP_WEIGHT", "g", "oz")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// convert_units — MISC_WEIGHT
// ---------------------------------------------------------------------------

describe("convert_units MISC_WEIGHT", () => {
  it("identity: g to g returns the same value", () => {
    expect(convert_units(10, "MISC_WEIGHT", "g", "g")).toBe(10);
  });

  it("converts 1 kg to 1000 g", () => {
    expect(convert_units(1, "MISC_WEIGHT", "kg", "g")).toBeCloseTo(1000, 4);
  });

  it("converts 1 kg to approximately 35.274 oz", () => {
    expect(convert_units(1, "MISC_WEIGHT", "kg", "oz")).toBeCloseTo(35.274, 2);
  });

  it("round-trips: kg → oz → kg", () => {
    const kg = 0.1;
    expect(
      convert_units(convert_units(kg, "MISC_WEIGHT", "kg", "oz"), "MISC_WEIGHT", "oz", "kg"),
    ).toBeCloseTo(kg, 6);
  });

  it("converts 0 g to 0 oz", () => {
    expect(convert_units(0, "MISC_WEIGHT", "g", "oz")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// convert_units — TEMPERATURE
// ---------------------------------------------------------------------------

describe("convert_units TEMPERATURE", () => {
  it("identity: C to C returns the same value", () => {
    expect(convert_units(20, "TEMPERATURE", "C", "C")).toBe(20);
  });

  it("identity: F to F returns the same value", () => {
    expect(convert_units(68, "TEMPERATURE", "F", "F")).toBe(68);
  });

  it("converts 0°C to 32°F", () => {
    expect(convert_units(0, "TEMPERATURE", "C", "F")).toBeCloseTo(32, 4);
  });

  it("converts 100°C to 212°F", () => {
    expect(convert_units(100, "TEMPERATURE", "C", "F")).toBeCloseTo(212, 4);
  });

  it("converts 32°F to 0°C", () => {
    expect(convert_units(32, "TEMPERATURE", "F", "C")).toBeCloseTo(0, 4);
  });

  it("converts 212°F to 100°C", () => {
    expect(convert_units(212, "TEMPERATURE", "F", "C")).toBeCloseTo(100, 4);
  });

  it("converts -40°C to -40°F", () => {
    expect(convert_units(-40, "TEMPERATURE", "C", "F")).toBeCloseTo(-40, 4);
  });

  it("round-trips: C → F → C", () => {
    expect(
      convert_units(convert_units(68, "TEMPERATURE", "C", "F"), "TEMPERATURE", "F", "C"),
    ).toBeCloseTo(68, 6);
  });
});

// ---------------------------------------------------------------------------
// convert_units — GRAVITY
// ---------------------------------------------------------------------------

describe("convert_units GRAVITY", () => {
  it("identity: SG to SG returns the same value", () => {
    expect(convert_units(1.05, "GRAVITY", "SG", "SG")).toBe(1.05);
  });

  it("identity: Plato to Plato returns the same value", () => {
    expect(convert_units(12, "GRAVITY", "Plato", "Plato")).toBe(12);
  });

  it("converts SG 1.000 to 0 Plato", () => {
    expect(convert_units(1.0, "GRAVITY", "SG", "Plato")).toBeCloseTo(0, 1);
  });

  it("converts SG 1.040 to approximately 9.99 Plato", () => {
    expect(convert_units(1.04, "GRAVITY", "SG", "Plato")).toBeCloseTo(9.99, 1);
  });

  it("converts SG 1.060 to approximately 14.7 Plato", () => {
    expect(convert_units(1.06, "GRAVITY", "SG", "Plato")).toBeCloseTo(14.7, 0);
  });

  it("converts SG 1.080 to approximately 19.3 Plato", () => {
    expect(convert_units(1.08, "GRAVITY", "SG", "Plato")).toBeCloseTo(19.3, 0);
  });

  it("converts SG 1.100 to approximately 23.8 Plato", () => {
    expect(convert_units(1.1, "GRAVITY", "SG", "Plato")).toBeCloseTo(23.8, 0);
  });

  it("converts 12 Plato back to approximately SG 1.048", () => {
    expect(convert_units(12, "GRAVITY", "Plato", "SG")).toBeCloseTo(1.048, 2);
  });

  it("round-trips: SG → Plato → SG (within 0.001 SG)", () => {
    for (const sg of [1.0, 1.04, 1.06, 1.08, 1.1]) {
      const plato = convert_units(sg, "GRAVITY", "SG", "Plato");
      expect(convert_units(plato, "GRAVITY", "Plato", "SG")).toBeCloseTo(sg, 3);
    }
  });
});

// ---------------------------------------------------------------------------
// convert_units — COLOR
// ---------------------------------------------------------------------------

describe("convert_units COLOR", () => {
  it("identity: SRM to SRM returns the same value", () => {
    expect(convert_units(10, "COLOR", "SRM", "SRM")).toBe(10);
  });

  it("identity: EBC to EBC returns the same value", () => {
    expect(convert_units(19.7, "COLOR", "EBC", "EBC")).toBe(19.7);
  });

  it("converts 0 SRM to 0 EBC", () => {
    expect(convert_units(0, "COLOR", "SRM", "EBC")).toBe(0);
  });

  it("converts 10 SRM to 19.7 EBC", () => {
    expect(convert_units(10, "COLOR", "SRM", "EBC")).toBeCloseTo(19.7, 1);
  });

  it("converts 20 SRM to 39.4 EBC", () => {
    expect(convert_units(20, "COLOR", "SRM", "EBC")).toBeCloseTo(39.4, 1);
  });

  it("converts 19.7 EBC to 10 SRM", () => {
    expect(convert_units(19.7, "COLOR", "EBC", "SRM")).toBeCloseTo(10, 1);
  });

  it("converts 10 SRM to the correct Lovibond value", () => {
    // srm_to_lovibond: (10 + 0.76) / 1.3546 ≈ 7.944
    expect(convert_units(10, "COLOR", "SRM", "Lovibond")).toBeCloseTo(7.944, 2);
  });

  it("converts Lovibond 10 to approximately 12.79 SRM", () => {
    // lovibond_to_srm: 1.3546 * 10 - 0.76 = 12.786
    expect(convert_units(10, "COLOR", "Lovibond", "SRM")).toBeCloseTo(12.786, 2);
  });

  it("converts EBC to Lovibond via SRM intermediate", () => {
    // 20 SRM → 39.4 EBC; 39.4 EBC → 20 SRM → (20+0.76)/1.3546 Lovibond
    const ebc = convert_units(20, "COLOR", "SRM", "EBC");
    const lovibond_from_ebc = convert_units(ebc, "COLOR", "EBC", "Lovibond");
    const lovibond_from_srm = convert_units(20, "COLOR", "SRM", "Lovibond");
    expect(lovibond_from_ebc).toBeCloseTo(lovibond_from_srm, 4);
  });

  it("round-trips: SRM → EBC → SRM", () => {
    for (const srm of [1, 5, 10, 20, 40, 80]) {
      const ebc = convert_units(srm, "COLOR", "SRM", "EBC");
      expect(convert_units(ebc, "COLOR", "EBC", "SRM")).toBeCloseTo(srm, 4);
    }
  });

  it("round-trips: SRM → Lovibond → SRM", () => {
    for (const srm of [1, 5, 10, 20, 40]) {
      const lov = convert_units(srm, "COLOR", "SRM", "Lovibond");
      expect(convert_units(lov, "COLOR", "Lovibond", "SRM")).toBeCloseTo(srm, 4);
    }
  });

  it("round-trips: EBC → SRM → EBC", () => {
    for (const ebc of [2, 10, 20, 40, 80]) {
      const srm = convert_units(ebc, "COLOR", "EBC", "SRM");
      expect(convert_units(srm, "COLOR", "SRM", "EBC")).toBeCloseTo(ebc, 4);
    }
  });
});

// ---------------------------------------------------------------------------
// convert_units — PRESSURE
// ---------------------------------------------------------------------------

describe("convert_units PRESSURE", () => {
  it("identity: kPa to kPa returns the same value", () => {
    expect(convert_units(101.325, "PRESSURE", "kPa", "kPa")).toBe(101.325);
  });

  it("identity: PSI to PSI returns the same value", () => {
    expect(convert_units(14.696, "PRESSURE", "PSI", "PSI")).toBe(14.696);
  });

  it("converts 0 kPa to 0 PSI", () => {
    expect(convert_units(0, "PRESSURE", "kPa", "PSI")).toBe(0);
  });

  it("converts 101.325 kPa to approximately 14.696 PSI (1 atm)", () => {
    expect(convert_units(101.325, "PRESSURE", "kPa", "PSI")).toBeCloseTo(
      14.696,
      2,
    );
  });

  it("converts 14.696 PSI to approximately 101.325 kPa", () => {
    expect(convert_units(14.696, "PRESSURE", "PSI", "kPa")).toBeCloseTo(
      101.325,
      1,
    );
  });

  it("converts 100 kPa to 1 bar", () => {
    expect(convert_units(100, "PRESSURE", "kPa", "bar")).toBeCloseTo(1, 4);
  });

  it("converts 1 bar to 100 kPa", () => {
    expect(convert_units(1, "PRESSURE", "bar", "kPa")).toBeCloseTo(100, 4);
  });

  it("converts 1 bar to approximately 14.504 PSI", () => {
    // 1 bar = 100 kPa; 100 kPa * 0.145038 = 14.504 PSI
    const psi = convert_units(
      convert_units(1, "PRESSURE", "bar", "kPa"),
      "PRESSURE",
      "kPa",
      "PSI",
    );
    expect(psi).toBeCloseTo(14.504, 2);
  });

  it("round-trips: kPa → PSI → kPa", () => {
    const kpa = 207;
    expect(
      convert_units(convert_units(kpa, "PRESSURE", "kPa", "PSI"), "PRESSURE", "PSI", "kPa"),
    ).toBeCloseTo(kpa, 4);
  });

  it("round-trips: kPa → bar → kPa", () => {
    const kpa = 207;
    expect(
      convert_units(convert_units(kpa, "PRESSURE", "kPa", "bar"), "PRESSURE", "bar", "kPa"),
    ).toBeCloseTo(kpa, 4);
  });

  it("round-trips: PSI → kPa → PSI", () => {
    const psi = 30;
    expect(
      convert_units(convert_units(psi, "PRESSURE", "PSI", "kPa"), "PRESSURE", "kPa", "PSI"),
    ).toBeCloseTo(psi, 4);
  });
});

// ---------------------------------------------------------------------------
// convert_units — EVAP_RATE
// ---------------------------------------------------------------------------

describe("convert_units EVAP_RATE", () => {
  it("identity: L_per_hr to L_per_hr returns the same value", () => {
    expect(convert_units(4, "EVAP_RATE", "L_per_hr", "L_per_hr")).toBe(4);
  });

  it("identity: gal_per_hr to gal_per_hr returns the same value", () => {
    expect(convert_units(1, "EVAP_RATE", "gal_per_hr", "gal_per_hr")).toBe(1);
  });

  it("converts 1 L_per_hr to approximately 0.264172 gal_per_hr", () => {
    expect(convert_units(1, "EVAP_RATE", "L_per_hr", "gal_per_hr")).toBeCloseTo(
      0.264172,
      4,
    );
  });

  it("converts 1 gal_per_hr to approximately 3.785 L_per_hr", () => {
    expect(convert_units(1, "EVAP_RATE", "gal_per_hr", "L_per_hr")).toBeCloseTo(
      3.785,
      2,
    );
  });

  it("converts 0 L_per_hr to 0 gal_per_hr", () => {
    expect(convert_units(0, "EVAP_RATE", "L_per_hr", "gal_per_hr")).toBe(0);
  });

  it("round-trips: L_per_hr → gal_per_hr → L_per_hr", () => {
    const lph = 4;
    expect(
      convert_units(convert_units(lph, "EVAP_RATE", "L_per_hr", "gal_per_hr"), "EVAP_RATE", "gal_per_hr", "L_per_hr"),
    ).toBeCloseTo(lph, 6);
  });
});

// ---------------------------------------------------------------------------
// from_canonical
// ---------------------------------------------------------------------------

describe("from_canonical", () => {
  it("converts 19 L (canonical BATCH_VOLUME) to approximately 5.02 gal", () => {
    expect(from_canonical(19, "BATCH_VOLUME", "gal")).toBeCloseTo(5.019, 2);
  });

  it("converts 1 L (canonical BATCH_VOLUME) to L returns 1 (identity)", () => {
    expect(from_canonical(1, "BATCH_VOLUME", "L")).toBeCloseTo(1, 6);
  });

  it("converts 1 kg (canonical GRAIN_WEIGHT) to lb_oz returns 2.20462", () => {
    expect(from_canonical(1, "GRAIN_WEIGHT", "lb_oz")).toBeCloseTo(2.20462, 4);
  });

  it("converts 1 kg (canonical HOP_WEIGHT) to g returns 1000", () => {
    expect(from_canonical(1, "HOP_WEIGHT", "g")).toBeCloseTo(1000, 4);
  });

  it("converts 1 kg (canonical HOP_WEIGHT) to oz returns approximately 35.274", () => {
    expect(from_canonical(1, "HOP_WEIGHT", "oz")).toBeCloseTo(35.274, 2);
  });

  it("converts 20°C (canonical TEMPERATURE) to F returns 68", () => {
    expect(from_canonical(20, "TEMPERATURE", "F")).toBeCloseTo(68, 4);
  });

  it("converts SG 1.05 (canonical GRAVITY) to Plato returns approximately 12.4", () => {
    expect(from_canonical(1.05, "GRAVITY", "Plato")).toBeCloseTo(12.4, 0);
  });

  it("converts 10 SRM (canonical COLOR) to EBC returns 19.7", () => {
    expect(from_canonical(10, "COLOR", "EBC")).toBeCloseTo(19.7, 1);
  });

  it("converts 100 kPa (canonical PRESSURE) to bar returns 1", () => {
    expect(from_canonical(100, "PRESSURE", "bar")).toBeCloseTo(1, 4);
  });

  it("converts 4 L_per_hr (canonical EVAP_RATE) to gal_per_hr", () => {
    expect(from_canonical(4, "EVAP_RATE", "gal_per_hr")).toBeCloseTo(
      4 * 0.264172,
      4,
    );
  });

  it("converts 0.001 L (canonical SMALL_VOLUME) to mL returns 1", () => {
    expect(from_canonical(0.001, "SMALL_VOLUME", "mL")).toBeCloseTo(1, 4);
  });

  it("converting to the canonical unit itself is always an identity", () => {
    expect(from_canonical(5, "GRAIN_WEIGHT", "kg")).toBeCloseTo(5, 6);
    expect(from_canonical(20, "TEMPERATURE", "C")).toBeCloseTo(20, 6);
    expect(from_canonical(1.05, "GRAVITY", "SG")).toBeCloseTo(1.05, 6);
    expect(from_canonical(10, "COLOR", "SRM")).toBeCloseTo(10, 6);
    expect(from_canonical(100, "PRESSURE", "kPa")).toBeCloseTo(100, 6);
    expect(from_canonical(4, "EVAP_RATE", "L_per_hr")).toBeCloseTo(4, 6);
  });
});

// ---------------------------------------------------------------------------
// to_canonical
// ---------------------------------------------------------------------------

describe("to_canonical", () => {
  it("converts 5.019 gal to approximately 19 L (BATCH_VOLUME)", () => {
    expect(to_canonical(5.019, "BATCH_VOLUME", "gal")).toBeCloseTo(19, 1);
  });

  it("converts 2.20462 lb_oz to 1 kg (GRAIN_WEIGHT)", () => {
    expect(to_canonical(2.20462, "GRAIN_WEIGHT", "lb_oz")).toBeCloseTo(1, 4);
  });

  it("converts 1000 g to 1 kg (HOP_WEIGHT)", () => {
    expect(to_canonical(1000, "HOP_WEIGHT", "g")).toBeCloseTo(1, 4);
  });

  it("converts 35.274 oz to 1 kg (HOP_WEIGHT)", () => {
    expect(to_canonical(35.274, "HOP_WEIGHT", "oz")).toBeCloseTo(1, 2);
  });

  it("converts 68°F to 20°C (TEMPERATURE)", () => {
    expect(to_canonical(68, "TEMPERATURE", "F")).toBeCloseTo(20, 4);
  });

  it("converts 12.4 Plato to approximately SG 1.050 (GRAVITY)", () => {
    expect(to_canonical(12.4, "GRAVITY", "Plato")).toBeCloseTo(1.05, 2);
  });

  it("converts 19.7 EBC to 10 SRM (COLOR)", () => {
    expect(to_canonical(19.7, "COLOR", "EBC")).toBeCloseTo(10, 1);
  });

  it("converts 14.504 PSI to approximately 100 kPa (PRESSURE)", () => {
    expect(to_canonical(14.504, "PRESSURE", "PSI")).toBeCloseTo(100, 0);
  });

  it("converts 1 gal_per_hr to approximately 3.785 L_per_hr (EVAP_RATE)", () => {
    expect(to_canonical(1, "EVAP_RATE", "gal_per_hr")).toBeCloseTo(3.785, 2);
  });

  it("converting from the canonical unit itself is always an identity", () => {
    expect(to_canonical(5, "GRAIN_WEIGHT", "kg")).toBeCloseTo(5, 6);
    expect(to_canonical(20, "TEMPERATURE", "C")).toBeCloseTo(20, 6);
    expect(to_canonical(1.05, "GRAVITY", "SG")).toBeCloseTo(1.05, 6);
    expect(to_canonical(10, "COLOR", "SRM")).toBeCloseTo(10, 6);
    expect(to_canonical(100, "PRESSURE", "kPa")).toBeCloseTo(100, 6);
    expect(to_canonical(4, "EVAP_RATE", "L_per_hr")).toBeCloseTo(4, 6);
  });
});

// ---------------------------------------------------------------------------
// from_canonical / to_canonical round-trips
// ---------------------------------------------------------------------------

describe("from_canonical / to_canonical round-trips", () => {
  it("BATCH_VOLUME: from then back to canonical", () => {
    const liters = 23;
    expect(to_canonical(from_canonical(liters, "BATCH_VOLUME", "gal"), "BATCH_VOLUME", "gal")).toBeCloseTo(liters, 6);
  });

  it("GRAIN_WEIGHT: from then back to canonical", () => {
    const kg = 4.536;
    expect(to_canonical(from_canonical(kg, "GRAIN_WEIGHT", "lb_oz"), "GRAIN_WEIGHT", "lb_oz")).toBeCloseTo(kg, 6);
  });

  it("HOP_WEIGHT: from g then back to canonical", () => {
    const kg = 0.028;
    expect(to_canonical(from_canonical(kg, "HOP_WEIGHT", "g"), "HOP_WEIGHT", "g")).toBeCloseTo(kg, 6);
  });

  it("TEMPERATURE: from F then back to canonical", () => {
    const c = 68;
    expect(to_canonical(from_canonical(c, "TEMPERATURE", "F"), "TEMPERATURE", "F")).toBeCloseTo(c, 6);
  });

  it("GRAVITY: from Plato then back to canonical", () => {
    const sg = 1.06;
    expect(to_canonical(from_canonical(sg, "GRAVITY", "Plato"), "GRAVITY", "Plato")).toBeCloseTo(sg, 3);
  });

  it("COLOR: from EBC then back to canonical", () => {
    const srm = 15;
    expect(to_canonical(from_canonical(srm, "COLOR", "EBC"), "COLOR", "EBC")).toBeCloseTo(srm, 4);
  });

  it("PRESSURE: from PSI then back to canonical", () => {
    const kpa = 207;
    expect(to_canonical(from_canonical(kpa, "PRESSURE", "PSI"), "PRESSURE", "PSI")).toBeCloseTo(kpa, 4);
  });

  it("EVAP_RATE: from gal_per_hr then back to canonical", () => {
    const lph = 4;
    expect(to_canonical(from_canonical(lph, "EVAP_RATE", "gal_per_hr"), "EVAP_RATE", "gal_per_hr")).toBeCloseTo(lph, 6);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("converts 0 for all weight categories without producing NaN", () => {
    expect(convert_units(0, "GRAIN_WEIGHT", "kg", "lb_oz")).toBe(0);
    expect(convert_units(0, "HOP_WEIGHT", "kg", "g")).toBe(0);
    expect(convert_units(0, "MISC_WEIGHT", "kg", "oz")).toBe(0);
  });

  it("converts negative temperature without error", () => {
    expect(convert_units(-10, "TEMPERATURE", "C", "F")).toBeCloseTo(14, 1);
  });

  it("converts negative pressure without error", () => {
    // Negative pressures (vacuum) are physically valid
    const result = convert_units(-10, "PRESSURE", "kPa", "PSI");
    expect(result).toBeCloseTo(-10 * 0.145038, 4);
  });

  it("does not produce NaN for SG 1.000 → Plato conversion", () => {
    expect(sg_to_plato(1.0)).not.toBeNaN();
  });

  it("does not produce NaN for 0 Plato → SG conversion", () => {
    expect(plato_to_sg(0)).not.toBeNaN();
  });

  it("identity: same unit in and out always returns exact input (no floating-point drift)", () => {
    expect(convert_units(42, "BATCH_VOLUME", "L", "L")).toBe(42);
    expect(convert_units(42, "GRAIN_WEIGHT", "kg", "kg")).toBe(42);
    expect(convert_units(42, "HOP_WEIGHT", "g", "g")).toBe(42);
    expect(convert_units(42, "MISC_WEIGHT", "oz", "oz")).toBe(42);
    expect(convert_units(42, "TEMPERATURE", "C", "C")).toBe(42);
    expect(convert_units(42, "GRAVITY", "SG", "SG")).toBe(42);
    expect(convert_units(42, "COLOR", "SRM", "SRM")).toBe(42);
    expect(convert_units(42, "PRESSURE", "kPa", "kPa")).toBe(42);
    expect(convert_units(42, "EVAP_RATE", "L_per_hr", "L_per_hr")).toBe(42);
  });
});
