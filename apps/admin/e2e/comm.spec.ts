import { test, expect } from "@playwright/test";

test.describe("Admin Communication Center", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/signin");
  });

  test("should display communication center page with tabs", async ({
    page,
  }) => {
    await page.goto("/comm");

    await expect(page.locator("h1")).toContainText("Communication Center");
    await expect(page.locator("button:has-text('Campaigns')")).toBeVisible();
    await expect(page.locator("button:has-text('Outbox')")).toBeVisible();
    await expect(page.locator("button:has-text('Failed')")).toBeVisible();
  });

  test("should have new send button", async ({ page }) => {
    await page.goto("/comm");

    await expect(page.locator("a:has-text('New Send')")).toBeVisible();
  });

  test("should navigate to new send wizard", async ({ page }) => {
    await page.goto("/comm/new");

    await expect(page.locator("h1")).toContainText("New Send");
    await expect(page.locator("text=Select Channel")).toBeVisible();
  });

  test("should display channel selection step", async ({ page }) => {
    await page.goto("/comm/new");

    await expect(page.locator("text=EMAIL")).toBeVisible();
    await expect(page.locator("text=SMS")).toBeVisible();
    await expect(page.locator("text=PUSH")).toBeVisible();
  });

  test("should allow selecting a channel", async ({ page }) => {
    await page.goto("/comm/new");

    await page.click("text=EMAIL");
    await expect(page.locator("button:has-text('Next')")).toBeEnabled();
  });

  test("should show template selection after channel", async ({ page }) => {
    await page.goto("/comm/new");

    await page.click("text=EMAIL");
    await page.click("button:has-text('Next')");

    await expect(page.locator("text=Select Template")).toBeVisible();
  });

  test("should show audience selection step", async ({ page }) => {
    await page.goto("/comm/new");

    await page.click("text=EMAIL");
    await page.click("button:has-text('Next')");

    await page.locator("select").first().selectOption({ index: 1 });
    await page.click("button:has-text('Next')");

    await expect(page.locator("text=Select Audience")).toBeVisible();
  });

  test("should switch between tabs", async ({ page }) => {
    await page.goto("/comm");

    await page.click("button:has-text('Outbox')");
    await expect(page.locator("text=Live Progress")).toBeVisible();

    await page.click("button:has-text('Failed')");
    await expect(page.locator("text=Failed Notifications")).toBeVisible();

    await page.click("button:has-text('Campaigns')");
    await expect(page.locator("text=All Campaigns")).toBeVisible();
  });
});
