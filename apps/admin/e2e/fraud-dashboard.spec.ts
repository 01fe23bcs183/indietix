import { test, expect } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

test.describe("Fraud Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test("should display fraud dashboard with statistics", async ({ page }) => {
    await page.goto("/fraud");

    await expect(page.locator("h1")).toContainText("Fraud Detection");

    await expect(page.locator("text=Booking Attempts (24h)")).toBeVisible();
    await expect(page.locator("text=Booking Attempts (7d)")).toBeVisible();
    await expect(page.locator("text=High Risk Cases")).toBeVisible();

    await expect(page.locator('a[href="/fraud/rules"]')).toBeVisible();
    await expect(page.locator('a[href="/fraud/cases"]')).toBeVisible();
  });

  test("should navigate to rules page", async ({ page }) => {
    await page.goto("/fraud");

    await page.click('a[href="/fraud/rules"]');
    await page.waitForURL("/fraud/rules");

    await expect(page.locator("h1")).toContainText("Fraud Rules");
  });

  test("should navigate to cases page", async ({ page }) => {
    await page.goto("/fraud");

    await page.click('a[href="/fraud/cases"]');
    await page.waitForURL("/fraud/cases");

    await expect(page.locator("h1")).toContainText("Review Queue");
  });
});
