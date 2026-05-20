import { test, expect, type BrowserContext, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// DB isolation helpers — identical pattern to settings.spec.ts.
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

async function purge_indexed_db_on_page(page: Page): Promise<void> {
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
// Navigation helper — navigate to settings with a clean DB.
// ---------------------------------------------------------------------------

async function open_settings(page: Page): Promise<void> {
  await page.goto("/#/settings");
  await purge_indexed_db_on_page(page);
  await page.reload();
  await page.waitForURL("**/#/settings");
  await expect(page.getByTestId("settings-page")).toBeVisible();
  await expect(page.getByTestId("equipment-section")).toBeVisible();
}

// ---------------------------------------------------------------------------
// Helpers for adding a profile through the UI.
// ---------------------------------------------------------------------------

async function add_profile(
  page: Page,
  name: string,
  batch_size: string,
  efficiency: string,
): Promise<void> {
  await page.getByTestId("equipment-add-button").click();
  await expect(page.getByTestId("equipment-form")).toBeVisible();
  await page.getByTestId("equipment-form-name").fill(name);
  await page.getByTestId("equipment-form-batch-size").fill(batch_size);
  await page.getByTestId("equipment-form-efficiency").fill(efficiency);
  await page.getByTestId("equipment-form-save").click();
  // Wait for the form to close and the list to appear.
  await expect(page.getByTestId("equipment-form")).not.toBeVisible();
  await expect(page.getByTestId("equipment-profile-list")).toBeVisible();
}

// ---------------------------------------------------------------------------
// Return the profile list item element that contains a given name span.
// Because IDs are auto-generated we locate profiles by their displayed name.
// ---------------------------------------------------------------------------

function profile_row_by_name(page: Page, name: string) {
  // Find the span with the matching name text, then walk up to the li.profile-item.
  return page
    .locator("[data-testid^='equipment-profile-name-']", { hasText: name })
    .locator("xpath=ancestor::li[1]");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Equipment Profiles section", () => {
  test.beforeEach(async ({ context }) => {
    await clear_indexed_db(context);
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Empty state — no profiles, add button visible.
  // -------------------------------------------------------------------------

  test("empty state — shows empty state message and add button when no profiles exist", async ({
    page,
  }) => {
    await open_settings(page);

    await expect(page.getByTestId("equipment-empty-state")).toBeVisible();
    await expect(page.getByTestId("equipment-add-button")).toBeVisible();
    await expect(page.getByTestId("equipment-profile-list")).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Add profile — appears in list with correct values.
  // -------------------------------------------------------------------------

  test("add profile — profile appears in the list with name, batch size, and efficiency", async ({
    page,
  }) => {
    await open_settings(page);

    await page.getByTestId("equipment-add-button").click();
    await expect(page.getByTestId("equipment-form")).toBeVisible();

    // Empty name keeps save button disabled.
    await expect(page.getByTestId("equipment-form-save")).toBeDisabled();

    // Fill all three highlighted fields.
    await page.getByTestId("equipment-form-name").fill("10-Gallon Kettle");
    await page.getByTestId("equipment-form-batch-size").fill("37.85");
    await page.getByTestId("equipment-form-efficiency").fill("75");

    // Save button should now be enabled.
    await expect(page.getByTestId("equipment-form-save")).toBeEnabled();

    await page.getByTestId("equipment-form-save").click();

    // Form closes, list appears.
    await expect(page.getByTestId("equipment-form")).not.toBeVisible();
    await expect(page.getByTestId("equipment-empty-state")).not.toBeVisible();
    await expect(page.getByTestId("equipment-profile-list")).toBeVisible();

    // The profile row exists and shows the correct name, batch size, and efficiency.
    const row = profile_row_by_name(page, "10-Gallon Kettle");
    await expect(row).toBeVisible();
    await expect(row.locator("[data-testid^='equipment-profile-name-']")).toHaveText(
      "10-Gallon Kettle",
    );
    // The stat chips display batch size and efficiency.
    // Batch size is entered as 37.85 in the user's preferred unit (gal, US default).
    // UnitValue renders at 2 decimal places: "37.85 gal".
    await expect(row.locator(".stat-value").nth(0)).toHaveText("37.85 gal");
    await expect(row.locator(".stat-value").nth(1)).toHaveText("75%");
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Edit profile — updated name shown in list after save.
  // -------------------------------------------------------------------------

  test("edit profile — changing the name via the edit form updates the list", async ({
    page,
  }) => {
    await open_settings(page);
    await add_profile(page, "Original Name", "20", "72");

    // Locate the profile row, then click its edit button.
    const row = profile_row_by_name(page, "Original Name");
    await row.locator("[data-testid^='equipment-edit-button-']").click();

    // The inline edit form must appear.
    await expect(page.getByTestId("equipment-form")).toBeVisible();

    // Clear and re-type the name.
    await page.getByTestId("equipment-form-name").fill("Updated Name");
    await page.getByTestId("equipment-form-save").click();

    // Form closes and the row now shows the updated name.
    await expect(page.getByTestId("equipment-form")).not.toBeVisible();
    await expect(
      page.locator("[data-testid^='equipment-profile-name-']", { hasText: "Updated Name" }),
    ).toBeVisible();
    // Original name is gone.
    await expect(
      page.locator("[data-testid^='equipment-profile-name-']", { hasText: "Original Name" }),
    ).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Delete profile — profile disappears and empty state returns.
  // -------------------------------------------------------------------------

  test("delete profile — accepting the confirm dialog removes the profile and shows empty state", async ({
    page,
  }) => {
    await open_settings(page);
    await add_profile(page, "To Be Deleted", "19", "70");

    // Register dialog handler BEFORE clicking delete.
    page.on("dialog", (dialog) => dialog.accept());

    const row = profile_row_by_name(page, "To Be Deleted");
    await row.locator("[data-testid^='equipment-delete-button-']").click();

    // Profile must disappear and empty state must return.
    await expect(
      page.locator("[data-testid^='equipment-profile-name-']", { hasText: "To Be Deleted" }),
    ).not.toBeVisible();
    await expect(page.getByTestId("equipment-profile-list")).not.toBeVisible();
    await expect(page.getByTestId("equipment-empty-state")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 4b: Delete dismissed — profile stays when confirm is cancelled.
  // -------------------------------------------------------------------------

  test("delete profile — dismissing the confirm dialog leaves the profile in the list", async ({
    page,
  }) => {
    await open_settings(page);
    await add_profile(page, "Should Survive", "19", "70");

    // Dismiss the dialog so the delete is cancelled.
    page.on("dialog", (dialog) => dialog.dismiss());

    const row = profile_row_by_name(page, "Should Survive");
    await row.locator("[data-testid^='equipment-delete-button-']").click();

    // Profile must still be visible.
    await expect(
      page.locator("[data-testid^='equipment-profile-name-']", { hasText: "Should Survive" }),
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Set as default — default badge moves to the second profile.
  // -------------------------------------------------------------------------

  test("set as default — default badge moves to the newly selected default profile", async ({
    page,
  }) => {
    await open_settings(page);
    await add_profile(page, "Profile Alpha", "20", "72");
    await add_profile(page, "Profile Beta", "38", "75");

    // Neither profile should have the default badge yet (none is marked default
    // on creation, so there should be no badge at all initially — or only one
    // if the repository auto-defaults the first profile on creation).
    // We unconditionally set Profile Beta as default.
    const beta_row = profile_row_by_name(page, "Profile Beta");
    const beta_set_default_btn = beta_row.locator(
      "[data-testid^='equipment-set-default-button-']",
    );
    await expect(beta_set_default_btn).toBeVisible();
    await beta_set_default_btn.click();

    // Beta must now show the default badge.
    await expect(
      beta_row.locator("[data-testid^='equipment-profile-default-badge-']"),
    ).toBeVisible();

    // The "Set Default" button must no longer be visible on Beta (it is hidden
    // when `profile.is_default` is true).
    await expect(beta_set_default_btn).not.toBeVisible();

    // Alpha must not have the default badge and must expose "Set Default".
    const alpha_row = profile_row_by_name(page, "Profile Alpha");
    await expect(
      alpha_row.locator("[data-testid^='equipment-profile-default-badge-']"),
    ).not.toBeVisible();
    await expect(
      alpha_row.locator("[data-testid^='equipment-set-default-button-']"),
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Cancel form — form closes, no profile added.
  // -------------------------------------------------------------------------

  test("cancel form — clicking cancel discards the form without adding a profile", async ({
    page,
  }) => {
    await open_settings(page);

    await page.getByTestId("equipment-add-button").click();
    await expect(page.getByTestId("equipment-form")).toBeVisible();

    // Type something so we can be sure it is truly discarded.
    await page.getByTestId("equipment-form-name").fill("Discarded Profile");
    await page.getByTestId("equipment-form-batch-size").fill("20");

    await page.getByTestId("equipment-form-cancel").click();

    // Form must close.
    await expect(page.getByTestId("equipment-form")).not.toBeVisible();

    // No profile was created — empty state must still be visible.
    await expect(page.getByTestId("equipment-empty-state")).toBeVisible();
    await expect(page.getByTestId("equipment-profile-list")).not.toBeVisible();

    // Add button must be re-enabled (is_adding is false again).
    await expect(page.getByTestId("equipment-add-button")).toBeEnabled();
  });

  // -------------------------------------------------------------------------
  // Scenario 7: Profile values persist after reload.
  // -------------------------------------------------------------------------

  test("profile persists after reload — name, batch size, and efficiency survive a page reload", async ({
    page,
  }) => {
    await open_settings(page);
    await add_profile(page, "Persistent Kettle", "37.85", "80");

    // Reload the page — no navigation away, just a hard reload.
    await page.reload();
    await page.waitForURL("**/#/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible();
    await expect(page.getByTestId("equipment-section")).toBeVisible();

    // The profile must still be in the list.
    await expect(page.getByTestId("equipment-profile-list")).toBeVisible();
    const row = profile_row_by_name(page, "Persistent Kettle");
    await expect(row).toBeVisible();
    await expect(
      row.locator("[data-testid^='equipment-profile-name-']"),
    ).toHaveText("Persistent Kettle");
    // Batch size is entered as 37.85 in the user's preferred unit (gal, US default).
    // UnitValue renders at 2 decimal places: "37.85 gal".
    await expect(row.locator(".stat-value").nth(0)).toHaveText("37.85 gal");
    await expect(row.locator(".stat-value").nth(1)).toHaveText("80%");
  });
});
