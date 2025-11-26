import { test, expect } from "@playwright/test";

test.describe("Events Listing Page", () => {
  test("should render events listing page", async ({ page }) => {
    await page.goto("http://localhost:3000/events");

    await expect(page.locator("h1")).toContainText("Discover Events");
  });

  test("should display seeded events", async ({ page }) => {
    await page.goto("http://localhost:3000/events");

    await page.waitForSelector('[href^="/events/"]', { timeout: 10000 });

    const eventCards = await page.locator('[href^="/events/"]').count();
    expect(eventCards).toBeGreaterThanOrEqual(8);
  });

  test("should filter events by city", async ({ page }) => {
    await page.goto("http://localhost:3000/events");

    await page.waitForSelector('[href^="/events/"]', { timeout: 10000 });

    await page.selectOption('select:has-text("All Cities")', "Bengaluru");

    await page.waitForTimeout(1000);

    const eventCards = await page.locator('[href^="/events/"]');
    const count = await eventCards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const card = eventCards.nth(i);
      await expect(card).toContainText("Bengaluru");
    }
  });

  test("should filter events by category", async ({ page }) => {
    await page.goto("http://localhost:3000/events");

    await page.waitForSelector('[href^="/events/"]', { timeout: 10000 });

    await page.selectOption('select:has-text("All Categories")', "COMEDY");

    await page.waitForTimeout(1000);

    const eventCards = await page.locator('[href^="/events/"]');
    const count = await eventCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should display event details on cards", async ({ page }) => {
    await page.goto("http://localhost:3000/events");

    await page.waitForSelector('[href^="/events/"]', { timeout: 10000 });

    const firstCard = page.locator('[href^="/events/"]').first();

    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator("text=/₹/")).toBeVisible();
    await expect(firstCard.locator("text=/seats left/")).toBeVisible();
  });
});

test.describe("Event Detail Page", () => {
  test("should render event detail page", async ({ page }) => {
    await page.goto("http://localhost:3000/events");

    await page.waitForSelector('[href^="/events/"]', { timeout: 10000 });

    const firstEventLink = page.locator('[href^="/events/"]').first();
    await firstEventLink.click();

    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toBeVisible();
  });

  test("should display transparent fee breakdown with correct labels", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000/events");

    await page.waitForSelector('[href^="/events/"]', { timeout: 10000 });

    const firstEventLink = page.locator('[href^="/events/"]').first();
    await firstEventLink.click();

    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Transparent Fee Breakdown")).toBeVisible();

    await expect(page.locator("text=Payment gateway")).toBeVisible();
    await expect(page.locator("text=Server maintenance")).toBeVisible();
    await expect(page.locator("text=Platform support")).toBeVisible();
    await expect(page.locator("text=/GST.*on fees/")).toBeVisible();
  });

  test("should NOT contain convenience fee wording", async ({ page }) => {
    await page.goto("http://localhost:3000/events");

    await page.waitForSelector('[href^="/events/"]', { timeout: 10000 });

    const firstEventLink = page.locator('[href^="/events/"]').first();
    await firstEventLink.click();

    await page.waitForLoadState("networkidle");

    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).not.toContain("convenience fee");
  });

  test("should calculate correct total for base price", async ({ page }) => {
    await page.goto("http://localhost:3000/events");

    await page.waitForSelector('[href^="/events/"]', { timeout: 10000 });

    const firstEventLink = page.locator('[href^="/events/"]').first();
    await firstEventLink.click();

    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Transparent Fee Breakdown")).toBeVisible();

    const totalElement = page.getByTestId("price-breakdown-total");
    await expect(totalElement).toBeVisible();
  });

  test("should display venue with map link", async ({ page }) => {
    await page.goto("http://localhost:3000/events");

    await page.waitForSelector('[href^="/events/"]', { timeout: 10000 });

    const firstEventLink = page.locator('[href^="/events/"]').first();
    await firstEventLink.click();

    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Venue")).toBeVisible();

    const mapLink = page.locator('a[href*="google.com/maps"]');
    await expect(mapLink).toBeVisible();
    await expect(mapLink).toContainText("View on Google Maps");
  });

  test("should display organizer card", async ({ page }) => {
    await page.goto("http://localhost:3000/events");

    await page.waitForSelector('[href^="/events/"]', { timeout: 10000 });

    const firstEventLink = page.locator('[href^="/events/"]').first();
    await firstEventLink.click();

    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Organizer")).toBeVisible();
  });

  test("should have seat selector from 1 to 10", async ({ page }) => {
    await page.goto("http://localhost:3000/events");

    await page.waitForSelector('[href^="/events/"]', { timeout: 10000 });

    const firstEventLink = page.locator('[href^="/events/"]').first();
    await firstEventLink.click();

    await page.waitForLoadState("networkidle");

    const seatSelector = page.locator('select:has-text("ticket")');
    await expect(seatSelector).toBeVisible();

    const options = await seatSelector.locator("option").count();
    expect(options).toBe(10);
  });

  test("should have Book Now button", async ({ page }) => {
    await page.goto("http://localhost:3000/events");

    await page.waitForSelector('[href^="/events/"]', { timeout: 10000 });

    const firstEventLink = page.locator('[href^="/events/"]').first();
    await firstEventLink.click();

    await page.waitForLoadState("networkidle");

    const bookButton = page.locator('button:has-text("Book Now")');
    await expect(bookButton).toBeVisible();
  });
});
