import { chromium } from "@playwright/test";

async function globalSetup() {
  const baseURL = process.env.BASE_URL || "http://localhost:3000";
  const storageState = ".auth/user.json";

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/auth/signin`);

  const testEmail = process.env.E2E_TEST_EMAIL || "customer1@example.com";
  const testPassword = process.env.E2E_TEST_PASSWORD || "password123";

  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  await page.click('button[type="submit"]');

  await page.waitForURL(`${baseURL}/`, { timeout: 10000 });

  await page.context().storageState({ path: storageState });

  await browser.close();
}

export default globalSetup;
