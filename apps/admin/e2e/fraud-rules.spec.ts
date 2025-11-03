import { test, expect } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

test.describe("Fraud Rules Management", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/fraud/rules");
  });

  test("should display fraud rules page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Fraud Rules");

    await expect(
      page.locator("text=Manage fraud detection rules and priorities")
    ).toBeVisible();

    await expect(
      page.locator("button", { hasText: "Create Rule" })
    ).toBeVisible();
  });

  test("should display rules table with headers", async ({ page }) => {
    await expect(page.locator("th", { hasText: "Name" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Action" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Weight" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Priority" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Status" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Actions" })).toBeVisible();
  });

  test("should show alert when clicking Create Rule button", async ({
    page,
  }) => {
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Rule creation form coming soon");
      await dialog.accept();
    });

    await page.click("button", { hasText: "Create Rule" });
  });

  test("should display empty state when no rules exist", async ({ page }) => {
    const noRulesText = page.locator("text=No rules configured yet");

    const hasRules = await page.locator("tbody tr").count();
    if (hasRules === 0) {
      await expect(noRulesText).toBeVisible();
    }
  });
});
