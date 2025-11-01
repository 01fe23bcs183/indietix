import { test, expect } from "@playwright/test";

test.describe("Organizer Payouts", () => {
  test("should display payouts page with tabs", async ({ page }) => {
    await page.goto("http://localhost:3001/payouts");

    await expect(page.getByRole("heading", { name: "Payouts" })).toBeVisible();

    await expect(page.getByRole("button", { name: "Pending" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Completed" })).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Request Payout" })
    ).toBeVisible();
  });

  test("should open request payout dialog", async ({ page }) => {
    await page.goto("http://localhost:3001/payouts");

    await page.getByRole("button", { name: "Request Payout" }).click();

    await expect(
      page.getByRole("heading", { name: "Request Payout" })
    ).toBeVisible();

    await expect(page.getByLabel("Period Start")).toBeVisible();
    await expect(page.getByLabel("Period End")).toBeVisible();

    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Request" })).toBeVisible();
  });

  test("should close dialog on cancel", async ({ page }) => {
    await page.goto("http://localhost:3001/payouts");

    await page.getByRole("button", { name: "Request Payout" }).click();
    await expect(
      page.getByRole("heading", { name: "Request Payout" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(
      page.getByRole("heading", { name: "Request Payout" })
    ).not.toBeVisible();
  });

  test("should switch between tabs", async ({ page }) => {
    await page.goto("http://localhost:3001/payouts");

    const pendingTab = page.getByRole("button", { name: "Pending" });
    await expect(pendingTab).toHaveClass(/border-blue-500/);

    await page.getByRole("button", { name: "Completed" }).click();

    const completedTab = page.getByRole("button", { name: "Completed" });
    await expect(completedTab).toHaveClass(/border-blue-500/);
  });
});
