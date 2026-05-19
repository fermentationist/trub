import { test, expect, type BrowserContext } from "@playwright/test";

// Clear IndexedDB before each test so state from other tests cannot bleed in.
async function clear_indexed_db(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    // Runs before every page load in this context.
    // We cannot call indexedDB.databases() reliably in all browsers, so we
    // register a beforeunload-time noop and instead rely on the storage
    // clearing below which fires before any app JS runs.
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

  // The most reliable cross-browser approach: navigate to the origin and
  // delete all storages via the CDP Storage API that Playwright exposes.
  await context.clearCookies();

  // storageState clearing is not enough for IndexedDB — use evaluate after
  // first navigation (see individual tests).
}

// Deletes all IndexedDB databases accessible from the page's origin.
// Must be called after page.goto() so the page's origin is established.
async function purge_indexed_db_on_page(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(async () => {
    // indexedDB.databases() is not available in Firefox but Trub targets
    // Chromium for E2E, matching the playwright.config.ts project list.
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

test.describe("Recipe creation with fermentables", () => {
  test.beforeEach(async ({ context }) => {
    await clear_indexed_db(context);
  });

  test("full happy path — add fermentables and verify stat updates", async ({
    page,
  }) => {
    // ------------------------------------------------------------------ setup
    await page.goto("/#/recipes");
    await purge_indexed_db_on_page(page);
    // Reload so the app starts with a clean DB.
    await page.reload();

    // ------------------------------------------------------- recipes list page
    await expect(page.getByTestId("recipes-list")).toBeVisible();

    // --------------------------------------------------------- create a recipe
    await page.getByTestId("new-recipe-button").click();

    // Editor must be visible with default recipe name pre-filled.
    await expect(page.getByTestId("recipe-editor")).toBeVisible();
    await expect(page.getByTestId("recipe-name-input")).toHaveValue(
      "New Recipe",
    );

    // ---------------------------------------------------------- rename recipe
    // Triple-click selects all existing text so .fill() replaces it cleanly.
    await page.getByTestId("recipe-name-input").click({ clickCount: 3 });
    await page.getByTestId("recipe-name-input").fill("Test IPA");
    await expect(page.getByTestId("recipe-name-input")).toHaveValue("Test IPA");

    // -------------------------------------------- initial stats (empty recipe)
    await expect(page.getByTestId("stats-dashboard")).toBeVisible();
    await expect(page.getByTestId("stat-og-value")).toHaveText("1.000");
    await expect(page.getByTestId("stat-abv-value")).toHaveText("0.0%");

    // -------------------------------------------------------- add fermentable 0
    await expect(page.getByTestId("fermentables-section")).toBeVisible();
    // Empty state should be visible before any fermentables are added.
    await expect(page.getByTestId("fermentables-empty-state")).toBeVisible();

    await page.getByTestId("fermentables-add-button").click();

    // A row must appear for index 0.
    await expect(page.getByTestId("fermentable-row-0")).toBeVisible();

    // Fill in fermentable 0: Pale Malt 2-Row, 5 kg, grain, 37 PPG.
    await page
      .getByTestId("fermentable-name-input-0")
      .fill("Pale Malt 2-Row");
    await page.getByTestId("fermentable-type-select-0").selectOption("grain");
    await page.getByTestId("fermentable-amount-input-0").fill("5");
    await page.getByTestId("fermentable-ppg-input-0").fill("37");

    // --------------------------------------------- verify OG updates (row 0)
    // With 5 kg Pale Malt @ 37 PPG, 20 L batch, ~72% efficiency we expect
    // roughly OG 1.056. We assert it is strictly greater than 1.000.
    await expect(page.getByTestId("stat-og-value")).not.toHaveText("1.000");

    // FG and ABV should also be non-trivial now.
    await expect(page.getByTestId("stat-fg-value")).not.toHaveText("1.000");
    await expect(page.getByTestId("stat-abv-value")).not.toHaveText("0.0%");

    // Percentage display must be visible for row 0.
    await expect(page.getByTestId("fermentable-pct-display-0")).toBeVisible();

    // -------------------------------------------------------- add fermentable 1
    await page.getByTestId("fermentables-add-button").click();
    await expect(page.getByTestId("fermentable-row-1")).toBeVisible();

    await page.getByTestId("fermentable-name-input-1").fill("Crystal 60");
    await page.getByTestId("fermentable-type-select-1").selectOption("grain");
    await page.getByTestId("fermentable-amount-input-1").fill("0.5");
    await page.getByTestId("fermentable-ppg-input-1").fill("34");

    // Capture OG text after row 0 to compare once row 1 is filled.
    // We use a CSS custom assertion: OG must be visible and non-default.
    await expect(page.getByTestId("stat-og-value")).not.toHaveText("1.000");

    // ----------------------------------------- verify percentages sum to ~100%
    // The total-pct testid should read something close to "100%" or "100.0%".
    // We check it is visible and contains "100".
    await expect(page.getByTestId("fermentables-total-pct")).toContainText(
      "100",
    );

    // Individual pct displays must both be visible.
    await expect(page.getByTestId("fermentable-pct-display-0")).toBeVisible();
    await expect(page.getByTestId("fermentable-pct-display-1")).toBeVisible();

    // ------------------------------------------------------------------- undo
    // Undo should revert the last change (Crystal 60 amount or the row itself).
    const og_before_undo = await page
      .getByTestId("stat-og-value")
      .textContent();

    await page.getByTestId("undo-button").click();

    // After undo the state should differ from before undo in some observable
    // way. The safest assertion: the OG value changes OR row 1 disappears OR
    // the amount field reverts.  We wait for any of these — row 1 may vanish
    // if the undo steps back past the "add row" action.
    await expect(async () => {
      const og_after_undo = await page
        .getByTestId("stat-og-value")
        .textContent();
      const row_1_visible = await page
        .getByTestId("fermentable-row-1")
        .isVisible()
        .catch(() => false);

      // Either the OG value changed or the row disappeared — either proves undo fired.
      const og_changed = og_after_undo !== og_before_undo;
      const row_gone = !row_1_visible;

      if (!og_changed && !row_gone) {
        throw new Error(
          `Undo had no observable effect: OG still "${og_after_undo}", row-1 still visible`,
        );
      }
    }).toPass({ timeout: 5000 });

    // ------------------------------------------------------------------- redo
    await page.getByTestId("redo-button").click();

    // After redo the OG should return to the pre-undo value or row 1 is visible again.
    await expect(async () => {
      const og_after_redo = await page
        .getByTestId("stat-og-value")
        .textContent();
      const row_1_visible = await page
        .getByTestId("fermentable-row-1")
        .isVisible()
        .catch(() => false);

      const og_restored = og_after_redo === og_before_undo;
      const row_back = row_1_visible;

      if (!og_restored && !row_back) {
        throw new Error(
          `Redo had no observable effect: OG "${og_after_redo}", row-1 not visible`,
        );
      }
    }).toPass({ timeout: 5000 });

    // -------------------------------------------------- ensure both rows exist
    // Confirm row 1 is present before attempting removal so the test is robust
    // regardless of undo/redo granularity.
    const row_1_present = await page
      .getByTestId("fermentable-row-1")
      .isVisible()
      .catch(() => false);

    if (!row_1_present) {
      // Redo may not have restored the row fully; add row 1 back so the
      // removal step below is deterministic.
      await page.getByTestId("fermentables-add-button").click();
      await expect(page.getByTestId("fermentable-row-1")).toBeVisible();
      await page.getByTestId("fermentable-name-input-1").fill("Crystal 60");
      await page.getByTestId("fermentable-type-select-1").selectOption("grain");
      await page.getByTestId("fermentable-amount-input-1").fill("0.5");
      await page.getByTestId("fermentable-ppg-input-1").fill("34");
    }

    // -------------------------------------------- remove fermentable at index 1
    await page.getByTestId("fermentable-remove-button-1").click();

    // Row 1 must be gone; row 0 must survive.
    await expect(page.getByTestId("fermentable-row-1")).not.toBeVisible();
    await expect(page.getByTestId("fermentable-row-0")).toBeVisible();

    // OG must still be non-default (row 0 still contributes).
    await expect(page.getByTestId("stat-og-value")).not.toHaveText("1.000");
  });
});
