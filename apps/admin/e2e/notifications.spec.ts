import { test, expect } from "@playwright/test";

test.describe("Admin Notification Preview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/signin");
  });

  test("should display notification preview page", async ({ page }) => {
    await page.goto("/notifications/preview");

    await expect(page.locator("h1")).toContainText("Notification Preview");
    await expect(page.locator("text=Template Configuration")).toBeVisible();
    await expect(page.locator("text=Preview")).toBeVisible();
  });

  test("should have template type selector", async ({ page }) => {
    await page.goto("/notifications/preview");

    const selector = page.locator("select").first();
    await expect(selector).toBeVisible();

    await expect(
      selector.locator("option:has-text('booking_confirmed')")
    ).toBeVisible();
    await expect(
      selector.locator("option:has-text('event_reminder_T24')")
    ).toBeVisible();
  });

  test("should have channel selector", async ({ page }) => {
    await page.goto("/notifications/preview");

    const channelSelector = page.locator("select").nth(1);
    await expect(channelSelector).toBeVisible();

    await expect(
      channelSelector.locator("option:has-text('Email')")
    ).toBeVisible();
    await expect(
      channelSelector.locator("option:has-text('SMS')")
    ).toBeVisible();
    await expect(
      channelSelector.locator("option:has-text('Push')")
    ).toBeVisible();
  });

  test("should have payload textarea", async ({ page }) => {
    await page.goto("/notifications/preview");

    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();

    const content = await textarea.inputValue();
    expect(content).toContain("{");
  });

  test("should have preview and send test buttons", async ({ page }) => {
    await page.goto("/notifications/preview");

    await expect(page.locator("button:has-text('Preview')")).toBeVisible();
    await expect(page.locator("button:has-text('Send Test')")).toBeVisible();
  });
});
