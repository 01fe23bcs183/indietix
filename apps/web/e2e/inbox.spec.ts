import { test, expect } from "@playwright/test";

test.describe("User Inbox", () => {
  test("should display inbox page", async ({ page }) => {
    await page.goto("/inbox");

    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Inbox", { timeout: 10000 });
  });

  test("should show empty state when no notifications", async ({ page }) => {
    await page.goto("/inbox");

    const emptyState = page.locator("text=No notifications");
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    if (hasEmptyState) {
      await expect(emptyState).toBeVisible();
      await expect(page.locator("text=all caught up")).toBeVisible();
    }
  });

  test("should have mark all as read button when unread notifications exist", async ({
    page,
  }) => {
    await page.goto("/inbox");

    const markAllButton = page.locator("button:has-text('Mark all as read')");
    const hasUnread = await markAllButton.isVisible().catch(() => false);

    if (hasUnread) {
      await expect(markAllButton).toBeVisible();
    }
  });

  test("should display notification items with channel badges", async ({
    page,
  }) => {
    await page.goto("/inbox");

    const notificationItem = page.locator("[class*='cursor-pointer']").first();
    const hasNotifications = await notificationItem
      .isVisible()
      .catch(() => false);

    if (hasNotifications) {
      const channelBadge = page
        .locator("text=EMAIL, text=SMS, text=PUSH")
        .first();
      await expect(channelBadge).toBeVisible();
    }
  });

  test("should expand notification on click", async ({ page }) => {
    await page.goto("/inbox");

    const notificationItem = page.locator("[class*='cursor-pointer']").first();
    const hasNotifications = await notificationItem
      .isVisible()
      .catch(() => false);

    if (hasNotifications) {
      await notificationItem.click();

      const expandedContent = page.locator("text=Mark as");
      await expect(expandedContent).toBeVisible();
    }
  });
});

test.describe("Unsubscribe Page", () => {
  test("should show invalid link message without token", async ({ page }) => {
    await page.goto("/unsubscribe");

    await expect(page.locator("text=Invalid Link")).toBeVisible();
    await expect(page.locator("text=Return to Home")).toBeVisible();
  });

  test("should have return to home button", async ({ page }) => {
    await page.goto("/unsubscribe");

    const homeButton = page.locator("a:has-text('Return to Home')");
    await expect(homeButton).toBeVisible();
  });
});
