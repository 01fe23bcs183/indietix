import { test, expect } from "@playwright/test";

test.describe("Feature Flags", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/auth/signin");
    await page.fill('input[type="email"]', "admin@test.com");
    await page.fill('input[type="password"]', "password");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should navigate to settings page and see feature flags link", async ({
    page,
  }) => {
    await page.click("text=Settings");
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("text=Feature Flags")).toBeVisible();
    await expect(page.locator("text=Manage Feature Flags")).toBeVisible();
  });

  test("should navigate to feature flags page", async ({ page }) => {
    await page.goto("/settings/flags");
    await expect(page.locator("h1")).toContainText("Feature Flags");
    await expect(page.locator("text=Kill Switches")).toBeVisible();
  });

  test("should show create flag button", async ({ page }) => {
    await page.goto("/settings/flags");
    await expect(page.locator("text=Create Flag")).toBeVisible();
  });

  test("should open create flag form when clicking create button", async ({
    page,
  }) => {
    await page.goto("/settings/flags");
    await page.click("text=Create Flag");
    await expect(page.locator("text=Flag Key")).toBeVisible();
    await expect(page.locator("text=Description")).toBeVisible();
    await expect(page.locator("text=Rollout Percentage")).toBeVisible();
  });

  test("should show kill switches section with critical flags", async ({
    page,
  }) => {
    await page.goto("/settings/flags");
    await expect(page.locator("text=Kill Switches")).toBeVisible();
    await expect(page.locator("text=booking.enabled")).toBeVisible();
    await expect(page.locator("text=checkout.new_ui")).toBeVisible();
  });

  test("should show targeting rules section in create form", async ({
    page,
  }) => {
    await page.goto("/settings/flags");
    await page.click("text=Create Flag");
    await expect(page.locator("text=Targeting Rules")).toBeVisible();
    await expect(page.locator("text=Target Roles")).toBeVisible();
    await expect(page.locator("text=Target Categories")).toBeVisible();
    await expect(page.locator("text=Target Cities")).toBeVisible();
  });
});
