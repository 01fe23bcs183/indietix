import { test, expect } from "@playwright/test";

test.describe("Organizer App", () => {
  test("should load the home page", async ({ page }) => {
    await page.goto("http://localhost:3001");
    
    await expect(page).toHaveTitle(/IndieTix/);
    
    const response = await page.goto("http://localhost:3001");
    expect(response?.status()).toBeLessThan(400);
  });

  test("should have working tRPC health endpoint", async ({ page }) => {
    const response = await page.goto("http://localhost:3001/api/trpc/health.ping");
    
    expect(response?.status()).toBe(200);
  });
});
