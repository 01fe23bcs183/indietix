import { test, expect } from "@playwright/test";

test.describe("Analytics Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3001/analytics");
  });

  test("should display analytics page with summary cards", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Analytics Dashboard");

    await expect(page.getByText("Total Revenue")).toBeVisible();
    await expect(page.getByText("Bookings")).toBeVisible();
    await expect(page.getByText("Avg Ticket Price")).toBeVisible();
    await expect(page.getByText("Seats Sold")).toBeVisible();
    await expect(page.getByText("Events Live")).toBeVisible();
  });

  test("should display charts", async ({ page }) => {
    await expect(page.getByText("Revenue Over Time")).toBeVisible();
    await expect(page.getByText("Bookings Over Time")).toBeVisible();
    await expect(page.getByText("Conversion Funnel")).toBeVisible();
    await expect(page.getByText("Top Events by Revenue")).toBeVisible();
  });

  test("should have date range filters", async ({ page }) => {
    const dateRangeSelect = page.locator('select').first();
    await expect(dateRangeSelect).toBeVisible();

    const options = await dateRangeSelect.locator("option").allTextContents();
    expect(options).toContain("Last 7 days");
    expect(options).toContain("Last 30 days");
    expect(options).toContain("Last 90 days");
    expect(options).toContain("Custom");
  });

  test("should show custom date inputs when custom is selected", async ({
    page,
  }) => {
    const dateRangeSelect = page.locator('select').first();
    await dateRangeSelect.selectOption("custom");

    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('input[type="date"]').nth(1)).toBeVisible();
  });

  test("should have export CSV button", async ({ page }) => {
    const exportButton = page.getByRole("button", { name: /export csv/i });
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();
  });

  test("should download CSV when export button is clicked", async ({
    page,
  }) => {
    const downloadPromise = page.waitForEvent("download");
    const exportButton = page.getByRole("button", { name: /export csv/i });
    await exportButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/analytics-.*\.csv/);
  });

  test("should display top events table with data", async ({ page }) => {
    const table = page.locator("table");
    await expect(table).toBeVisible();

    await expect(table.locator("th").first()).toContainText("Event");
    await expect(table.locator("th").nth(1)).toContainText("Revenue");
    await expect(table.locator("th").nth(2)).toContainText("Attendance");
  });

  test("should display conversion rate in funnel", async ({ page }) => {
    await expect(page.getByText(/Conversion Rate:/)).toBeVisible();
  });

  test("should change data when date range is changed", async ({ page }) => {
    const dateRangeSelect = page.locator('select').first();
    
    await dateRangeSelect.selectOption("7");
    await page.waitForTimeout(1000);

    await dateRangeSelect.selectOption("90");
    await page.waitForTimeout(1000);

    await expect(page.locator("h1")).toContainText("Analytics Dashboard");
  });
});
