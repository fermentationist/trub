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

// ===========================================================================
// Mash Schedule
// ===========================================================================

test.describe("Mash Schedule section", () => {
  test.beforeEach(async ({ context }) => {
    await clear_indexed_db(context);
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Initial state — section visible, empty state shown, no rows.
  // -------------------------------------------------------------------------

  test("initial state — section visible, empty state shown, no rows present", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // The accordion/section row wrapper must be visible.
    await expect(page.getByTestId("mash-schedule-section-row")).toBeVisible();

    // The inner section content must be visible.
    await expect(page.getByTestId("mash-schedule-section")).toBeVisible();

    // The add button must be present.
    await expect(page.getByTestId("mash-add-button")).toBeVisible();

    // Empty state message must appear before any steps are added.
    await expect(page.getByTestId("mash-empty-state")).toBeVisible();

    // No mash rows should exist yet.
    await expect(page.getByTestId("mash-row-0")).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Add/edit/remove — add a step, verify defaults, edit all
  // fields, verify updated values, then remove the step.
  // -------------------------------------------------------------------------

  test("add/edit/remove — step appears with defaults, edits persist, remove clears section", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // Add a step.
    await page.getByTestId("mash-add-button").click();
    await expect(page.getByTestId("mash-row-0")).toBeVisible();

    // Empty state must disappear once a row exists.
    await expect(page.getByTestId("mash-empty-state")).not.toBeVisible();

    // Verify default values.
    await expect(page.getByTestId("mash-type-select-0")).toHaveValue("infusion");
    await expect(page.getByTestId("mash-temp-input-0")).toHaveValue("67");
    await expect(page.getByTestId("mash-time-input-0")).toHaveValue("60");
    await expect(page.getByTestId("mash-water-input-0")).toHaveValue("0");

    // Edit name.
    await page.getByTestId("mash-name-input-0").fill("Saccharification");
    await expect(page.getByTestId("mash-name-input-0")).toHaveValue(
      "Saccharification",
    );

    // Change type to decoction.
    await page.getByTestId("mash-type-select-0").selectOption("decoction");
    await expect(page.getByTestId("mash-type-select-0")).toHaveValue(
      "decoction",
    );

    // Change temperature to 68.
    await page.getByTestId("mash-temp-input-0").fill("68");
    await expect(page.getByTestId("mash-temp-input-0")).toHaveValue("68");

    // Change time to 45.
    await page.getByTestId("mash-time-input-0").fill("45");
    await expect(page.getByTestId("mash-time-input-0")).toHaveValue("45");

    // Remove the step.
    await page.getByTestId("mash-remove-button-0").click();

    // Row must be gone.
    await expect(page.getByTestId("mash-row-0")).not.toBeVisible();

    // Empty state must reappear.
    await expect(page.getByTestId("mash-empty-state")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Multiple steps — add two, verify both visible, remove the
  // first, verify the survivor re-indexes to position 0.
  // -------------------------------------------------------------------------

  test("multiple steps — remove first step, survivor re-indexes to position 0", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // Add first step.
    await page.getByTestId("mash-add-button").click();
    await expect(page.getByTestId("mash-row-0")).toBeVisible();
    await page.getByTestId("mash-name-input-0").fill("Mash In");
    await page.getByTestId("mash-temp-input-0").fill("64");
    await page.getByTestId("mash-time-input-0").fill("30");

    // Add second step.
    await page.getByTestId("mash-add-button").click();
    await expect(page.getByTestId("mash-row-1")).toBeVisible();
    await page.getByTestId("mash-name-input-1").fill("Saccharification");
    await page.getByTestId("mash-temp-input-1").fill("68");
    await page.getByTestId("mash-time-input-1").fill("60");

    // Both rows must be visible.
    await expect(page.getByTestId("mash-row-0")).toBeVisible();
    await expect(page.getByTestId("mash-row-1")).toBeVisible();

    // Remove the first step.
    await page.getByTestId("mash-remove-button-0").click();

    // Row 1 must be gone (list is now length 1, only index 0 exists).
    await expect(page.getByTestId("mash-row-1")).not.toBeVisible();

    // The surviving step (originally "Saccharification" at index 1) must now
    // occupy index 0 and retain its values.
    await expect(async () => {
      const name = await page
        .getByTestId("mash-name-input-0")
        .inputValue();
      const temp = await page
        .getByTestId("mash-temp-input-0")
        .inputValue();
      const time = await page
        .getByTestId("mash-time-input-0")
        .inputValue();

      if (name !== "Saccharification") {
        throw new Error(
          `Surviving step name expected "Saccharification", got "${name}"`,
        );
      }
      if (temp !== "68") {
        throw new Error(
          `Surviving step temp expected "68", got "${temp}"`,
        );
      }
      if (time !== "60") {
        throw new Error(
          `Surviving step time expected "60", got "${time}"`,
        );
      }
    }).toPass({ timeout: 5000 });

    // Empty state must not appear while one step still exists.
    await expect(page.getByTestId("mash-empty-state")).not.toBeVisible();
  });
});

// ===========================================================================
// Fermentation Schedule
// ===========================================================================

test.describe("Fermentation Schedule section", () => {
  test.beforeEach(async ({ context }) => {
    await clear_indexed_db(context);
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Initial state — section visible, empty state shown.
  // -------------------------------------------------------------------------

  test("initial state — section visible, empty state shown, no rows present", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // The accordion/section row wrapper must be visible.
    await expect(
      page.getByTestId("fermentation-schedule-section-row"),
    ).toBeVisible();

    // The inner section content must be visible.
    await expect(
      page.getByTestId("fermentation-schedule-section"),
    ).toBeVisible();

    // The add button must be present.
    await expect(page.getByTestId("fermentation-add-button")).toBeVisible();

    // Empty state message must appear before any steps are added.
    await expect(page.getByTestId("fermentation-empty-state")).toBeVisible();

    // No fermentation rows should exist yet.
    await expect(page.getByTestId("fermentation-row-0")).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Add/edit/remove — add a step, verify defaults, edit fields,
  // verify updated values, then remove the step.
  // -------------------------------------------------------------------------

  test("add/edit/remove — step appears with defaults, edits persist, remove clears section", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // Add a step.
    await page.getByTestId("fermentation-add-button").click();
    await expect(page.getByTestId("fermentation-row-0")).toBeVisible();

    // Empty state must disappear once a row exists.
    await expect(
      page.getByTestId("fermentation-empty-state"),
    ).not.toBeVisible();

    // Verify default values.
    await expect(page.getByTestId("fermentation-temp-input-0")).toHaveValue(
      "18",
    );
    await expect(
      page.getByTestId("fermentation-duration-input-0"),
    ).toHaveValue("14");

    // Edit name.
    await page.getByTestId("fermentation-name-input-0").fill("Primary");
    await expect(page.getByTestId("fermentation-name-input-0")).toHaveValue(
      "Primary",
    );

    // Change temperature to 20.
    await page.getByTestId("fermentation-temp-input-0").fill("20");
    await expect(page.getByTestId("fermentation-temp-input-0")).toHaveValue(
      "20",
    );

    // Change duration to 10.
    await page.getByTestId("fermentation-duration-input-0").fill("10");
    await expect(
      page.getByTestId("fermentation-duration-input-0"),
    ).toHaveValue("10");

    // Remove the step.
    await page.getByTestId("fermentation-remove-button-0").click();

    // Row must be gone.
    await expect(page.getByTestId("fermentation-row-0")).not.toBeVisible();

    // Empty state must reappear.
    await expect(page.getByTestId("fermentation-empty-state")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Multiple steps — add two, verify both visible, remove the
  // first, verify the survivor re-indexes to position 0.
  // -------------------------------------------------------------------------

  test("multiple steps — remove first step, survivor re-indexes to position 0", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // Add first step.
    await page.getByTestId("fermentation-add-button").click();
    await expect(page.getByTestId("fermentation-row-0")).toBeVisible();
    await page.getByTestId("fermentation-name-input-0").fill("Primary");
    await page.getByTestId("fermentation-temp-input-0").fill("20");
    await page.getByTestId("fermentation-duration-input-0").fill("14");

    // Add second step.
    await page.getByTestId("fermentation-add-button").click();
    await expect(page.getByTestId("fermentation-row-1")).toBeVisible();
    await page.getByTestId("fermentation-name-input-1").fill("Secondary");
    await page.getByTestId("fermentation-temp-input-1").fill("16");
    await page.getByTestId("fermentation-duration-input-1").fill("7");

    // Both rows must be visible.
    await expect(page.getByTestId("fermentation-row-0")).toBeVisible();
    await expect(page.getByTestId("fermentation-row-1")).toBeVisible();

    // Remove the first step.
    await page.getByTestId("fermentation-remove-button-0").click();

    // Row 1 must be gone (list is now length 1, only index 0 exists).
    await expect(page.getByTestId("fermentation-row-1")).not.toBeVisible();

    // The surviving step (originally "Secondary" at index 1) must now occupy
    // index 0 and retain its values.
    await expect(async () => {
      const name = await page
        .getByTestId("fermentation-name-input-0")
        .inputValue();
      const temp = await page
        .getByTestId("fermentation-temp-input-0")
        .inputValue();
      const duration = await page
        .getByTestId("fermentation-duration-input-0")
        .inputValue();

      if (name !== "Secondary") {
        throw new Error(
          `Surviving step name expected "Secondary", got "${name}"`,
        );
      }
      if (temp !== "16") {
        throw new Error(
          `Surviving step temp expected "16", got "${temp}"`,
        );
      }
      if (duration !== "7") {
        throw new Error(
          `Surviving step duration expected "7", got "${duration}"`,
        );
      }
    }).toPass({ timeout: 5000 });

    // Empty state must not appear while one step still exists.
    await expect(
      page.getByTestId("fermentation-empty-state"),
    ).not.toBeVisible();
  });
});

// ===========================================================================
// Notes
// ===========================================================================

test.describe("Notes section", () => {
  test.beforeEach(async ({ context }) => {
    await clear_indexed_db(context);
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Initial state — section visible, textarea visible and empty.
  // -------------------------------------------------------------------------

  test("initial state — section visible, textarea present and empty", async ({
    page,
  }) => {
    await open_new_recipe(page);

    // The accordion/section row wrapper must be visible.
    await expect(page.getByTestId("notes-section-row")).toBeVisible();

    // The inner section content must be visible.
    await expect(page.getByTestId("notes-section")).toBeVisible();

    // The textarea must be present and empty.
    await expect(page.getByTestId("notes-textarea")).toBeVisible();
    await expect(page.getByTestId("notes-textarea")).toHaveValue("");
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Type notes — text entered into the textarea persists in place.
  // -------------------------------------------------------------------------

  test("type notes — entered text is reflected in the textarea value", async ({
    page,
  }) => {
    await open_new_recipe(page);

    const notes_text =
      "Dry hop with 50g Citra at day 4. Cold crash for 48 hours before packaging.";

    await page.getByTestId("notes-textarea").fill(notes_text);
    await expect(page.getByTestId("notes-textarea")).toHaveValue(notes_text);
  });
});
