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
// Shared navigation helper — navigate to settings with a clean DB.
// ---------------------------------------------------------------------------

async function open_settings(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/#/settings");
  await purge_indexed_db_on_page(page);
  await page.reload();
  await page.waitForURL("**/#/settings");
  await expect(page.getByTestId("settings-page")).toBeVisible();
}

// ---------------------------------------------------------------------------
// US-centric default values matched to what the app seeds on first launch.
// ---------------------------------------------------------------------------

const UNIT_DEFAULTS: Record<string, string> = {
  BATCH_VOLUME: "gal",
  SMALL_VOLUME: "fl_oz",
  GRAIN_WEIGHT: "lb_oz",
  HOP_WEIGHT: "oz",
  MISC_WEIGHT: "oz",
  TEMPERATURE: "F",
  GRAVITY: "SG",
  COLOR: "SRM",
  PRESSURE: "PSI",
  EVAP_RATE: "gal_per_hr",
};

const FORMULA_DEFAULTS: Record<string, string> = {
  ibu: "tinseth",
  color: "morey",
  abv: "simple",
  mash_ph: "brun_water",
};

const THEME_DEFAULT = "dark";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Settings page", () => {
  test.beforeEach(async ({ context }) => {
    await clear_indexed_db(context);
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Initial state — all selects show US-centric defaults.
  // -------------------------------------------------------------------------

  test("initial state — all unit, formula, and theme selects show US defaults", async ({
    page,
  }) => {
    await open_settings(page);

    // Display units section.
    for (const [category, expected] of Object.entries(UNIT_DEFAULTS)) {
      await expect(page.getByTestId(`unit-select-${category}`)).toHaveValue(
        expected,
      );
    }

    // Default formulas section.
    for (const [formula, expected] of Object.entries(FORMULA_DEFAULTS)) {
      await expect(page.getByTestId(`formula-select-${formula}`)).toHaveValue(
        expected,
      );
    }

    // Appearance section.
    await expect(page.getByTestId("theme-select")).toHaveValue(THEME_DEFAULT);
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Change unit preferences — verify they persist across reload.
  // -------------------------------------------------------------------------

  test("change unit preferences — BATCH_VOLUME, TEMPERATURE, and GRAVITY persist after reload", async ({
    page,
  }) => {
    await open_settings(page);

    // Change three unit selects.
    await page.getByTestId("unit-select-BATCH_VOLUME").selectOption("L");
    await page.getByTestId("unit-select-TEMPERATURE").selectOption("C");
    await page.getByTestId("unit-select-GRAVITY").selectOption("Plato");

    // Immediate reflection.
    await expect(page.getByTestId("unit-select-BATCH_VOLUME")).toHaveValue("L");
    await expect(page.getByTestId("unit-select-TEMPERATURE")).toHaveValue("C");
    await expect(page.getByTestId("unit-select-GRAVITY")).toHaveValue("Plato");

    // Reload and verify the values survived the round-trip through IndexedDB.
    await page.reload();
    await page.waitForURL("**/#/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible();

    await expect(page.getByTestId("unit-select-BATCH_VOLUME")).toHaveValue("L");
    await expect(page.getByTestId("unit-select-TEMPERATURE")).toHaveValue("C");
    await expect(page.getByTestId("unit-select-GRAVITY")).toHaveValue("Plato");

    // Unchanged units must remain at their defaults.
    await expect(page.getByTestId("unit-select-GRAIN_WEIGHT")).toHaveValue(
      "lb_oz",
    );
    await expect(page.getByTestId("unit-select-HOP_WEIGHT")).toHaveValue("oz");
    await expect(page.getByTestId("unit-select-COLOR")).toHaveValue("SRM");
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Change formula defaults — verify they persist across reload.
  // -------------------------------------------------------------------------

  test("change formula defaults — IBU and Color formulas persist after reload", async ({
    page,
  }) => {
    await open_settings(page);

    // Change IBU formula from tinseth to rager.
    await page.getByTestId("formula-select-ibu").selectOption("rager");
    await expect(page.getByTestId("formula-select-ibu")).toHaveValue("rager");

    // Change Color formula from morey to daniels.
    await page.getByTestId("formula-select-color").selectOption("daniels");
    await expect(page.getByTestId("formula-select-color")).toHaveValue(
      "daniels",
    );

    // Reload and verify persistence.
    await page.reload();
    await page.waitForURL("**/#/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible();

    await expect(page.getByTestId("formula-select-ibu")).toHaveValue("rager");
    await expect(page.getByTestId("formula-select-color")).toHaveValue(
      "daniels",
    );

    // Unchanged formulas remain at defaults.
    await expect(page.getByTestId("formula-select-abv")).toHaveValue("simple");
    await expect(page.getByTestId("formula-select-mash_ph")).toHaveValue(
      "brun_water",
    );
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Theme toggle — html[data-theme] updates immediately, persists.
  // -------------------------------------------------------------------------

  test("theme toggle — switching to light updates data-theme attribute and persists after reload", async ({
    page,
  }) => {
    await open_settings(page);

    // Confirm starting theme attribute.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Switch to light.
    await page.getByTestId("theme-select").selectOption("light");
    await expect(page.getByTestId("theme-select")).toHaveValue("light");

    // The html element's data-theme attribute must update synchronously.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // Reload and verify both the select value and the attribute persisted.
    await page.reload();
    await page.waitForURL("**/#/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible();

    await expect(page.getByTestId("theme-select")).toHaveValue("light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Reset to defaults — all selects return to US-centric values.
  // -------------------------------------------------------------------------

  test("reset to defaults — all selects revert after clicking reset button", async ({
    page,
  }) => {
    await open_settings(page);

    // Make a variety of changes across all three sections.
    await page.getByTestId("unit-select-BATCH_VOLUME").selectOption("L");
    await page.getByTestId("unit-select-GRAIN_WEIGHT").selectOption("kg");
    await page.getByTestId("unit-select-HOP_WEIGHT").selectOption("g");
    await page.getByTestId("unit-select-TEMPERATURE").selectOption("C");
    await page.getByTestId("unit-select-GRAVITY").selectOption("Plato");
    await page.getByTestId("unit-select-COLOR").selectOption("EBC");
    await page.getByTestId("formula-select-ibu").selectOption("rager");
    await page.getByTestId("formula-select-color").selectOption("daniels");
    await page.getByTestId("formula-select-abv").selectOption("alternate");
    await page.getByTestId("theme-select").selectOption("light");

    // Sanity-check: at least one value is non-default.
    await expect(page.getByTestId("unit-select-BATCH_VOLUME")).toHaveValue("L");

    // Click the reset button.
    await page.getByTestId("reset-defaults-button").click();

    // All unit selects must return to defaults.
    for (const [category, expected] of Object.entries(UNIT_DEFAULTS)) {
      await expect(page.getByTestId(`unit-select-${category}`)).toHaveValue(
        expected,
      );
    }

    // All formula selects must return to defaults.
    for (const [formula, expected] of Object.entries(FORMULA_DEFAULTS)) {
      await expect(page.getByTestId(`formula-select-${formula}`)).toHaveValue(
        expected,
      );
    }

    // Theme must return to dark.
    await expect(page.getByTestId("theme-select")).toHaveValue("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Reset defaults persist — reset values survive a page reload.
  // -------------------------------------------------------------------------

  test("reset defaults persist — values remain at defaults after reload", async ({
    page,
  }) => {
    await open_settings(page);

    // Make changes, then reset.
    await page.getByTestId("unit-select-BATCH_VOLUME").selectOption("L");
    await page.getByTestId("formula-select-ibu").selectOption("mibu");
    await page.getByTestId("theme-select").selectOption("light");

    // Let pending IndexedDB writes from individual changes flush before reset.
    await page.waitForTimeout(300);

    await page.getByTestId("reset-defaults-button").click();

    // Confirm reset took effect before reloading.
    await expect(page.getByTestId("unit-select-BATCH_VOLUME")).toHaveValue(
      "gal",
    );
    await expect(page.getByTestId("formula-select-ibu")).toHaveValue("tinseth");
    await expect(page.getByTestId("theme-select")).toHaveValue("dark");

    // Let the reset writes flush before reloading.
    await page.waitForTimeout(300);

    // Reload and verify defaults survived the round-trip.
    await page.reload();
    await page.waitForURL("**/#/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible();

    await expect(page.getByTestId("unit-select-BATCH_VOLUME")).toHaveValue(
      "gal",
    );
    await expect(page.getByTestId("formula-select-ibu")).toHaveValue("tinseth");
    await expect(page.getByTestId("theme-select")).toHaveValue("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Back link — navigates to the recipes list.
  // -------------------------------------------------------------------------

  test("back link — navigates back to the recipes list", async ({ page }) => {
    await open_settings(page);

    await page.getByTestId("back-to-recipes").click();

    // The URL must shift to the recipes route and the list must be visible.
    await page.waitForURL("**/#/recipes");
    await expect(page.getByTestId("recipes-list")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 8: All select option variants accepted — smoke-test every option
  // value in the unit and formula selects.
  // -------------------------------------------------------------------------

  test("all select options are accepted — every valid option value can be selected", async ({
    page,
  }) => {
    await open_settings(page);

    const unit_options: Record<string, string[]> = {
      BATCH_VOLUME: ["gal", "L"],
      SMALL_VOLUME: ["mL", "tsp", "tbsp", "fl_oz"],
      GRAIN_WEIGHT: ["lb_oz", "kg"],
      HOP_WEIGHT: ["oz", "g"],
      MISC_WEIGHT: ["g", "oz"],
      TEMPERATURE: ["F", "C"],
      GRAVITY: ["SG", "Plato"],
      COLOR: ["SRM", "EBC", "Lovibond"],
      PRESSURE: ["PSI", "kPa", "bar"],
      EVAP_RATE: ["gal_per_hr", "L_per_hr"],
    };

    for (const [category, options] of Object.entries(unit_options)) {
      for (const option of options) {
        await page.getByTestId(`unit-select-${category}`).selectOption(option);
        await expect(
          page.getByTestId(`unit-select-${category}`),
        ).toHaveValue(option);
      }
    }

    const formula_options: Record<string, string[]> = {
      ibu: ["tinseth", "rager", "mibu"],
      color: ["morey", "daniels", "mosher"],
      abv: ["simple", "alternate"],
      mash_ph: ["brun_water", "kaiser"],
    };

    for (const [formula, options] of Object.entries(formula_options)) {
      for (const option of options) {
        await page
          .getByTestId(`formula-select-${formula}`)
          .selectOption(option);
        await expect(
          page.getByTestId(`formula-select-${formula}`),
        ).toHaveValue(option);
      }
    }

    // Theme options.
    for (const option of ["dark", "light"]) {
      await page.getByTestId("theme-select").selectOption(option);
      await expect(page.getByTestId("theme-select")).toHaveValue(option);
    }
  });
});
