import { test, expect } from "@playwright/test";

test.describe("Organizer Scanner", () => {
  test("should load scanner page", async ({ page }) => {
    const response = await page.goto("http://localhost:3001/scanner");
    expect(response?.status()).toBeLessThan(400);

    await expect(page.locator("h1")).toContainText(/check-in scanner/i);
  });

  test("should have Start Camera Scanner button", async ({ page }) => {
    await page.goto("http://localhost:3001/scanner");

    const startButton = page.locator("button", {
      hasText: /start camera scanner/i,
    });
    await expect(startButton).toBeVisible();
  });

  test("should have manual search input", async ({ page }) => {
    await page.goto("http://localhost:3001/scanner");

    const searchInput = page.locator('input[placeholder*="Booking ID"]');
    await expect(searchInput).toBeVisible();

    const searchButton = page.locator("button", { hasText: /search/i });
    await expect(searchButton).toBeVisible();
  });

  test("should show error for invalid booking ID in manual search", async ({
    page,
  }) => {
    await page.goto("http://localhost:3001/scanner");

    const searchInput = page.locator('input[placeholder*="Booking ID"]');
    await searchInput.fill("invalid-booking-id");

    const searchButton = page.locator("button", { hasText: /search/i });
    await searchButton.click();

    await expect(page.locator("text=/invalid|error|not found/i")).toBeVisible({
      timeout: 5000,
    });
  });
});
