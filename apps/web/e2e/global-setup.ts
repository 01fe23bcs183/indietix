import { chromium } from "@playwright/test";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

async function globalSetup() {
  console.log("🔧 Setting up E2E test environment...");

  if (!process.env.CI) {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && !dbUrl.includes("USER:PASSWORD@HOST:PORT")) {
      console.log("📦 Setting up database...");
      try {
        execSync("pnpm --filter @indietix/db prisma:push", {
          stdio: "inherit",
          cwd: path.resolve(__dirname, "../../.."),
        });
        console.log("🌱 Seeding database...");
        execSync("pnpm exec tsx packages/db/prisma/seed.ts", {
          stdio: "inherit",
          cwd: path.resolve(__dirname, "../../.."),
        });
      } catch (error) {
        console.warn(
          "⚠️  Database setup failed (may already be set up):",
          error
        );
      }
    } else {
      console.log(
        "⚠️  DATABASE_URL not configured - skipping database setup. Tests may fail if database is not already set up."
      );
    }
  }

  const baseURL = process.env.BASE_URL || "http://localhost:3000";
  const storageState = ".auth/user.json";

  const authDir = path.dirname(storageState);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log("🔐 Authenticating test user...");
  await page.goto(`${baseURL}/auth/signin`);

  const testEmail = process.env.E2E_TEST_EMAIL || "customer1@example.com";
  const testPassword = process.env.E2E_TEST_PASSWORD || "password123";

  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  await page.click('button[type="submit"]');

  const url = page.url();
  if (url.includes("/api/auth/error")) {
    await browser.close();
    throw new Error(
      `Authentication failed - redirected to ${url}. Check AUTH_SECRET and database setup.`
    );
  }

  await page.waitForURL(`${baseURL}/`, { timeout: 10000 });

  await page.context().storageState({ path: storageState });

  console.log("✅ Authentication successful");
  await browser.close();
}

export default globalSetup;
