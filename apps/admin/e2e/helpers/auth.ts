import { Page } from "@playwright/test";

/**
 * Helper to sign in as admin user for E2E tests
 * Uses credentials from environment variables:
 * - E2E_ADMIN_EMAIL (required)
 * - E2E_ADMIN_PASSWORD (required)
 */
export async function signInAsAdmin(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set in environment"
    );
  }

  await page.goto("/auth/signin");

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  await page.click('button[type="submit"]');

  await page.waitForURL("/", { timeout: 10000 });
}
