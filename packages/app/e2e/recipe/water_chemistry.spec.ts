import { test, expect, type BrowserContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// DB isolation helpers — identical pattern used across all Trub E2E specs.
// ---------------------------------------------------------------------------

async function clear_indexed_db(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const original_open = indexedDB.open.bind(indexedDB);
    // @ts-ignore — patching the global for test isolation only
    indexedDB.open = (name: string, version?: number) => {
      const request = original_open(name, version);
      request.addEventListener("upgradeneeded", () => {
        // Let the app create its own schema fresh.
      });
      return request;
    };
  });

  await context.clearCookies();
}

async function purge_indexed_db_on_page(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(async () => {
    if (!("databases" in indexedDB)) {
      return;
    }
    const dbs = await indexedDB.databases();
    await Promise.all(
      dbs.map(
        (db) =>
          new Promise<void>((resolve, reject) => {
            if (!db.name) {
              resolve();
              return;
            }
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            req.onblocked = () => resolve();
          }),
      ),
    );
  });
}

// ---------------------------------------------------------------------------
// Shared setup: navigate to the recipe list, purge DB, reload, and open a
// new recipe editor. Returns once the editor is confirmed visible.
// ---------------------------------------------------------------------------

async function open_new_recipe(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/#/recipes");
  await purge_indexed_db_on_page(page);
  await page.reload();

  await expect(page.getByTestId("recipes-list")).toBeVisible();
  await page.getByTestId("new-recipe-button").click();
  await expect(page.getByTestId("recipe-editor")).toBeVisible();
}

// ---------------------------------------------------------------------------
// Helper: read the numeric text content of a mineral cell and parse it.
// The mineral cells contain the rounded integer ppm value.
// ---------------------------------------------------------------------------

async function get_mineral_ppm(
  page: import("@playwright/test").Page,
  testid: string,
): Promise<number> {
  const text = await page.getByTestId(testid).textContent();
  // The cell contains symbol + value + "ppm" — extract all digits/numbers.
  const match = (text ?? "").match(/[\d]+/);
  return match ? parseInt(match[0], 10) : 0;
}

// ---------------------------------------------------------------------------
// Helper: read the ratio text from the sulfate:chloride ratio element.
// ---------------------------------------------------------------------------

async function get_ratio_text(
  page: import("@playwright/test").Page,
): Promise<string> {
  return (await page.getByTestId("sulfate-chloride-ratio").textContent()) ?? "";
}

// ---------------------------------------------------------------------------
// Helper: read the mash pH value as a number.
// ---------------------------------------------------------------------------

