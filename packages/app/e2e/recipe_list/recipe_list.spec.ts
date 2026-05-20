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
// Shared navigation helper — navigate to recipes list with a clean DB.
// ---------------------------------------------------------------------------

async function open_recipes_list(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/#/recipes");
  await purge_indexed_db_on_page(page);
  await page.reload();
  await page.waitForURL("**/#/recipes");
  await expect(page.getByTestId("recipes-list")).toBeVisible();
}

// ---------------------------------------------------------------------------
// Helper — create a recipe via the editor, then return to the list.
// Navigates to /#/recipes/new, sets the name, waits for auto-save, then
// navigates back to /#/recipes. Returns with the list visible.
// ---------------------------------------------------------------------------

async function create_recipe(
  page: import("@playwright/test").Page,
  name: string,
): Promise<void> {
  await page.goto("/#/recipes/new");
  await expect(page.getByTestId("recipe-editor")).toBeVisible();
  await page.getByTestId("recipe-name-input").click({ clickCount: 3 });
  await page.getByTestId("recipe-name-input").fill(name);
  await expect(page.getByTestId("recipe-name-input")).toHaveValue(name);
  // Wait for auto-save to complete (1s debounce + write time).
  await expect(page.getByText("Saved")).toBeVisible({ timeout: 5000 });
  await page.goto("/#/recipes");
  await expect(page.getByTestId("recipes-list")).toBeVisible();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Recipe list page", () => {
  test.beforeEach(async ({ context }) => {
    await clear_indexed_db(context);
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Empty state — page loads with no recipes.
  // -------------------------------------------------------------------------

  test("empty state — shows empty state and controls when there are no recipes", async ({
    page,
  }) => {
    await open_recipes_list(page);

    // The empty state must be the only content in the body.
    await expect(page.getByTestId("empty-state")).toBeVisible();

    // The recipes grid must NOT be present.
    await expect(page.getByTestId("recipes-grid")).not.toBeVisible();

    // Search and sort controls must still be rendered.
    await expect(page.getByTestId("search-input")).toBeVisible();
    await expect(page.getByTestId("sort-select")).toBeVisible();
    await expect(page.getByTestId("sort-direction-button")).toBeVisible();

    // The new-recipe button in the header must be visible.
    await expect(page.getByTestId("new-recipe-button")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Create recipe and see card.
  // -------------------------------------------------------------------------

  test("create recipe and see card — card appears with correct name and default zero stats", async ({
    page,
  }) => {
    await open_recipes_list(page);

    // Navigate to the new-recipe editor via the header button.
    await page.getByTestId("new-recipe-button").click();
    await expect(page.getByTestId("recipe-editor")).toBeVisible();

    // Set a distinctive name.
    await page.getByTestId("recipe-name-input").click({ clickCount: 3 });
    await page.getByTestId("recipe-name-input").fill("Golden Ale");
    await expect(page.getByTestId("recipe-name-input")).toHaveValue("Golden Ale");

    // Wait for auto-save to complete (1s debounce + write time).
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 5000 });

    // Navigate back to the list.
    await page.goto("/#/recipes");
    await expect(page.getByTestId("recipes-list")).toBeVisible();

    // The recipes grid must now be visible with at least one card.
    await expect(page.getByTestId("recipes-grid")).toBeVisible();

    // Find the card whose name matches. We don't know the ID yet, so we
    // locate by text and confirm the surrounding card structure is present.
    const name_button = page.getByRole("button", { name: "Golden Ale", exact: true });
    await expect(name_button).toBeVisible();

    // The card must show default zero stats (no fermentables, hops, or yeast).
    // Grab the card article containing our recipe name button.
    const card = name_button.locator("xpath=ancestor::article");

    // OG defaults to 1.000 with no fermentables.
    await expect(card.locator("[data-testid^='recipe-card-og-']")).toHaveText(
      "1.000",
    );

    // IBU defaults to 0.0 with no hops.
    await expect(card.locator("[data-testid^='recipe-card-ibu-']")).toHaveText(
      "0.0",
    );

    // ABV defaults to 0.0% with no fermentables.
    await expect(card.locator("[data-testid^='recipe-card-abv-']")).toHaveText(
      "0.0%",
    );
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Multiple recipe cards — both recipes visible.
  // -------------------------------------------------------------------------

  test("multiple recipe cards — both cards visible in the list", async ({
    page,
  }) => {
    await open_recipes_list(page);

    await create_recipe(page, "Stout Alpha");
    await create_recipe(page, "Wheat Beta");

    // Both names must be visible as buttons.
    await expect(page.getByRole("button", { name: "Stout Alpha", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Wheat Beta", exact: true })).toBeVisible();

    // The grid must be showing (not empty state).
    await expect(page.getByTestId("recipes-grid")).toBeVisible();
    await expect(page.getByTestId("empty-state")).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Search — filters by name.
  // -------------------------------------------------------------------------

  test("search filters by name — only matching card shows, clearing restores both", async ({
    page,
  }) => {
    await open_recipes_list(page);

    await create_recipe(page, "Galaxy IPA");
    await create_recipe(page, "Citra Pale Ale");

    // Both cards visible before searching.
    await expect(page.getByRole("button", { name: "Galaxy IPA", exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Citra Pale Ale", exact: true }),
    ).toBeVisible();

    // Type into the search field. The search is debounced at 300 ms.
    await page.getByTestId("search-input").fill("Galaxy");

    // Wait for debounce and re-render: only Galaxy IPA remains.
    await expect(
      page.getByRole("button", { name: "Citra Pale Ale", exact: true }),
    ).not.toBeVisible({ timeout: 1500 });
    await expect(page.getByRole("button", { name: "Galaxy IPA", exact: true })).toBeVisible();

    // The empty-search-state must NOT appear since one result exists.
    await expect(page.getByTestId("empty-search-state")).not.toBeVisible();

    // Clear the search input.
    await page.getByTestId("search-input").fill("");

    // Both cards must reappear.
    await expect(page.getByRole("button", { name: "Galaxy IPA", exact: true })).toBeVisible({
      timeout: 1500,
    });
    await expect(
      page.getByRole("button", { name: "Citra Pale Ale", exact: true }),
    ).toBeVisible({ timeout: 1500 });
  });

  // -------------------------------------------------------------------------
  // Scenario 4b: Search returns no results — empty-search-state shown.
  // -------------------------------------------------------------------------

  test("search with no matches — shows empty search state", async ({ page }) => {
    await open_recipes_list(page);

    await create_recipe(page, "Pilsner Lager");

    // Search for something that matches nothing.
    await page.getByTestId("search-input").fill("zzznomatch");

    // After debounce the empty-search-state must appear.
    await expect(page.getByTestId("empty-search-state")).toBeVisible({
      timeout: 1500,
    });

    // The recipes-grid must NOT be visible.
    await expect(page.getByTestId("recipes-grid")).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Sort by name — asc and desc order.
  // -------------------------------------------------------------------------

  test("sort by name — ascending then descending order", async ({ page }) => {
    await open_recipes_list(page);

    // Create two recipes. The second one is created last so it has a later
    // updated_at (the default sort field), meaning "Apple Ale" appears second
    // before we change sort. We'll switch to Name sort to get a predictable order.
    await create_recipe(page, "Zebra Porter");
    await create_recipe(page, "Apple Ale");

    // Switch sort field to Name.
    await page.getByTestId("sort-select").selectOption("name");

    // Ensure direction is ascending (default state after a fresh DB is "desc"
    // on updated_at; after switching to name, direction stays as it was).
    // We read the aria-label to determine current direction.
    const sort_btn = page.getByTestId("sort-direction-button");

    // Force to ascending first by reading current label and clicking if needed.
    const asc_label = "Sort direction: ascending";
    const desc_label = "Sort direction: descending";

    // Bring to ascending.
    const current_label = await sort_btn.getAttribute("aria-label");
    if (current_label === desc_label) {
      await sort_btn.click();
    }
    await expect(sort_btn).toHaveAttribute("aria-label", asc_label);

    // With ascending name sort: Apple Ale should come before Zebra Porter.
    const grid = page.getByTestId("recipes-grid");
    const cards = grid.locator("article");
    await expect(cards).toHaveCount(2);

    const first_name_asc = cards.nth(0).locator("[data-testid^='recipe-card-name-']");
    const second_name_asc = cards.nth(1).locator("[data-testid^='recipe-card-name-']");
    await expect(first_name_asc).toHaveText("Apple Ale");
    await expect(second_name_asc).toHaveText("Zebra Porter");

    // Toggle to descending.
    await sort_btn.click();
    await expect(sort_btn).toHaveAttribute("aria-label", desc_label);

    // Now Zebra Porter should be first.
    const first_name_desc = cards.nth(0).locator("[data-testid^='recipe-card-name-']");
    const second_name_desc = cards.nth(1).locator("[data-testid^='recipe-card-name-']");
    await expect(first_name_desc).toHaveText("Zebra Porter");
    await expect(second_name_desc).toHaveText("Apple Ale");
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Duplicate recipe.
  // -------------------------------------------------------------------------

  test("duplicate recipe — copy card appears with (copy) suffix", async ({
    page,
  }) => {
    await open_recipes_list(page);

    await create_recipe(page, "Brown Ale");

    // Locate the original card's duplicate button. We don't know the ID, so
    // query by aria-label prefix.
    const duplicate_btn = page.getByRole("button", {
      name: /^Duplicate Brown Ale/,
    });
    await expect(duplicate_btn).toBeVisible();
    await duplicate_btn.click();

    // A second card titled "Brown Ale (copy)" must appear.
    await expect(
      page.getByRole("button", { name: "Brown Ale (copy)", exact: true }),
    ).toBeVisible();

    // The original card must still be present.
    await expect(page.getByRole("button", { name: "Brown Ale", exact: true })).toBeVisible();

    // Exactly two cards in the grid.
    await expect(page.getByTestId("recipes-grid").locator("article")).toHaveCount(
      2,
    );
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Delete recipe.
  // -------------------------------------------------------------------------

  test("delete recipe — card disappears and empty state returns", async ({
    page,
  }) => {
    await open_recipes_list(page);

    await create_recipe(page, "Porter to Delete");

    const delete_btn = page.getByRole("button", {
      name: /^Delete Porter to Delete/,
    });
    await expect(delete_btn).toBeVisible();
    await delete_btn.click();

    // Confirm via the custom dialog.
    await expect(page.getByTestId("confirm-dialog")).toBeVisible();
    await page.getByTestId("confirm-dialog-confirm").click();

    // The card must disappear.
    await expect(
      page.getByRole("button", { name: "Porter to Delete", exact: true }),
    ).not.toBeVisible();

    // Empty state must reappear since the list is now empty.
    await expect(page.getByTestId("empty-state")).toBeVisible();
    await expect(page.getByTestId("recipes-grid")).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 8: Navigate to settings.
  // -------------------------------------------------------------------------

  test("settings link — navigates to the settings page", async ({ page }) => {
    await open_recipes_list(page);

    await page.getByTestId("settings-link").click();

    // URL must shift to the settings hash route.
    await page.waitForURL("**/#/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 9: Navigate to recipe editor by clicking card name.
  // -------------------------------------------------------------------------

  test("click recipe card name — opens the recipe editor for that recipe", async ({
    page,
  }) => {
    await open_recipes_list(page);

    await create_recipe(page, "Editor Navigation Test");

    // Click the recipe name button on the card.
    await page.getByRole("button", { name: "Editor Navigation Test", exact: true }).click();

    // The URL must shift to a recipe editor route: /#/recipes/{id}
    await page.waitForURL(/\/#\/recipes\/\d+$/);

    // The recipe editor must be visible with the correct recipe name.
    await expect(page.getByTestId("recipe-editor")).toBeVisible();
    await expect(page.getByTestId("recipe-name-input")).toHaveValue(
      "Editor Navigation Test",
    );
  });
});
