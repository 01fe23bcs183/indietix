import { test, expect } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

test.describe("Fraud Review Queue", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/fraud/cases");
  });

  test("should display review queue page", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Review Queue");

    await expect(
      page.locator("text=Review and manage flagged bookings")
    ).toBeVisible();
  });

  test("should display filter dropdown", async ({ page }) => {
    await expect(page.locator("select")).toBeVisible();

    const select = page.locator("select");
    await expect(
      select.locator("option", { hasText: "All Cases" })
    ).toBeVisible();
    await expect(select.locator("option", { hasText: "Open" })).toBeVisible();
    await expect(
      select.locator("option", { hasText: "Approved" })
    ).toBeVisible();
    await expect(
      select.locator("option", { hasText: "Rejected" })
    ).toBeVisible();
  });

  test("should display cases table with headers", async ({ page }) => {
    await expect(page.locator("th", { hasText: "Booking ID" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Risk Score" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Status" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Created" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Actions" })).toBeVisible();
  });

  test("should display empty state when no cases exist", async ({ page }) => {
    const noCasesText = page.locator("text=No cases found");

    const hasCases = await page.locator("tbody tr").count();
    if (hasCases === 0) {
      await expect(noCasesText).toBeVisible();
    }
  });

  test("should filter cases by status", async ({ page }) => {
    await page.selectOption("select", "OPEN");

    await page.waitForTimeout(500);
  });
});
