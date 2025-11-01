import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should load signup page", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.locator("h2")).toContainText("Sign Up");
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("should load signin page", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator("h2")).toContainText("Sign In");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});
