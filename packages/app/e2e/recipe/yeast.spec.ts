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
            req.onblocked = () => resolve(); // treat blocked as done enough
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
// Helper: add a pale malt fermentable so OG > 1.000 and stat calculations
// produce non-trivial FG / ABV values. Uses 5 kg at 37 PPG (same values
// used across the suite for consistency).
// ---------------------------------------------------------------------------

async function add_base_fermentable(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.getByTestId("fermentables-add-button").click();
  await expect(page.getByTestId("fermentable-row-0")).toBeVisible();
  await page.getByTestId("fermentable-amount-input-0").fill("5");
  await page.getByTestId("fermentable-ppg-input-0").fill("37");
  // Wait until OG has updated from the trivial default.
  await expect(page.getByTestId("stat-og-value")).not.toHaveText("1.000");
}

// ---------------------------------------------------------------------------
// Helper: read a stat value as a float.
// ---------------------------------------------------------------------------

async function get_stat(
  page: import("@playwright/test").Page,
  testid: string,
): Promise<number> {
  const text = await page.getByTestId(testid).textContent();
  // Strip any trailing "%" for ABV.
  return parseFloat((text ?? "0").replace("%", "").trim());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Yeast section", () => {
  test.beforeEach(async ({ context }) => {
    await clear_indexed_db(context);
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Initial state — section visible, empty, add button present
  // -------------------------------------------------------------------------

  test("initial state — section visible, empty, add button present", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // The section wrapper (accordion row) must be visible.
    await expect(page.getByTestId("yeast-section-row")).toBeVisible();

    // The inner section content must be visible.
    await expect(page.getByTestId("yeast-section")).toBeVisible();

    // The add button must be present.
    await expect(page.getByTestId("yeast-add-button")).toBeVisible();

    // No yeast rows should exist yet.
    await expect(page.getByTestId("yeast-row-0")).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Add yeast — row appears with correct default values
  // -------------------------------------------------------------------------

  test("add yeast — row appears with default field values", async ({
    page,
  }) => {
    await open_new_recipe(page);

    await page.getByTestId("yeast-add-button").click();

    // Row 0 must appear.
    await expect(page.getByTestId("yeast-row-0")).toBeVisible();

    // Default attenuation: 75.
    await expect(page.getByTestId("yeast-attenuation-input-0")).toHaveValue(
      "75",
    );

    // Default form: dry.
    await expect(page.getByTestId("yeast-form-select-0")).toHaveValue("dry");

    // Default flocculation: medium.
    await expect(page.getByTestId("yeast-flocculation-select-0")).toHaveValue(
      "medium",
    );

    // Default temp range.
    await expect(page.getByTestId("yeast-temp-min-input-0")).toHaveValue("15");
    await expect(page.getByTestId("yeast-temp-max-input-0")).toHaveValue("22");

    // Name and lab default to empty strings.
    await expect(page.getByTestId("yeast-name-input-0")).toHaveValue("");
    await expect(page.getByTestId("yeast-lab-input-0")).toHaveValue("");
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Edit yeast name and lab — input values update correctly
  // -------------------------------------------------------------------------

  test("edit name and lab — values are reflected in inputs", async ({
    page,
  }) => {
    await open_new_recipe(page);

    await page.getByTestId("yeast-add-button").click();
    await expect(page.getByTestId("yeast-row-0")).toBeVisible();

    // Set name.
    await page.getByTestId("yeast-name-input-0").fill("US-05");
    await expect(page.getByTestId("yeast-name-input-0")).toHaveValue("US-05");

    // Set lab.
    await page.getByTestId("yeast-lab-input-0").fill("Fermentis");
    await expect(page.getByTestId("yeast-lab-input-0")).toHaveValue(
      "Fermentis",
    );

    // Edit select fields.
    await page.getByTestId("yeast-form-select-0").selectOption("liquid");
    await expect(page.getByTestId("yeast-form-select-0")).toHaveValue("liquid");

    await page
      .getByTestId("yeast-flocculation-select-0")
      .selectOption("high");
    await expect(page.getByTestId("yeast-flocculation-select-0")).toHaveValue(
      "high",
    );

    // Edit temperature range.
    await page.getByTestId("yeast-temp-min-input-0").fill("18");
    await expect(page.getByTestId("yeast-temp-min-input-0")).toHaveValue("18");

    await page.getByTestId("yeast-temp-max-input-0").fill("24");
    await expect(page.getByTestId("yeast-temp-max-input-0")).toHaveValue("24");
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Attenuation change drives FG and ABV in stats dashboard
  //
  // With fermentables: add yeast at 75% attenuation, capture FG.
  // Increase attenuation to 80% — FG must decrease (more fermentation).
  // ABV must increase correspondingly.
  // -------------------------------------------------------------------------

  test("changing attenuation updates FG and ABV in stats dashboard", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // Fermentables must exist before attenuation has a visible effect.
    await add_base_fermentable(page);

    // Capture the OG so we can bound our FG expectations.
    const og = await get_stat(page, "stat-og-value");
    expect(og).toBeGreaterThan(1.0);

    // Add a yeast at 75% attenuation (default).
    await page.getByTestId("yeast-add-button").click();
    await expect(page.getByTestId("yeast-row-0")).toBeVisible();
    await expect(page.getByTestId("yeast-attenuation-input-0")).toHaveValue(
      "75",
    );

    // Wait for FG to stabilise at the 75% attenuation value.
    // FG_expected ≈ 1 + (og - 1) * (1 - 0.75)
    const fg_expected_75 = 1 + (og - 1) * (1 - 0.75);
    await expect(async () => {
      const fg = await get_stat(page, "stat-fg-value");
      if (Math.abs(fg - fg_expected_75) > 0.005) {
        throw new Error(
          `FG at 75% attenuation expected ~${fg_expected_75.toFixed(3)}, got ${fg.toFixed(3)}`,
        );
      }
    }).toPass({ timeout: 5000 });

    const fg_at_75 = await get_stat(page, "stat-fg-value");
    const abv_at_75 = await get_stat(page, "stat-abv-value");

    // Raise attenuation to 80% — yeast ferments more sugar, FG goes down.
    await page.getByTestId("yeast-attenuation-input-0").click({ clickCount: 3 });
    await page.getByTestId("yeast-attenuation-input-0").fill("80");

    // FG must decrease (more attenuation → lower residual gravity).
    await expect(async () => {
      const fg_after = await get_stat(page, "stat-fg-value");
      if (fg_after >= fg_at_75) {
        throw new Error(
          `FG did not decrease after raising attenuation to 80%: before=${fg_at_75}, after=${fg_after}`,
        );
      }
    }).toPass({ timeout: 5000 });

    // ABV must increase (more fermentation = more alcohol).
    await expect(async () => {
      const abv_after = await get_stat(page, "stat-abv-value");
      if (abv_after <= abv_at_75) {
        throw new Error(
          `ABV did not increase after raising attenuation to 80%: before=${abv_at_75}, after=${abv_after}`,
        );
      }
    }).toPass({ timeout: 5000 });

    // Verify the numeric FG is close to the 80% expected value.
    const fg_expected_80 = 1 + (og - 1) * (1 - 0.8);
    await expect(async () => {
      const fg_80 = await get_stat(page, "stat-fg-value");
      if (Math.abs(fg_80 - fg_expected_80) > 0.005) {
        throw new Error(
          `FG at 80% attenuation expected ~${fg_expected_80.toFixed(3)}, got ${fg_80.toFixed(3)}`,
        );
      }
    }).toPass({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Remove yeast — row disappears, stats revert to default 75%
  //
  // When the last yeast entry is removed, the dashboard should fall back to
  // the default 75% attenuation for FG/ABV calculation, which is the same
  // value that is used before any yeast is added.
  // -------------------------------------------------------------------------

  test("remove yeast — row disappears, stats revert to default attenuation", async ({
    page,
  }) => {
    await open_new_recipe(page);

    await add_base_fermentable(page);

    // Capture the FG before adding any yeast — this is the default-75% baseline.
    const fg_no_yeast = await get_stat(page, "stat-fg-value");
    const abv_no_yeast = await get_stat(page, "stat-abv-value");

    // Add a yeast at 90% attenuation — noticeably different from the 75% default.
    await page.getByTestId("yeast-add-button").click();
    await expect(page.getByTestId("yeast-row-0")).toBeVisible();

    await page.getByTestId("yeast-attenuation-input-0").click({ clickCount: 3 });
    await page.getByTestId("yeast-attenuation-input-0").fill("90");

    // FG must drop (90% > 75%), ABV must rise.
    await expect(async () => {
      const fg_90 = await get_stat(page, "stat-fg-value");
      if (fg_90 >= fg_no_yeast) {
        throw new Error(
          `FG at 90% attenuation should be below default: default=${fg_no_yeast}, got=${fg_90}`,
        );
      }
    }).toPass({ timeout: 5000 });

    const fg_at_90 = await get_stat(page, "stat-fg-value");

    // Now remove the yeast row.
    await page.getByTestId("yeast-remove-button-0").click();

    // The row must be gone.
    await expect(page.getByTestId("yeast-row-0")).not.toBeVisible();

    // FG and ABV should revert to the pre-yeast (default 75%) values.
    await expect(async () => {
      const fg_after_remove = await get_stat(page, "stat-fg-value");
      if (fg_after_remove <= fg_at_90) {
        throw new Error(
          `FG did not revert after removing yeast: at_90=${fg_at_90}, after_remove=${fg_after_remove}`,
        );
      }
      // Must also be close to the original no-yeast baseline.
      if (Math.abs(fg_after_remove - fg_no_yeast) > 0.005) {
        throw new Error(
          `FG after yeast removal (${fg_after_remove}) does not match pre-yeast baseline (${fg_no_yeast})`,
        );
      }
    }).toPass({ timeout: 5000 });

    await expect(async () => {
      const abv_after_remove = await get_stat(page, "stat-abv-value");
      if (Math.abs(abv_after_remove - abv_no_yeast) > 0.1) {
        throw new Error(
          `ABV after yeast removal (${abv_after_remove}) does not match pre-yeast baseline (${abv_no_yeast})`,
        );
      }
    }).toPass({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Multiple yeast entries — both rows visible, average attenuation
  //
  // Add two yeast strains with different attenuation values. The stats
  // dashboard should use their average, producing an FG between the two
  // individual values.
  // -------------------------------------------------------------------------

  test("multiple yeast entries — both rows visible, average attenuation drives stats", async ({
    page,
  }) => {
    await open_new_recipe(page);

    await add_base_fermentable(page);

    const og = await get_stat(page, "stat-og-value");
    expect(og).toBeGreaterThan(1.0);

    // Add yeast 0 at 70% attenuation.
    await page.getByTestId("yeast-add-button").click();
    await expect(page.getByTestId("yeast-row-0")).toBeVisible();

    await page.getByTestId("yeast-attenuation-input-0").click({ clickCount: 3 });
    await page.getByTestId("yeast-attenuation-input-0").fill("70");

    // Wait for stats to settle at 70%.
    const fg_expected_70 = 1 + (og - 1) * (1 - 0.7);
    await expect(async () => {
      const fg = await get_stat(page, "stat-fg-value");
      if (Math.abs(fg - fg_expected_70) > 0.005) {
        throw new Error(
          `FG at single yeast 70%: expected ~${fg_expected_70.toFixed(3)}, got ${fg.toFixed(3)}`,
        );
      }
    }).toPass({ timeout: 5000 });

    const fg_single_70 = await get_stat(page, "stat-fg-value");

    // Add yeast 1 at 90% attenuation.
    await page.getByTestId("yeast-add-button").click();
    await expect(page.getByTestId("yeast-row-1")).toBeVisible();

    await page.getByTestId("yeast-attenuation-input-1").click({ clickCount: 3 });
    await page.getByTestId("yeast-attenuation-input-1").fill("90");

    // Both rows must remain visible.
    await expect(page.getByTestId("yeast-row-0")).toBeVisible();
    await expect(page.getByTestId("yeast-row-1")).toBeVisible();

    // Average attenuation = (70 + 90) / 2 = 80%.
    // FG_expected_avg = 1 + (og - 1) * (1 - 0.80)
    const fg_expected_avg = 1 + (og - 1) * (1 - 0.8);

    await expect(async () => {
      const fg_avg = await get_stat(page, "stat-fg-value");
      if (Math.abs(fg_avg - fg_expected_avg) > 0.005) {
        throw new Error(
          `FG with averaged attenuation (70+90)/2=80%: expected ~${fg_expected_avg.toFixed(3)}, got ${fg_avg.toFixed(3)}`,
        );
      }
    }).toPass({ timeout: 5000 });

    // The averaged FG must sit between the two single-yeast extremes.
    // FG at 70% is higher than FG at 80%, and FG at 90% is lower.
    const fg_expected_90 = 1 + (og - 1) * (1 - 0.9);

    await expect(async () => {
      const fg_avg = await get_stat(page, "stat-fg-value");
      const within_bounds =
        fg_avg < fg_single_70 && fg_avg > fg_expected_90;
      if (!within_bounds) {
        throw new Error(
          `Averaged FG (${fg_avg}) not between single-70% FG (${fg_single_70}) and 90% FG (~${fg_expected_90.toFixed(3)})`,
        );
      }
    }).toPass({ timeout: 5000 });

    // Each row must still show its own attenuation value independently.
    await expect(page.getByTestId("yeast-attenuation-input-0")).toHaveValue(
      "70",
    );
    await expect(page.getByTestId("yeast-attenuation-input-1")).toHaveValue(
      "90",
    );
  });
});
