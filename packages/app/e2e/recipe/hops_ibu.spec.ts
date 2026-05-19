import { test, expect, type BrowserContext } from "@playwright/test";

// Clear IndexedDB before each test so state from other tests cannot bleed in.
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

// Deletes all IndexedDB databases accessible from the page's origin.
// Must be called after page.goto() so the page's origin is established.
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

test.describe("Hops section and IBU stat", () => {
  test.beforeEach(async ({ context }) => {
    await clear_indexed_db(context);
  });

  test("add hops, verify IBU updates, edit properties, remove hop", async ({
    page,
  }) => {
    // ------------------------------------------------------------------ setup
    await page.goto("/#/recipes");
    await purge_indexed_db_on_page(page);
    await page.reload();

    // ------------------------------------------------------- recipes list page
    await expect(page.getByTestId("recipes-list")).toBeVisible();

    // --------------------------------------------------------- create a recipe
    await page.getByTestId("new-recipe-button").click();
    await expect(page.getByTestId("recipe-editor")).toBeVisible();

    // --------------------------------------- verify IBU starts at 0 (no hops)
    await expect(page.getByTestId("stat-ibu-value")).toHaveText("0.0");

    // ------------------------------------------- add a fermentable so OG > 1
    // IBU calculation in Tinseth/Rager depends on OG — a non-trivial OG is
    // required before hop additions will produce a measurable IBU.
    await expect(page.getByTestId("fermentables-section")).toBeVisible();
    await page.getByTestId("fermentables-add-button").click();
    await expect(page.getByTestId("fermentable-row-0")).toBeVisible();

    await page.getByTestId("fermentable-amount-input-0").fill("5");
    await page.getByTestId("fermentable-ppg-input-0").fill("37");

    // OG must be non-trivial before we proceed to add hops.
    await expect(page.getByTestId("stat-og-value")).not.toHaveText("1.000");

    // ------------------------------------------- verify hops empty state first
    await expect(page.getByTestId("hops-section")).toBeVisible();
    await expect(page.getByTestId("hops-empty-state")).toBeVisible();

    // ------------------------------------------------------------ add first hop
    await page.getByTestId("hops-add-button").click();

    // Empty state should be gone; the table and first row must appear.
    await expect(page.getByTestId("hops-empty-state")).not.toBeVisible();
    await expect(page.getByTestId("hops-table")).toBeVisible();
    await expect(page.getByTestId("hop-row-0")).toBeVisible();

    // Fill in hop 0: Cascade, 5.5% AA, 28 g, 60 min boil addition, pellet.
    await page.getByTestId("hop-name-input-0").fill("Cascade");
    await page.getByTestId("hop-alpha-input-0").fill("5.5");
    await page.getByTestId("hop-amount-input-0").fill("28");
    await page.getByTestId("hop-time-input-0").fill("60");
    await page.getByTestId("hop-use-select-0").selectOption("boil");
    await page.getByTestId("hop-form-select-0").selectOption("pellet");

    // IBU must now be greater than zero.
    await expect(page.getByTestId("stat-ibu-value")).not.toHaveText("0.0");

    // Capture the IBU after adding the first hop so we can compare later.
    const ibu_after_hop_0 = await page
      .getByTestId("stat-ibu-value")
      .textContent();

    // ----------------------------------------------------------- add second hop
    await page.getByTestId("hops-add-button").click();
    await expect(page.getByTestId("hop-row-1")).toBeVisible();

    // Fill in hop 1: Centennial, 10% AA, 14 g, 15 min boil addition.
    await page.getByTestId("hop-name-input-1").fill("Centennial");
    await page.getByTestId("hop-alpha-input-1").fill("10");
    await page.getByTestId("hop-amount-input-1").fill("14");
    await page.getByTestId("hop-time-input-1").fill("15");
    await page.getByTestId("hop-use-select-1").selectOption("boil");

    // IBU must increase beyond the single-hop value.
    await expect(async () => {
      const ibu_after_hop_1 = await page
        .getByTestId("stat-ibu-value")
        .textContent();
      const ibu_0 = parseFloat(ibu_after_hop_0 ?? "0");
      const ibu_1 = parseFloat(ibu_after_hop_1 ?? "0");
      if (ibu_1 <= ibu_0) {
        throw new Error(
          `IBU did not increase after adding second hop: before=${ibu_0}, after=${ibu_1}`,
        );
      }
    }).toPass({ timeout: 5000 });

    const ibu_with_two_boil_hops = await page
      .getByTestId("stat-ibu-value")
      .textContent();

    // --------------------------------- reduce first hop time: 60 min → 30 min
    // Shorter boil time means less utilization — IBU should drop.
    await page.getByTestId("hop-time-input-0").click({ clickCount: 3 });
    await page.getByTestId("hop-time-input-0").fill("30");

    await expect(async () => {
      const ibu_after_time_change = await page
        .getByTestId("stat-ibu-value")
        .textContent();
      const ibu_two_boil = parseFloat(ibu_with_two_boil_hops ?? "0");
      const ibu_time_changed = parseFloat(ibu_after_time_change ?? "0");
      if (ibu_time_changed >= ibu_two_boil) {
        throw new Error(
          `IBU did not decrease after shortening hop-0 boil time: before=${ibu_two_boil}, after=${ibu_time_changed}`,
        );
      }
    }).toPass({ timeout: 5000 });

    const ibu_after_time_change = await page
      .getByTestId("stat-ibu-value")
      .textContent();

    // ---------------------- change second hop use to dry_hop — no IBU contribution
    // Dry hop additions do not contribute to IBU in any standard formula.
    await page.getByTestId("hop-use-select-1").selectOption("dry_hop");

    await expect(async () => {
      const ibu_after_dry_hop = await page
        .getByTestId("stat-ibu-value")
        .textContent();
      const ibu_before = parseFloat(ibu_after_time_change ?? "0");
      const ibu_after = parseFloat(ibu_after_dry_hop ?? "0");
      if (ibu_after >= ibu_before) {
        throw new Error(
          `IBU did not decrease after converting hop-1 to dry hop: before=${ibu_before}, after=${ibu_after}`,
        );
      }
    }).toPass({ timeout: 5000 });

    const ibu_after_dry_hop = await page
      .getByTestId("stat-ibu-value")
      .textContent();

    // --------------------------------------------------------------- remove hop 1
    // At this point: hop-0 is a 30-min boil Cascade, hop-1 is a dry Centennial.
    // Removing hop-1 (dry hop, zero IBU contribution) should leave IBU unchanged
    // or marginally different, and reduce the row count to 1.
    await page.getByTestId("hop-remove-button-1").click();

    // Row 1 must be gone; row 0 must remain.
    await expect(page.getByTestId("hop-row-1")).not.toBeVisible();
    await expect(page.getByTestId("hop-row-0")).toBeVisible();

    // IBU should remain at or near the same value (dry hop had no contribution).
    // We allow a small numeric delta but confirm it is still above zero.
    await expect(page.getByTestId("stat-ibu-value")).not.toHaveText("0.0");

    // ----------------------------------- verify remaining hop shows correct values
    await expect(page.getByTestId("hop-name-input-0")).toHaveValue("Cascade");
    await expect(page.getByTestId("hop-alpha-input-0")).toHaveValue("5.5");
    await expect(page.getByTestId("hop-amount-input-0")).toHaveValue("28");
    await expect(page.getByTestId("hop-time-input-0")).toHaveValue("30");
    await expect(page.getByTestId("hop-use-select-0")).toHaveValue("boil");
    await expect(page.getByTestId("hop-form-select-0")).toHaveValue("pellet");

    // After removing the dry-hop row, IBU should closely match what it was
    // after the dry-hop change (dry hops add nothing, so delta should be ~0).
    // We do a final numeric sanity check: IBU is non-zero and matches within 0.5.
    await expect(async () => {
      const ibu_final = await page
        .getByTestId("stat-ibu-value")
        .textContent();
      const ibu_dry_hop_baseline = parseFloat(ibu_after_dry_hop ?? "0");
      const ibu_end = parseFloat(ibu_final ?? "0");
      if (ibu_end <= 0) {
        throw new Error(`IBU dropped to zero after removing dry hop row: ${ibu_end}`);
      }
      if (Math.abs(ibu_end - ibu_dry_hop_baseline) > 0.5) {
        throw new Error(
          `IBU changed unexpectedly after removing a dry hop: before=${ibu_dry_hop_baseline}, after=${ibu_end}`,
        );
      }
    }).toPass({ timeout: 5000 });
  });
});
