import type { HopEntry } from "@trub/types";
import { KG_TO_LB, L_TO_GAL } from "./constants";

const G_PER_KG = 1000;
const OZ_PER_LB = 16;
const KG_TO_OZ = KG_TO_LB * OZ_PER_LB;

// Hop uses that contribute bitterness (boiled or steeped at near-boil temps).
// Dry hops and whirlpool/aroma additions at low temps contribute negligible IBU.
const BITTERING_USES = new Set(["boil", "first_wort", "mash"]);

// First wort hops are conventionally estimated at +10% utilization vs. a
// 20-minute addition.  We approximate by treating them as a full-length boil
// addition with a 10% utilization bonus, which is how most brewing software
// handles it (see: Beersmith, Brewer's Friend).
const FIRST_WORT_UTIL_BONUS = 0.1;

// ---------------------------------------------------------------------------
// Tinseth (default)
// ---------------------------------------------------------------------------

function tinseth_utilization(og: number, time_min: number): number {
  const bigness = 1.65 * Math.pow(0.000125, og - 1);
  const boil_factor = (1 - Math.exp(-0.04 * time_min)) / 4.15;
  return bigness * boil_factor;
}

function tinseth_ibu_single(
  alpha_pct: number,
  amount_kg: number,
  og: number,
  batch_l: number,
  time_min: number,
  use: string,
): number {
  if (!BITTERING_USES.has(use) || time_min <= 0 || batch_l <= 0) {
    return 0;
  }

  const amount_g = amount_kg * G_PER_KG;
  let util = tinseth_utilization(og, time_min);

  if (use === "first_wort") {
    util *= 1 + FIRST_WORT_UTIL_BONUS;
  }

  return (alpha_pct / 100) * amount_g * util * 1000 / batch_l;
}

export function calculate_ibu_tinseth(
  hops: Pick<HopEntry, "alpha_acid_pct" | "amount_kg" | "time_minutes" | "use">[],
  og: number,
  batch_size_l: number,
): number {
  return hops.reduce(
    (sum, h) =>
      sum +
      tinseth_ibu_single(
        h.alpha_acid_pct,
        h.amount_kg,
        og,
        batch_size_l,
        h.time_minutes,
        h.use,
      ),
    0,
  );
}

// ---------------------------------------------------------------------------
// Rager
// ---------------------------------------------------------------------------

function rager_gravity_adjustment(og: number): number {
  if (og <= 1.05) {
    return 0;
  }
  return (og - 1.05) / 0.2;
}

function rager_utilization(time_min: number): number {
  // Rager utilization table approximated by a polynomial fit.
  // This matches the widely-published Rager utilization curve.
  if (time_min <= 0) {
    return 0;
  }
  if (time_min <= 10) {
    return 6;
  }
  if (time_min <= 15) {
    return 8;
  }
  if (time_min <= 20) {
    return 10.1;
  }
  if (time_min <= 25) {
    return 12.1;
  }
  if (time_min <= 30) {
    return 15.3;
  }
  if (time_min <= 35) {
    return 18.8;
  }
  if (time_min <= 40) {
    return 22.8;
  }
  if (time_min <= 45) {
    return 26.9;
  }
  if (time_min <= 50) {
    return 28.1;
  }
  if (time_min <= 60) {
    return 30;
  }
  if (time_min <= 70) {
    return 30;
  }
  if (time_min <= 80) {
    return 30;
  }
  // 90+ minutes
  return 30;
}

function rager_ibu_single(
  alpha_pct: number,
  amount_kg: number,
  og: number,
  batch_l: number,
  time_min: number,
  use: string,
): number {
  if (!BITTERING_USES.has(use) || time_min <= 0 || batch_l <= 0) {
    return 0;
  }

  const amount_oz = amount_kg * KG_TO_OZ;
  const batch_gal = batch_l * L_TO_GAL;
  let util = rager_utilization(time_min);

  if (use === "first_wort") {
    util *= 1 + FIRST_WORT_UTIL_BONUS;
  }

  const ga = rager_gravity_adjustment(og);
  return (amount_oz * (util / 100) * (alpha_pct / 100) * 7489) / (batch_gal * (1 + ga));
}

export function calculate_ibu_rager(
  hops: Pick<HopEntry, "alpha_acid_pct" | "amount_kg" | "time_minutes" | "use">[],
  og: number,
  batch_size_l: number,
): number {
  return hops.reduce(
    (sum, h) =>
      sum +
      rager_ibu_single(
        h.alpha_acid_pct,
        h.amount_kg,
        og,
        batch_size_l,
        h.time_minutes,
        h.use,
      ),
    0,
  );
}

// ---------------------------------------------------------------------------
// mIBU (Hosom)
// ---------------------------------------------------------------------------
// mIBU accounts for post-boil cooling by integrating utilization over the
// temperature decay curve. For simplicity we use the standard approximation:
// mIBU = Tinseth IBU + post-boil contribution.
//
// The post-boil contribution uses a simplified immersion-chiller model where
// wort cools linearly from boiling (100°C) to pitching (20°C) over a
// configurable time. During cooling, isomerization continues at a reduced
// rate. This is modeled by adding extra "equivalent boil minutes" to the
// Tinseth time — typically ~5 minutes for a 20-minute chill.
//
// For v1, we use a fixed +5 minute equivalent addition, which is the
// standard mIBU approximation used by most brewing software.

const MIBU_EXTRA_MINUTES = 5;

export function calculate_ibu_mibu(
  hops: Pick<HopEntry, "alpha_acid_pct" | "amount_kg" | "time_minutes" | "use">[],
  og: number,
  batch_size_l: number,
): number {
  return hops.reduce(
    (sum, h) =>
      sum +
      tinseth_ibu_single(
        h.alpha_acid_pct,
        h.amount_kg,
        og,
        batch_size_l,
        BITTERING_USES.has(h.use) ? h.time_minutes + MIBU_EXTRA_MINUTES : h.time_minutes,
        h.use,
      ),
    0,
  );
}
