import { test, expect } from "@playwright/test";

test.describe("Admin Payouts", () => {
  test("should display payouts management page", async ({ page }) => {
    
    await page.goto("http://localhost:3002/payouts");
    
    await expect(page.getByRole("heading", { name: "Payouts Management" })).toBeVisible();
    
    await expect(page.getByRole("button", { name: "Pending Approval" })).toBeVisible();
    await expect(page.getByRole("button", { name: "All Payouts" })).toBeVisible();
  });

  test("should display payout details", async ({ page }) => {
    await page.goto("http://localhost:3002/payouts");
    
    await expect(page.getByText("GMV")).toBeVisible();
    await expect(page.getByText("Refunds")).toBeVisible();
    await expect(page.getByText("Platform Fees")).toBeVisible();
    await expect(page.getByText("Net Payable")).toBeVisible();
  });

  test("should show approve and reject buttons for pending payouts", async ({ page }) => {
    await page.goto("http://localhost:3002/payouts");
    
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reject" })).toBeVisible();
  });

  test("should switch between tabs", async ({ page }) => {
    await page.goto("http://localhost:3002/payouts");
    
    const pendingTab = page.getByRole("button", { name: "Pending Approval" });
    await expect(pendingTab).toHaveClass(/border-blue-500/);
    
    await page.getByRole("button", { name: "All Payouts" }).click();
    
    const allTab = page.getByRole("button", { name: "All Payouts" });
    await expect(allTab).toHaveClass(/border-blue-500/);
  });
});
