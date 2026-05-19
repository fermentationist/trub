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
// Shared setup: navigate to the recipe list, purge DB, reload, open a new
// recipe editor. Returns once the editor is confirmed visible.
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
// Tests
// ---------------------------------------------------------------------------

test.describe("Misc ingredients section", () => {
  test.beforeEach(async ({ context }) => {
    await clear_indexed_db(context);
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Initial state — section visible, empty state shown, add button
  // present, no rows exist.
  // -------------------------------------------------------------------------

  test("initial state — section visible, empty state message shown, add button present", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // The accordion/section row wrapper must be visible.
    await expect(page.getByTestId("misc-section-row")).toBeVisible();

    // The inner section content must be visible.
    await expect(page.getByTestId("misc-section")).toBeVisible();

    // The add button must be present.
    await expect(page.getByTestId("misc-add-button")).toBeVisible();

    // Empty state message must appear before any entries are added.
    await expect(page.getByTestId("misc-empty-state")).toBeVisible();

    // No misc rows should exist yet.
    await expect(page.getByTestId("misc-row-0")).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Add misc — row appears with default values, empty state hides.
  // -------------------------------------------------------------------------

  test("add misc — row appears with default field values, empty state disappears", async ({
    page,
  }) => {
    await open_new_recipe(page);

    await page.getByTestId("misc-add-button").click();

    // Row 0 must appear.
    await expect(page.getByTestId("misc-row-0")).toBeVisible();

    // Empty state must be gone.
    await expect(page.getByTestId("misc-empty-state")).not.toBeVisible();

    // Default name: empty string.
    await expect(page.getByTestId("misc-name-input-0")).toHaveValue("");

    // Default type: spice.
    await expect(page.getByTestId("misc-type-select-0")).toHaveValue("spice");

    // Default use stage: boil.
    await expect(
      page.getByTestId("misc-use-stage-select-0"),
    ).toHaveValue("boil");

    // Default amount: 0 grams.
    await expect(page.getByTestId("misc-amount-input-0")).toHaveValue("0");

    // Default time: 0 minutes.
    await expect(page.getByTestId("misc-time-input-0")).toHaveValue("0");
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Edit misc fields — all inputs reflect the new values.
  // -------------------------------------------------------------------------

  test("edit misc fields — name, type, use stage, amount, and time all update", async ({
    page,
  }) => {
    await open_new_recipe(page);

    await page.getByTestId("misc-add-button").click();
    await expect(page.getByTestId("misc-row-0")).toBeVisible();

    // Edit name.
    await page.getByTestId("misc-name-input-0").fill("Irish Moss");
    await expect(page.getByTestId("misc-name-input-0")).toHaveValue(
      "Irish Moss",
    );

    // Edit type: change from spice to fining.
    await page.getByTestId("misc-type-select-0").selectOption("fining");
    await expect(page.getByTestId("misc-type-select-0")).toHaveValue("fining");

    // Edit use stage: change from boil to primary.
    await page
      .getByTestId("misc-use-stage-select-0")
      .selectOption("primary");
    await expect(
      page.getByTestId("misc-use-stage-select-0"),
    ).toHaveValue("primary");

    // Edit amount: enter 5 grams.
    await page.getByTestId("misc-amount-input-0").fill("5");
    await expect(page.getByTestId("misc-amount-input-0")).toHaveValue("5");

    // Edit time: enter 15 minutes.
    await page.getByTestId("misc-time-input-0").fill("15");
    await expect(page.getByTestId("misc-time-input-0")).toHaveValue("15");
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Edit all select option variants — verify each valid option
  // is accepted by the type and use-stage selects.
  // -------------------------------------------------------------------------

  test("type and use-stage selects accept all valid option values", async ({
    page,
  }) => {
    await open_new_recipe(page);

    await page.getByTestId("misc-add-button").click();
    await expect(page.getByTestId("misc-row-0")).toBeVisible();

    // Type options: spice, fining, water_agent, herb, flavor, other.
    const type_options = [
      "spice",
      "fining",
      "water_agent",
      "herb",
      "flavor",
      "other",
    ];

    for (const option of type_options) {
      await page.getByTestId("misc-type-select-0").selectOption(option);
      await expect(page.getByTestId("misc-type-select-0")).toHaveValue(option);
    }

    // Use stage options: boil, mash, primary, secondary, bottling.
    const stage_options = ["boil", "mash", "primary", "secondary", "bottling"];

    for (const option of stage_options) {
      await page.getByTestId("misc-use-stage-select-0").selectOption(option);
      await expect(
        page.getByTestId("misc-use-stage-select-0"),
      ).toHaveValue(option);
    }
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Remove misc — row disappears, empty state returns.
  // -------------------------------------------------------------------------

  test("remove misc — row disappears, empty state reappears", async ({
    page,
  }) => {
    await open_new_recipe(page);

    await page.getByTestId("misc-add-button").click();
    await expect(page.getByTestId("misc-row-0")).toBeVisible();

    // Fill in some data to confirm the row is properly wired up before removal.
    await page.getByTestId("misc-name-input-0").fill("Whirlfloc");
    await page.getByTestId("misc-amount-input-0").fill("1");

    // Remove the row.
    await page.getByTestId("misc-remove-button-0").click();

    // Row must be gone.
    await expect(page.getByTestId("misc-row-0")).not.toBeVisible();

    // Empty state must reappear.
    await expect(page.getByTestId("misc-empty-state")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Multiple misc entries — both rows visible with independent
  // values. Editing one row must not affect the other.
  // -------------------------------------------------------------------------

  test("multiple misc entries — two rows visible with independent values", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // Add first misc entry.
    await page.getByTestId("misc-add-button").click();
    await expect(page.getByTestId("misc-row-0")).toBeVisible();

    await page.getByTestId("misc-name-input-0").fill("Irish Moss");
    await page.getByTestId("misc-type-select-0").selectOption("fining");
    await page.getByTestId("misc-use-stage-select-0").selectOption("boil");
    await page.getByTestId("misc-amount-input-0").fill("5");
    await page.getByTestId("misc-time-input-0").fill("15");

    // Add second misc entry.
    await page.getByTestId("misc-add-button").click();
    await expect(page.getByTestId("misc-row-1")).toBeVisible();

    await page.getByTestId("misc-name-input-1").fill("Lemon Zest");
    await page.getByTestId("misc-type-select-1").selectOption("flavor");
    await page
      .getByTestId("misc-use-stage-select-1")
      .selectOption("secondary");
    await page.getByTestId("misc-amount-input-1").fill("10");
    await page.getByTestId("misc-time-input-1").fill("0");

    // Both rows must remain visible.
    await expect(page.getByTestId("misc-row-0")).toBeVisible();
    await expect(page.getByTestId("misc-row-1")).toBeVisible();

    // Empty state must not be visible.
    await expect(page.getByTestId("misc-empty-state")).not.toBeVisible();

    // Row 0 values must be unchanged by row 1 input.
    await expect(page.getByTestId("misc-name-input-0")).toHaveValue(
      "Irish Moss",
    );
    await expect(page.getByTestId("misc-type-select-0")).toHaveValue("fining");
    await expect(
      page.getByTestId("misc-use-stage-select-0"),
    ).toHaveValue("boil");
    await expect(page.getByTestId("misc-amount-input-0")).toHaveValue("5");
    await expect(page.getByTestId("misc-time-input-0")).toHaveValue("15");

    // Row 1 values must be independent.
    await expect(page.getByTestId("misc-name-input-1")).toHaveValue(
      "Lemon Zest",
    );
    await expect(page.getByTestId("misc-type-select-1")).toHaveValue("flavor");
    await expect(
      page.getByTestId("misc-use-stage-select-1"),
    ).toHaveValue("secondary");
    await expect(page.getByTestId("misc-amount-input-1")).toHaveValue("10");
    await expect(page.getByTestId("misc-time-input-1")).toHaveValue("0");
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Remove one of two entries — the surviving row retains its
  // index-0 position and all previously entered values.
  // -------------------------------------------------------------------------

  test("remove first of two misc entries — surviving entry retains its values", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // Add two entries.
    await page.getByTestId("misc-add-button").click();
    await expect(page.getByTestId("misc-row-0")).toBeVisible();
    await page.getByTestId("misc-name-input-0").fill("Entry A");
    await page.getByTestId("misc-amount-input-0").fill("3");

    await page.getByTestId("misc-add-button").click();
    await expect(page.getByTestId("misc-row-1")).toBeVisible();
    await page.getByTestId("misc-name-input-1").fill("Entry B");
    await page.getByTestId("misc-amount-input-1").fill("7");

    // Remove entry at index 0.
    await page.getByTestId("misc-remove-button-0").click();

    // Only one row should remain — it must now occupy index 0.
    await expect(page.getByTestId("misc-row-1")).not.toBeVisible();

    // The surviving entry (originally "Entry B") must be at index 0 and
    // retain its name and amount.
    await expect(async () => {
      const name = await page
        .getByTestId("misc-name-input-0")
        .inputValue();
      const amount = await page
        .getByTestId("misc-amount-input-0")
        .inputValue();

      if (name !== "Entry B") {
        throw new Error(
          `Surviving entry name expected "Entry B", got "${name}"`,
        );
      }
      if (amount !== "7") {
        throw new Error(
          `Surviving entry amount expected "7", got "${amount}"`,
        );
      }
    }).toPass({ timeout: 5000 });

    // Empty state must not be shown while one entry still exists.
    await expect(page.getByTestId("misc-empty-state")).not.toBeVisible();
  });
});
