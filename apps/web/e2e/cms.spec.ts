import { test, expect } from "@playwright/test";

test.describe("CMS Content Blocks", () => {
  test("homepage renders with default content when no blocks exist", async ({ page }) => {
    await page.goto("/");
    
    await expect(page.locator("h1")).toContainText("Discover Amazing Events");
    await expect(page.locator("text=Find and book tickets")).toBeVisible();
    await expect(page.locator("text=Browse Events").first()).toBeVisible();
  });

  test("homepage shows preview mode banner when in draft mode", async ({ page }) => {
    const token = Buffer.from(JSON.stringify({ key: "home.hero", exp: Date.now() + 3600000 })).toString("base64");
    await page.goto(`/api/preview?token=${token}&block=home.hero`);
    
    await expect(page.locator("text=Preview Mode Enabled")).toBeVisible();
  });

  test("preview API rejects invalid token", async ({ request }) => {
    const response = await request.get("/api/preview?token=invalid");
    expect(response.status()).toBe(401);
  });

  test("preview API rejects expired token", async ({ request }) => {
    const expiredToken = Buffer.from(JSON.stringify({ key: "home.hero", exp: Date.now() - 1000 })).toString("base64");
    const response = await request.get(`/api/preview?token=${expiredToken}`);
    expect(response.status()).toBe(401);
  });

  test("preview API rejects missing token", async ({ request }) => {
    const response = await request.get("/api/preview");
    expect(response.status()).toBe(401);
  });
});

test.describe("Blog Pages", () => {
  test("blog page renders with correct title", async ({ page }) => {
    await page.goto("/blog");
    
    await expect(page.locator("h1")).toContainText("Blog");
    await expect(page.locator("text=Read the latest news")).toBeVisible();
  });

  test("blog page shows empty state when no posts", async ({ page }) => {
    await page.goto("/blog");
    
    await expect(page.locator("text=No posts found")).toBeVisible();
  });

  test("blog page supports tag filtering via URL", async ({ page }) => {
    await page.goto("/blog?tag=news");
    
    await expect(page.locator("h1")).toContainText("Blog");
  });
});

test.describe("Help Center", () => {
  test("help page renders with correct title", async ({ page }) => {
    await page.goto("/help");
    
    await expect(page.locator("h1")).toContainText("Help Center");
    await expect(page.locator("text=Find answers to your questions")).toBeVisible();
  });

  test("help page has search functionality", async ({ page }) => {
    await page.goto("/help");
    
    const searchInput = page.locator('input[placeholder="Search for help..."]');
    await expect(searchInput).toBeVisible();
  });

  test("help page supports search via URL", async ({ page }) => {
    await page.goto("/help?q=booking");
    
    await expect(page.locator("h1")).toContainText("Help Center");
  });

  test("help page shows contact support section", async ({ page }) => {
    await page.goto("/help");
    
    await expect(page.locator("text=Still need help?")).toBeVisible();
    await expect(page.locator("text=Contact Support")).toBeVisible();
  });
});
