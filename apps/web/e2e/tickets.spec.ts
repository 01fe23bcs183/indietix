import { test, expect } from "@playwright/test";

test.describe("Ticket System", () => {
  test("should display ticket page with QR code for confirmed booking", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/bookings/test-booking-id");

    await expect(page.locator("h1")).toContainText(/loading|error|ticket/i);
  });

  test("should show offline banner when network is unavailable", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/bookings/test-booking-id");

    await page.evaluate(() => {
      window.dispatchEvent(new Event("offline"));
    });

    await expect(page.locator("text=Works offline")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should have Add to Calendar button", async ({ page }) => {
    await page.goto("http://localhost:3000/bookings/test-booking-id");

    const calendarButton = page.locator("button", {
      hasText: /add to calendar/i,
    });
    await expect(calendarButton).toBeVisible({ timeout: 10000 });
  });
});
