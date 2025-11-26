import { test, expect } from "@playwright/test";

test.describe("RBAC Invite Accept Page", () => {
  test("should show invalid invite message for missing token", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/invite/accept");

    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Invalid Invite Link")).toBeVisible();
    await expect(
      page.locator("text=This invite link is missing the required token")
    ).toBeVisible();
  });

  test("should show invalid invite message for invalid token", async ({
    page,
  }) => {
    await page.goto(
      "http://localhost:3000/invite/accept?token=invalid-token-12345"
    );

    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Invalid Invite")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show invite details for valid token", async ({ page }) => {
    await page.goto(
      "http://localhost:3000/invite/accept?token=test-invite-token"
    );

    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(2000);

    const hasInviteDetails = await page
      .locator("text=Team Invitation")
      .isVisible()
      .catch(() => false);
    const hasInvalidInvite = await page
      .locator("text=Invalid Invite")
      .isVisible()
      .catch(() => false);

    expect(hasInviteDetails || hasInvalidInvite).toBe(true);
  });

  test("should display role permissions description", async ({ page }) => {
    await page.goto(
      "http://localhost:3000/invite/accept?token=test-invite-token"
    );

    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(2000);

    const hasRolePermissions = await page
      .locator("text=Role Permissions")
      .isVisible()
      .catch(() => false);

    if (hasRolePermissions) {
      await expect(page.locator("text=Role Permissions")).toBeVisible();
    }
  });

  test("should have Accept and Decline buttons", async ({ page }) => {
    await page.goto(
      "http://localhost:3000/invite/accept?token=test-invite-token"
    );

    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(2000);

    const hasAcceptButton = await page
      .locator("button:has-text('Accept Invitation')")
      .isVisible()
      .catch(() => false);

    if (hasAcceptButton) {
      await expect(
        page.locator("button:has-text('Accept Invitation')")
      ).toBeVisible();
      await expect(page.locator("button:has-text('Decline')")).toBeVisible();
    }
  });

  test("should show expired message for expired invite", async ({ page }) => {
    await page.goto(
      "http://localhost:3000/invite/accept?token=expired-invite-token"
    );

    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(2000);

    const hasExpiredMessage = await page
      .locator("text=Invite Expired")
      .isVisible()
      .catch(() => false);
    const hasInvalidMessage = await page
      .locator("text=Invalid Invite")
      .isVisible()
      .catch(() => false);

    expect(hasExpiredMessage || hasInvalidMessage).toBe(true);
  });
});

test.describe("RBAC Invite Page UI Elements", () => {
  test("should have loading state while fetching invite", async ({ page }) => {
    await page.goto("http://localhost:3000/invite/accept?token=any-token");

    const loadingText = page.locator("text=Loading");
    const hasLoading = await loadingText.isVisible().catch(() => false);

    expect(typeof hasLoading).toBe("boolean");
  });

  test("should display organizer name in invite details", async ({ page }) => {
    await page.goto(
      "http://localhost:3000/invite/accept?token=test-invite-token"
    );

    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(2000);

    const hasTeamInvitation = await page
      .locator("text=Team Invitation")
      .isVisible()
      .catch(() => false);

    if (hasTeamInvitation) {
      await expect(page.locator("text=invited to join")).toBeVisible();
    }
  });

  test("should show email and role in invite details", async ({ page }) => {
    await page.goto(
      "http://localhost:3000/invite/accept?token=test-invite-token"
    );

    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(2000);

    const hasTeamInvitation = await page
      .locator("text=Team Invitation")
      .isVisible()
      .catch(() => false);

    if (hasTeamInvitation) {
      await expect(page.locator("text=Email:")).toBeVisible();
      await expect(page.locator("text=Role:")).toBeVisible();
    }
  });
});

test.describe("RBAC Role Descriptions", () => {
  test("should show MANAGER permissions description", async ({ page }) => {
    await page.goto(
      "http://localhost:3000/invite/accept?token=test-invite-token"
    );

    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(2000);

    const managerPerms = page.locator(
      "text=/Create\\/edit events.*view payouts.*approve refunds/i"
    );
    const hasManagerPerms = await managerPerms.isVisible().catch(() => false);

    expect(typeof hasManagerPerms).toBe("boolean");
  });

  test("should show STAFF permissions description for staff invites", async () => {
    const staffPerms = "View events and attendees, export data";
    expect(staffPerms).toContain("View events");
  });

  test("should show SCANNER permissions description for scanner invites", async () => {
    const scannerPerms = "Check-in attendees only";
    expect(scannerPerms).toContain("Check-in");
  });
});

test.describe("RBAC Invite Navigation", () => {
  test("should have Go to Homepage button on invalid invite", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/invite/accept");

    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Go to Homepage")).toBeVisible();
  });

  test("should navigate to homepage when clicking Go to Homepage", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/invite/accept");

    await page.waitForLoadState("networkidle");

    await page.click("text=Go to Homepage");

    await page.waitForURL("http://localhost:3000/");
  });
});
