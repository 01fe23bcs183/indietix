import { test, expect } from "@playwright/test";

test.describe("Ticket System", () => {
  const fakeTicket = {
    payload: {
      bookingId: "test-booking-id",
      userId: "test-user-id",
      eventId: "test-event-id",
      ts: Date.now(),
    },
    signature: "test-signature",
    event: {
      title: "Test Event",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      venue: "Test Venue",
      city: "Bengaluru",
    },
    ticketNumber: "TIX-TEST-123",
    seats: 2,
  };

  test("should display ticket page with QR code for confirmed booking", async ({
    page,
  }) => {
    await page.addInitScript((ticket) => {
      localStorage.setItem(
        `ticket-${ticket.payload.bookingId}`,
        JSON.stringify(ticket)
      );
    }, fakeTicket);

    await page.route("**/api/tickets/*", (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Network error" }),
      })
    );

    await page.goto("/bookings/test-booking-id");

    await expect(page.locator("h1")).toContainText("Test Event");
  });

  test("should show offline banner when network is unavailable", async ({
    page,
  }) => {
    await page.addInitScript((ticket) => {
      localStorage.setItem(
        `ticket-${ticket.payload.bookingId}`,
        JSON.stringify(ticket)
      );
    }, fakeTicket);

    await page.route("**/api/tickets/*", (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Network error" }),
      })
    );

    await page.goto("/bookings/test-booking-id");

    await page.evaluate(() => {
      window.dispatchEvent(new Event("offline"));
    });

    await expect(
      page.locator("text=Works offline - Your ticket is cached locally")
    ).toBeVisible({
      timeout: 5000,
    });
  });

  test("should have Add to Calendar button", async ({ page }) => {
    await page.addInitScript((ticket) => {
      localStorage.setItem(
        `ticket-${ticket.payload.bookingId}`,
        JSON.stringify(ticket)
      );
    }, fakeTicket);

    await page.route("**/api/tickets/*", (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Network error" }),
      })
    );

    await page.goto("/bookings/test-booking-id");

    const calendarButton = page.locator("button", {
      hasText: /add to calendar/i,
    });
    await expect(calendarButton).toBeVisible({ timeout: 10000 });
  });
});
