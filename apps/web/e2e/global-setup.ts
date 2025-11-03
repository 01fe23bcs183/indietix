import { chromium, FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/auth/signin`);

  const testEmail = process.env.E2E_TEST_EMAIL || "customer1@example.com";
  const testPassword = process.env.E2E_TEST_PASSWORD || "password123";

  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  await page.click('button[type="submit"]');

  await page.waitForURL(`${baseURL}/`, { timeout: 10000 });

  await page.context().storageState({ path: storageState as string });

  await browser.close();
}

export default globalSetup;