async function get_mash_ph(
  page: import("@playwright/test").Page,
): Promise<number> {
  const text = await page.getByTestId("mash-ph-value").textContent();
  return parseFloat((text ?? "").trim());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Water Chemistry section", () => {
  test.beforeEach(async ({ context }) => {
    await clear_indexed_db(context);
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Initial state
  // -------------------------------------------------------------------------

  test("initial state — all minerals 0 ppm, ratio 0, pH 5.72, formula Bru'n Water", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // The water chemistry section must be visible.
    await expect(
      page.getByTestId("water-chemistry-section-row"),
    ).toBeVisible();
    await expect(page.getByTestId("water-chemistry-section")).toBeVisible();

    // All six salt inputs must be present and default to 0.
    for (const testid of [
      "salt-gypsum-input",
      "salt-calcium-chloride-input",
      "salt-epsom-input",
      "salt-baking-soda-input",
      "salt-chalk-input",
      "salt-table-salt-input",
      "acid-lactic-input",
      "acid-phosphoric-input",
      "acid-acidulated-malt-input",
    ]) {
      await expect(page.getByTestId(testid)).toBeVisible();
      await expect(page.getByTestId(testid)).toHaveValue("0");
    }

    // All six mineral displays must read 0 ppm.
    for (const testid of [
      "mineral-calcium",
      "mineral-magnesium",
      "mineral-sodium",
      "mineral-sulfate",
      "mineral-chloride",
      "mineral-bicarbonate",
    ]) {
      await expect(page.getByTestId(testid)).toBeVisible();
      await expect(page.getByTestId(testid)).toContainText("0");
    }

    // SO₄:Cl ratio must show "0.0" — both minerals are 0 so the ratio is 0.
    await expect(page.getByTestId("sulfate-chloride-ratio")).toHaveText("0.0");

    // Descriptor for ratio 0 is "very malty/sweet".
    await expect(page.getByTestId("sulfate-chloride-descriptor")).toContainText(
      "very malty/sweet",
    );

    // Mash pH must be 5.72 (base malt DI pH, no fermentables).
    await expect(page.getByTestId("mash-ph-value")).toHaveText("5.72");

    // Formula label must read "Bru'n Water".
    await expect(page.getByTestId("mash-ph-formula-label")).toHaveText(
      "Bru'n Water",
    );
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Gypsum raises Ca and SO₄; ratio shifts to hoppy
  // -------------------------------------------------------------------------

  test("gypsum addition — Ca and SO4 increase, ratio becomes very hoppy/bitter", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // Add 5 g gypsum (CaSO₄). With 18.93 L batch size:
    //   Ca  = 232.8 * (5/18.93) = 61.5  → rounds to 61
    //   SO₄ = 558.0 * (5/18.93) = 147.4 → rounds to 147
    //   Cl  = 0 → ratio = Infinity → formatted as "∞"
    await page.getByTestId("salt-gypsum-input").fill("5");

    // Ca must be > 0.
    await expect(async () => {
      const ca = await get_mineral_ppm(page, "mineral-calcium");
      if (ca <= 0) {
        throw new Error(`Ca expected > 0 after gypsum, got ${ca}`);
      }
    }).toPass({ timeout: 5000 });

    // SO₄ must be > 0.
    await expect(async () => {
      const so4 = await get_mineral_ppm(page, "mineral-sulfate");
      if (so4 <= 0) {
        throw new Error(`SO4 expected > 0 after gypsum, got ${so4}`);
      }
    }).toPass({ timeout: 5000 });

    // Minerals that gypsum does NOT contribute must remain 0.
    const mg = await get_mineral_ppm(page, "mineral-magnesium");
    const na = await get_mineral_ppm(page, "mineral-sodium");
    const cl = await get_mineral_ppm(page, "mineral-chloride");
    const hco3 = await get_mineral_ppm(page, "mineral-bicarbonate");
    expect(mg).toBe(0);
    expect(na).toBe(0);
    expect(cl).toBe(0);
    expect(hco3).toBe(0);

    // With Cl = 0 and SO₄ > 0, the ratio is Infinity → rendered as "∞".
    const ratio_text = await get_ratio_text(page);
    expect(ratio_text.trim()).toBe("\u221E");

    // Descriptor must indicate hoppy character.
    await expect(page.getByTestId("sulfate-chloride-descriptor")).toContainText(
      "very hoppy/bitter",
    );

    // Verify numeric Ca and SO₄ are close to the expected rounded values.
    const ca_final = await get_mineral_ppm(page, "mineral-calcium");
    const so4_final = await get_mineral_ppm(page, "mineral-sulfate");
    // Ca: 232.8 * 5/18.93 ≈ 61.5 → Math.round = 61
    expect(ca_final).toBe(61);
    // SO₄: 558.0 * 5/18.93 ≈ 147.4 → Math.round = 147
    expect(so4_final).toBe(147);
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Calcium chloride raises Ca and Cl; ratio shifts malty
  // -------------------------------------------------------------------------

  test("calcium chloride addition — Cl increases, ratio becomes malty", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // Add 5 g CaCl₂. With 18.93 L:
    //   Ca = 272.6 * (5/18.93) = 72.0 → 72
    //   Cl = 482.3 * (5/18.93) = 127.4 → 127
    //   SO₄ = 0 → ratio = 0 → "very malty/sweet"
    await page.getByTestId("salt-calcium-chloride-input").fill("5");

    await expect(async () => {
      const cl = await get_mineral_ppm(page, "mineral-chloride");
      if (cl <= 0) {
        throw new Error(`Cl expected > 0 after CaCl2, got ${cl}`);
      }
    }).toPass({ timeout: 5000 });

    const ca = await get_mineral_ppm(page, "mineral-calcium");
    const cl = await get_mineral_ppm(page, "mineral-chloride");
    const so4 = await get_mineral_ppm(page, "mineral-sulfate");

    // Ca: Math.round(272.6 * 5/18.93) = Math.round(72.0) = 72
    expect(ca).toBe(72);
    // Cl: Math.round(482.3 * 5/18.93) = Math.round(127.4) = 127
    expect(cl).toBe(127);
    // SO₄ must remain 0 — CaCl₂ adds no sulfate.
    expect(so4).toBe(0);

    // Ratio: 0/121 = 0 → "0.0" → descriptor "very malty/sweet".
    const ratio_text = await get_ratio_text(page);
    expect(ratio_text.trim()).toBe("0.0");

    await expect(page.getByTestId("sulfate-chloride-descriptor")).toContainText(
      "very malty/sweet",
    );
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Baking soda raises Na and HCO₃; mash pH rises
  // -------------------------------------------------------------------------

  test("baking soda addition — Na and HCO3 increase, mash pH rises with fermentables", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // Add a pale malt fermentable so the pH model is active. Without any
    // fermentables, calculate_mash_ph_brun_water returns BASE_MALT_DI_PH
    // regardless of water chemistry, so the baking soda effect would be
    // invisible. With fermentables present the residual alkalinity from
    // NaHCO₃ raises the estimated mash pH above the grain-only baseline.
    await page.getByTestId("fermentables-add-button").click();
    await expect(page.getByTestId("fermentable-row-0")).toBeVisible();
    await page.getByTestId("fermentable-amount-input-0").fill("5");
    await page.getByTestId("fermentable-ppg-input-0").fill("37");
    // color_lovibond defaults to 0 or whatever the component sets; leave as-is.

    // Capture the baseline mash pH with no water additions.
    const ph_baseline = await get_mash_ph(page);

    // Add 5 g baking soda (NaHCO₃). With 18.93 L:
    //   Na   = 274.0 * (5/18.93) = 72.4  → 72
    //   HCO₃ = 726.0 * (5/18.93) = 191.8 → 192
    await page.getByTestId("salt-baking-soda-input").fill("5");

    // Na and HCO₃ must increase from 0.
    await expect(async () => {
      const na = await get_mineral_ppm(page, "mineral-sodium");
      const hco3 = await get_mineral_ppm(page, "mineral-bicarbonate");
      if (na <= 0 || hco3 <= 0) {
        throw new Error(
          `Na (${na}) and HCO3 (${hco3}) must both be > 0 after baking soda`,
        );
      }
    }).toPass({ timeout: 5000 });

    const na = await get_mineral_ppm(page, "mineral-sodium");
    const hco3 = await get_mineral_ppm(page, "mineral-bicarbonate");

    // Na: Math.round(274.0 * 5/18.93) = Math.round(72.4) = 72
    expect(na).toBe(72);
    // HCO₃: Math.round(726.0 * 5/18.93) = Math.round(191.8) = 192
    expect(hco3).toBe(192);

    // Minerals unaffected by NaHCO₃ must remain 0.
    const ca = await get_mineral_ppm(page, "mineral-calcium");
    const mg = await get_mineral_ppm(page, "mineral-magnesium");
    const so4 = await get_mineral_ppm(page, "mineral-sulfate");
    const cl = await get_mineral_ppm(page, "mineral-chloride");
    expect(ca).toBe(0);
    expect(mg).toBe(0);
    expect(so4).toBe(0);
    expect(cl).toBe(0);

    // Mash pH must have risen above the no-salt baseline (bicarbonate raises
    // residual alkalinity which raises predicted mash pH).
    await expect(async () => {
      const ph_after = await get_mash_ph(page);
      if (ph_after <= ph_baseline) {
        throw new Error(
          `Mash pH did not rise after baking soda: baseline=${ph_baseline}, after=${ph_after}`,
        );
      }
    }).toPass({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Lactic acid lowers mash pH
  // -------------------------------------------------------------------------

  test("lactic acid addition — mash pH drops", async ({ page }) => {
    await open_new_recipe(page);

    // Fermentables required for the pH model to respond to acid additions.
    await page.getByTestId("fermentables-add-button").click();
    await expect(page.getByTestId("fermentable-row-0")).toBeVisible();
    await page.getByTestId("fermentable-amount-input-0").fill("5");
    await page.getByTestId("fermentable-ppg-input-0").fill("37");

    // Capture the baseline pH before any acid is added.
    const ph_before_acid = await get_mash_ph(page);

    // Add 2 mL of lactic acid (88%). The acid contribution is:
    //   total_meq = 2 * 11.46 = 22.92
    //   shift = -(22.92 / 18.93) * 0.05 = -0.0606 pH units
    // The pH must drop measurably below the pre-acid baseline.
    await page.getByTestId("acid-lactic-input").fill("2");

    await expect(async () => {
      const ph_after_acid = await get_mash_ph(page);
      if (ph_after_acid >= ph_before_acid) {
        throw new Error(
          `Mash pH did not drop after lactic acid: before=${ph_before_acid}, after=${ph_after_acid}`,
        );
      }
    }).toPass({ timeout: 5000 });

    // Salt minerals must all remain 0 (lactic acid adds no minerals).
    for (const testid of [
      "mineral-calcium",
      "mineral-magnesium",
      "mineral-sodium",
      "mineral-sulfate",
      "mineral-chloride",
      "mineral-bicarbonate",
    ]) {
      const ppm = await get_mineral_ppm(page, testid);
      expect(ppm).toBe(0);
    }
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Multiple salts — minerals sum correctly
  // -------------------------------------------------------------------------

  test("multiple salts — minerals accumulate from all salt additions", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // Add gypsum and calcium chloride simultaneously. Both contribute Ca;
    // gypsum also adds SO₄ and CaCl₂ also adds Cl.
    //
    // Gypsum 4 g (18.93 L):
    //   Ca  = 232.8 * (4/18.93) = 49.19
    //   SO₄ = 558.0 * (4/18.93) = 117.91
    //
    // Calcium chloride 3 g (18.93 L):
    //   Ca = 272.6 * (3/18.93) = 43.20
    //   Cl = 482.3 * (3/18.93) = 76.44
    //
    // Combined:
    //   Ca  = 49.19 + 43.20 = 92.39  → Math.round = 92
    //   SO₄ = 117.91            → Math.round = 118
    //   Cl  = 76.44             → Math.round = 76
    //   Mg, Na, HCO₃ = 0
    //
    // SC ratio = 117.91 / 76.44 ≈ 1.54 → descriptor "hoppy"

    await page.getByTestId("salt-gypsum-input").fill("4");
    await page.getByTestId("salt-calcium-chloride-input").fill("3");

    // Wait until Ca updates from 0.
    await expect(async () => {
      const ca = await get_mineral_ppm(page, "mineral-calcium");
      if (ca <= 0) {
        throw new Error(`Ca still 0 after adding gypsum + CaCl2`);
      }
    }).toPass({ timeout: 5000 });

    const ca = await get_mineral_ppm(page, "mineral-calcium");
    const so4 = await get_mineral_ppm(page, "mineral-sulfate");
    const cl = await get_mineral_ppm(page, "mineral-chloride");
    const mg = await get_mineral_ppm(page, "mineral-magnesium");
    const na = await get_mineral_ppm(page, "mineral-sodium");
    const hco3 = await get_mineral_ppm(page, "mineral-bicarbonate");

    // Combined Ca: Math.round(92.39) = 92
    expect(ca).toBe(92);
    // SO₄ from gypsum only: Math.round(117.91) = 118
    expect(so4).toBe(118);
    // Cl from CaCl₂ only: Math.round(76.44) = 76
    expect(cl).toBe(76);
    // Uncontributed minerals must be 0.
    expect(mg).toBe(0);
    expect(na).toBe(0);
    expect(hco3).toBe(0);

    // SO₄:Cl ratio ≈ 111.6 / 72.345 ≈ 1.54 → "hoppy".
    // We verify the descriptor rather than the exact ratio string so the test
    // is not sensitive to floating-point display rounding.
    await expect(page.getByTestId("sulfate-chloride-descriptor")).toContainText(
      "hoppy",
    );

    // Now add baking soda to verify it combines without disrupting the others.
    // Baking soda 2 g (18.93 L):
    //   Na   = 274.0 * (2/18.93) = 28.95  → 29
    //   HCO₃ = 726.0 * (2/18.93) = 76.70  → 77
    await page.getByTestId("salt-baking-soda-input").fill("2");

    await expect(async () => {
      const na_after = await get_mineral_ppm(page, "mineral-sodium");
      if (na_after <= 0) {
        throw new Error(`Na still 0 after adding baking soda`);
      }
    }).toPass({ timeout: 5000 });

    const na_after = await get_mineral_ppm(page, "mineral-sodium");
    const hco3_after = await get_mineral_ppm(page, "mineral-bicarbonate");

    // Na: Math.round(28.95) = 29
    expect(na_after).toBe(29);
    // HCO₃: Math.round(76.70) = 77
    expect(hco3_after).toBe(77);

    // Ca and SO₄ must be unchanged by baking soda.
    const ca_after = await get_mineral_ppm(page, "mineral-calcium");
    const so4_after = await get_mineral_ppm(page, "mineral-sulfate");
    expect(ca_after).toBe(92);
    expect(so4_after).toBe(118);
  });
});
