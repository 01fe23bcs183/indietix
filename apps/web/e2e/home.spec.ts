import { test, expect } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("IndieTix Web OK")).toBeVisible();
});

test("health endpoint returns ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data).toEqual({ ok: true });
});
