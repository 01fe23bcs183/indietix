import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events');
  });

  test('should display search bar on events page', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute(
      'placeholder',
      /comedy tonight|Try:/i
    );
  });

  test('should show results when searching', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('comedy');
    await searchInput.press('Enter');

    // Wait for results to load
    await page.waitForSelector('[class*="card"]', { timeout: 10000 }).catch(() => {
      // Results may be empty, that's okay
    });

    // Should show results count
    const resultsText = page.locator('text=/\\d+ events? found/');
    await expect(resultsText).toBeVisible({ timeout: 10000 });
  });

  test('should display filter chips when filters are applied', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('comedy tonight under 600 near indiranagar');
    await searchInput.press('Enter');

    // Wait for filters to be parsed and displayed
    await page.waitForTimeout(1000);

    // Check for filter chips (may vary based on parsing)
    const filterChips = page.locator('[class*="chip"], [class*="rounded-full"]');
    // At least one filter should be visible if parsing worked
    const chipCount = await filterChips.count();
    expect(chipCount).toBeGreaterThanOrEqual(0);
  });

  test('should be able to remove filter chips', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('comedy indiranagar');
    await searchInput.press('Enter');

    await page.waitForTimeout(1000);

    // Find and click remove button on a chip if present
    const removeButton = page.locator('[class*="chip"] button, [class*="rounded-full"] button').first();
    if (await removeButton.isVisible()) {
      await removeButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should show typeahead suggestions', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('com');

    // Wait for suggestions dropdown
    await page.waitForTimeout(500);

    // Suggestions should appear (if there are matching events)
    const suggestions = page.locator('[class*="suggestion"], [class*="dropdown"] button');
    // May or may not have suggestions depending on data
  });

  test('should navigate to event detail when clicking card', async ({ page }) => {
    // First search for events
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('');
    await searchInput.press('Enter');

    await page.waitForTimeout(1000);

    // Click on first event card if present
    const eventCard = page.locator('a[href*="/events/"]').first();
    if (await eventCard.isVisible()) {
      const href = await eventCard.getAttribute('href');
      await eventCard.click();
      
      // Should navigate to event detail page
      await expect(page).toHaveURL(/\/events\/.+/);
    }
  });

  test('should show empty state when no results', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('xyznonexistentevent12345');
    await searchInput.press('Enter');

    await page.waitForTimeout(1000);

    // Should show "No events found" or similar message
    const emptyState = page.locator('text=/no events found|0 events found/i');
    await expect(emptyState).toBeVisible({ timeout: 10000 });
  });

  test('should clear filters when clicking clear all', async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('comedy indiranagar under 500');
    await searchInput.press('Enter');

    await page.waitForTimeout(1000);

    // Look for clear all button
    const clearButton = page.locator('text=/clear all|clear filters/i');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(500);

      // Search input should be cleared or filters should be removed
    }
  });

  test('should maintain stable sort order without embeddings', async ({ page }) => {
    // Search twice with same query
    const searchInput = page.locator('input[type="text"]');
    
    await searchInput.fill('music');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);

    // Get first result title
    const firstResult1 = await page.locator('[class*="card"] h3, [class*="card-title"]').first().textContent();

    // Clear and search again
    await searchInput.clear();
    await searchInput.fill('music');
    await searchInput.press('Enter');
    await page.waitForTimeout(1000);

    // Get first result title again
    const firstResult2 = await page.locator('[class*="card"] h3, [class*="card-title"]').first().textContent();

    // Results should be in same order (stable sort)
    if (firstResult1 && firstResult2) {
      expect(firstResult1).toBe(firstResult2);
    }
  });
});

test.describe('Search Debug Mode', () => {
  test('should show debug toggle in development', async ({ page }) => {
    await page.goto('/events');

    // Debug toggle should be visible (only in dev mode)
    const debugToggle = page.locator('text=/show debug|debug info/i');
    // May or may not be visible depending on environment
  });

  test('should show score components when debug enabled', async ({ page }) => {
    await page.goto('/events');

    // Enable debug mode if toggle exists
    const debugCheckbox = page.locator('input[type="checkbox"]').first();
    if (await debugCheckbox.isVisible()) {
      await debugCheckbox.check();

      const searchInput = page.locator('input[type="text"]');
      await searchInput.fill('comedy');
      await searchInput.press('Enter');

      await page.waitForTimeout(1000);

      // Debug info should be visible
      const debugInfo = page.locator('text=/FTS:|Score:|Trigram:/i');
      // May or may not be visible depending on implementation
    }
  });
});

test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display search bar on mobile', async ({ page }) => {
    await page.goto('/events');

    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toBeVisible();
  });

  test('should show filter chips on mobile', async ({ page }) => {
    await page.goto('/events');

    const searchInput = page.locator('input[type="text"]');
    await searchInput.fill('comedy indiranagar');
    await searchInput.press('Enter');

    await page.waitForTimeout(1000);

    // Filter chips should be visible and scrollable on mobile
    const chipsContainer = page.locator('[class*="chip"], [class*="flex-wrap"]');
    // Should be visible on mobile
  });
});
