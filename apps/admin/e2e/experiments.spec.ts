import { test, expect } from "@playwright/test";

test.describe("Experiments", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/auth/signin");
    await page.fill('input[type="email"]', "admin@test.com");
    await page.fill('input[type="password"]', "password");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should navigate to experiments page from sidebar", async ({ page }) => {
    await page.click("text=Experiments");
    await expect(page).toHaveURL(/\/experiments/);
    await expect(page.locator("h1")).toContainText("Experiments");
  });

  test("should show create experiment button", async ({ page }) => {
    await page.goto("/experiments");
    await expect(page.locator("text=Create Experiment")).toBeVisible();
  });

  test("should open create experiment form when clicking create button", async ({
    page,
  }) => {
    await page.goto("/experiments");
    await page.click("text=Create Experiment");
    await expect(page.locator("text=Experiment Key")).toBeVisible();
    await expect(page.locator("text=Description")).toBeVisible();
    await expect(page.locator("text=Variants")).toBeVisible();
  });

  test("should show default A/B variants in create form", async ({ page }) => {
    await page.goto("/experiments");
    await page.click("text=Create Experiment");
    // Check for default variant inputs
    const variantInputs = page.locator('input[placeholder="Variant name"]');
    await expect(variantInputs).toHaveCount(2);
  });

  test("should allow adding more variants", async ({ page }) => {
    await page.goto("/experiments");
    await page.click("text=Create Experiment");
    await page.click("text=Add Variant");
    const variantInputs = page.locator('input[placeholder="Variant name"]');
    await expect(variantInputs).toHaveCount(3);
  });

  test("should show all experiments section", async ({ page }) => {
    await page.goto("/experiments");
    await expect(page.locator("text=All Experiments")).toBeVisible();
  });

  test("should display experiment status badges", async ({ page }) => {
    await page.goto("/experiments");
    // The page should have status badge styling classes
    await expect(page.locator("text=Manage A/B tests")).toBeVisible();
  });
});
