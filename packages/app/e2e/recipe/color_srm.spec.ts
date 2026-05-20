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

// Returns the inline background-color style of the color swatch element, or
// an empty string if the attribute is absent.
async function get_swatch_color(
  page: import("@playwright/test").Page,
): Promise<string> {
  return page.evaluate(() => {
    const el = document.querySelector("[data-testid='color-swatch']");
    if (!el) {
      return "";
    }
    return (el as HTMLElement).style.backgroundColor;
  });
}

test.describe("SRM color stat and color swatch", () => {
  test.beforeEach(async ({ context }) => {
    await clear_indexed_db(context);
  });

  test("SRM stat and color swatch update as fermentables are added and removed", async ({
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
    await expect(page.getByTestId("recipe-editor")).toBeVisible();

    // ---------------------------------------- initial SRM and swatch (empty recipe)
    // With no fermentables the SRM should read "0.0 SRM" (UnitValue appends the
    // unit suffix; US default is SRM) and the swatch must exist.
    await expect(page.getByTestId("stat-srm-value")).toHaveText("0.0 SRM");
    await expect(page.getByTestId("color-swatch")).toBeVisible();

    // Capture the default swatch color so we can assert it changes later.
    const default_swatch_color = await get_swatch_color(page);

    // -------------------------------------------------------- add fermentable 0
    // Pale Malt: 5 kg, 3.5 °L, 37 PPG — a typical light-colored base malt.
    await page.getByTestId("fermentables-add-button").click();
    await expect(page.getByTestId("fermentable-row-0")).toBeVisible();

    await page.getByTestId("fermentable-amount-input-0").fill("5");
    await page.getByTestId("fermentable-color-input-0").fill("3.5");
    await page.getByTestId("fermentable-ppg-input-0").fill("37");

    // ------------------------------------------ verify SRM is now greater than 0
    // toHaveText uses exact matching by default; use a regex to assert the value
    // is anything other than "0.0".
    await expect(page.getByTestId("stat-srm-value")).not.toHaveText("0.0 SRM");

    // Capture the SRM value string so we can compare it after adding a dark malt.
    const srm_after_pale = await page
      .getByTestId("stat-srm-value")
      .textContent();

    // ---------------------------------- verify the swatch color is no longer the default
    // The default swatch represents an empty/colorless recipe. After adding pale
    // malt the background-color must be a different value.
    await expect(async () => {
      const swatch_after_pale = await get_swatch_color(page);
      if (swatch_after_pale === default_swatch_color) {
        throw new Error(
          `Swatch color did not change from default after adding pale malt: "${swatch_after_pale}"`,
        );
      }
    }).toPass({ timeout: 5000 });

    const swatch_color_after_pale = await get_swatch_color(page);

    // -------------------------------------------------------- add fermentable 1
    // Crystal 60: 0.5 kg, 60 °L, 34 PPG — a medium-dark crystal malt.
    await page.getByTestId("fermentables-add-button").click();
    await expect(page.getByTestId("fermentable-row-1")).toBeVisible();

    await page.getByTestId("fermentable-amount-input-1").fill("0.5");
    await page.getByTestId("fermentable-color-input-1").fill("60");
    await page.getByTestId("fermentable-ppg-input-1").fill("34");

    // ----------------------------------- verify SRM increased (beer is now darker)
    // We compare the numeric text values. Both should be valid decimal strings
    // such that parseFloat(after) > parseFloat(before).
    await expect(async () => {
      const srm_after_crystal = await page
        .getByTestId("stat-srm-value")
        .textContent();

      const before = parseFloat(srm_after_pale ?? "0");
      const after = parseFloat(srm_after_crystal ?? "0");

      if (after <= before) {
        throw new Error(
          `SRM did not increase after adding Crystal 60: before="${srm_after_pale}", after="${srm_after_crystal}"`,
        );
      }
    }).toPass({ timeout: 5000 });

    const srm_after_crystal = await page
      .getByTestId("stat-srm-value")
      .textContent();

    // ------------------------------------------ verify swatch is darker (color changed)
    // The RGB components of the swatch background-color string must differ from
    // the pale-malt value, indicating the app recomputed and applied a new color.
    await expect(async () => {
      const swatch_after_crystal = await get_swatch_color(page);
      if (swatch_after_crystal === swatch_color_after_pale) {
        throw new Error(
          `Swatch color did not change after adding Crystal 60: "${swatch_after_crystal}"`,
        );
      }
    }).toPass({ timeout: 5000 });

    // -------------------------------------------- remove the dark fermentable (index 1)
    await page.getByTestId("fermentable-remove-button-1").click();
    await expect(page.getByTestId("fermentable-row-1")).not.toBeVisible();

    // Row 0 (pale malt) must still be present.
    await expect(page.getByTestId("fermentable-row-0")).toBeVisible();

    // ----------------------- verify SRM decreased back toward the pale-malt value
    await expect(async () => {
      const srm_after_remove = await page
        .getByTestId("stat-srm-value")
        .textContent();

      const after_crystal = parseFloat(srm_after_crystal ?? "0");
      const after_remove = parseFloat(srm_after_remove ?? "0");

      if (after_remove >= after_crystal) {
        throw new Error(
          `SRM did not decrease after removing Crystal 60: was "${srm_after_crystal}", now "${srm_after_remove}"`,
        );
      }
    }).toPass({ timeout: 5000 });

    // --------- verify SRM is still > 0 (pale malt still contributes color)
    await expect(page.getByTestId("stat-srm-value")).not.toHaveText("0.0 SRM");

    // ------------------------------------ verify swatch lightened after removal
    // The swatch color should revert to match the pale-malt-only color, which
    // differs from the crystal-malt color captured above.
    await expect(async () => {
      const current = await get_swatch_color(page);
      if (current !== swatch_color_after_pale) {
        throw new Error(
          `Swatch color after removing Crystal 60 ("${current}") does not match ` +
            `the expected pale-malt-only color ("${swatch_color_after_pale}")`,
        );
      }
    }).toPass({ timeout: 5000 });
  });
});
