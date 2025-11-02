import { describe, it, expect } from "vitest";
import { renderEmailTemplate } from "../templates/email";
import { renderSmsTemplate } from "../templates/sms";
import { renderPushTemplate } from "../templates/push";

describe("Email Templates", () => {
  it("should render booking_confirmed template", () => {
    const result = renderEmailTemplate("booking_confirmed", {
      userName: "John Doe",
      eventTitle: "Test Event",
      eventDate: "2025-03-15",
      eventVenue: "Test Venue",
      seats: 2,
      ticketNumber: "TIX123",
      finalAmount: 1000,
    });

    expect(result.subject).toContain("Test Event");
    expect(result.html).toContain("John Doe");
    expect(result.html).toContain("TIX123");
    expect(result.text).toContain("John Doe");
  });

  it("should render event_reminder_T24 template", () => {
    const result = renderEmailTemplate("event_reminder_T24", {
      userName: "John Doe",
      eventTitle: "Test Event",
      eventDate: "2025-03-15",
      eventVenue: "Test Venue",
      ticketNumber: "TIX123",
    });

    expect(result.subject).toContain("Tomorrow");
    expect(result.html).toContain("tomorrow");
    expect(result.text).toContain("tomorrow");
  });

  it("should throw error for unknown template", () => {
    expect(() => {
      renderEmailTemplate("unknown_template", {});
    }).toThrow("Unknown email template type");
  });
});

describe("SMS Templates", () => {
  it("should render booking_confirmed template", () => {
    const result = renderSmsTemplate("booking_confirmed", {
      eventTitle: "Test Event",
      eventDate: "2025-03-15",
      ticketNumber: "TIX123",
    });

    expect(result.body).toContain("Test Event");
    expect(result.body).toContain("TIX123");
  });

  it("should render event_reminder_T2 template", () => {
    const result = renderSmsTemplate("event_reminder_T2", {
      eventTitle: "Test Event",
      eventVenue: "Test Venue",
    });

    expect(result.body).toContain("2 hours");
    expect(result.body).toContain("Test Event");
  });

  it("should throw error for unknown template", () => {
    expect(() => {
      renderSmsTemplate("unknown_template", {});
    }).toThrow("Unknown SMS template type");
  });
});

describe("Push Templates", () => {
  it("should render booking_confirmed template", () => {
    const result = renderPushTemplate("booking_confirmed", {
      eventTitle: "Test Event",
      ticketNumber: "TIX123",
    });

    expect(result.title).toBe("Booking Confirmed!");
    expect(result.body).toContain("Test Event");
    expect(result.data?.type).toBe("booking_confirmed");
  });

  it("should render event_reminder_T24 template", () => {
    const result = renderPushTemplate("event_reminder_T24", {
      eventTitle: "Test Event",
      eventDate: "2025-03-15",
    });

    expect(result.title).toBe("Event Tomorrow!");
    expect(result.body).toContain("tomorrow");
  });

  it("should throw error for unknown template", () => {
    expect(() => {
      renderPushTemplate("unknown_template", {});
    }).toThrow("Unknown push template type");
  });
});
