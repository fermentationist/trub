import { test, expect } from "@playwright/test";

test("app loads", async ({ page }) => {
  await page.goto("/#/recipes");
  await expect(page.locator("h1")).toContainText("Recipes");
});
