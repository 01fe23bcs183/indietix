import { test, expect } from "@playwright/test";

test.describe("Notification Preferences", () => {
  test("should display notification preferences page", async ({ page }) => {
    await page.goto("/profile/notifications");

    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Notification Preferences");
    await expect(page.locator("text=Notification Channels")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=Notification Types")).toBeVisible();
  });

  test("should have channel toggles", async ({ page }) => {
    await page.goto("/profile/notifications");

    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Email notifications")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=SMS notifications")).toBeVisible();
    await expect(page.locator("text=Push notifications")).toBeVisible();
  });

  test("should have category toggles", async ({ page }) => {
    await page.goto("/profile/notifications");

    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("span.font-medium:has-text('Transactional')")
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator("span.font-medium:has-text('Reminders')")
    ).toBeVisible();
    await expect(
      page.locator("span.font-medium:has-text('Marketing')")
    ).toBeVisible();
  });

  test("should have save button", async ({ page }) => {
    await page.goto("/profile/notifications");

    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("button:has-text('Save Preferences')")
    ).toBeVisible({ timeout: 10000 });
  });
});
