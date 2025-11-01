import { test, expect } from "@playwright/test";

test.describe("Admin Panel", () => {
  test("should redirect non-admin users to signin", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("should show signin page", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator("h2")).toContainText("Admin Panel");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should show dashboard after admin login", async ({ page }) => {
    await page.goto("/auth/signin");
    
    await page.fill('input[type="email"]', "admin@test.com");
    await page.fill('input[type="password"]', "password");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("should display KPI cards on dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    
    await expect(page.locator("text=GMV Today")).toBeVisible();
    await expect(page.locator("text=Revenue Today")).toBeVisible();
    await expect(page.locator("text=Active Users")).toBeVisible();
    await expect(page.locator("text=Bookings (Last Hour)")).toBeVisible();
    await expect(page.locator("text=Uptime")).toBeVisible();
  });

  test("should navigate to users page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click("text=Users");
    
    await expect(page).toHaveURL(/\/users/);
    await expect(page.locator("h1")).toContainText("Users");
  });

  test("should navigate to organizers page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click("text=Organizers");
    
    await expect(page).toHaveURL(/\/organizers/);
    await expect(page.locator("h1")).toContainText("Organizers");
  });

  test("should navigate to settings page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click("text=Settings");
    
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator("h1")).toContainText("Platform Settings");
  });
});
