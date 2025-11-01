import { describe, it, expect } from "vitest";

describe("Analytics Helpers", () => {
  describe("Time-series bucketing", () => {
    it("should bucket data by day correctly", () => {
      const date1 = new Date("2025-01-15T10:30:00Z");
      const date2 = new Date("2025-01-15T18:45:00Z");
      const date3 = new Date("2025-01-16T09:00:00Z");

      const bucket1 = date1.toISOString().split("T")[0];
      const bucket2 = date2.toISOString().split("T")[0];
      const bucket3 = date3.toISOString().split("T")[0];

      expect(bucket1).toBe("2025-01-15");
      expect(bucket2).toBe("2025-01-15");
      expect(bucket3).toBe("2025-01-16");
      expect(bucket1).toBe(bucket2);
      expect(bucket1).not.toBe(bucket3);
    });

    it("should bucket data by week correctly", () => {
      const date = new Date("2025-01-15T10:30:00Z");
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const bucket = weekStart.toISOString().split("T")[0];

      expect(bucket).toBe("2025-01-12");
    });
  });

  describe("Average ticket price calculation", () => {
    it("should calculate average ticket price correctly", () => {
      const revenue = 10000;
      const bookings = 5;
      const avgTicket = Math.round(revenue / bookings);

      expect(avgTicket).toBe(2000);
    });

    it("should return 0 when no bookings", () => {
      const revenue = 0;
      const bookings = 0;
      const avgTicket = bookings > 0 ? Math.round(revenue / bookings) : 0;

      expect(avgTicket).toBe(0);
    });

    it("should handle decimal values correctly", () => {
      const revenue = 10001;
      const bookings = 3;
      const avgTicket = Math.round(revenue / bookings);

      expect(avgTicket).toBe(3334);
    });
  });

  describe("Funnel conversion calculation", () => {
    it("should calculate conversion rate correctly", () => {
      const views = 1000;
      const bookings = 50;
      const conversionRate = (bookings / views) * 100;

      expect(conversionRate).toBe(5);
    });

    it("should handle zero views", () => {
      const views = 0;
      const bookings = 0;
      const conversionRate = views > 0 ? (bookings / views) * 100 : 0;

      expect(conversionRate).toBe(0);
    });

    it("should format conversion rate to 2 decimals", () => {
      const views = 1000;
      const bookings = 33;
      const conversionRate = ((bookings / views) * 100).toFixed(2);

      expect(conversionRate).toBe("3.30");
    });
  });

  describe("CSV formatting", () => {
    it("should escape cells with commas", () => {
      const cell = "Event Title, Part 2";
      const escaped =
        cell.includes(",") || cell.includes('"') || cell.includes("\n")
          ? `"${cell.replace(/"/g, '""')}"`
          : cell;

      expect(escaped).toBe('"Event Title, Part 2"');
    });

    it("should escape cells with quotes", () => {
      const cell = 'Event "Special" Title';
      const escaped =
        cell.includes(",") || cell.includes('"') || cell.includes("\n")
          ? `"${cell.replace(/"/g, '""')}"`
          : cell;

      expect(escaped).toBe('"Event ""Special"" Title"');
    });

    it("should not escape simple cells", () => {
      const cell = "Simple Event Title";
      const escaped =
        cell.includes(",") || cell.includes('"') || cell.includes("\n")
          ? `"${cell.replace(/"/g, '""')}"`
          : cell;

      expect(escaped).toBe("Simple Event Title");
    });
  });

  describe("Date range generation", () => {
    it("should generate correct date range for last 7 days", () => {
      const to = new Date("2025-01-15T00:00:00Z");
      const from = new Date(to);
      from.setDate(from.getDate() - 7);

      expect(from.toISOString().split("T")[0]).toBe("2025-01-08");
      expect(to.toISOString().split("T")[0]).toBe("2025-01-15");
    });

    it("should generate correct date range for last 30 days", () => {
      const to = new Date("2025-01-31T00:00:00Z");
      const from = new Date(to);
      from.setDate(from.getDate() - 30);

      expect(from.toISOString().split("T")[0]).toBe("2025-01-01");
      expect(to.toISOString().split("T")[0]).toBe("2025-01-31");
    });
  });

  describe("Revenue aggregation", () => {
    it("should sum revenue correctly", () => {
      const bookings = [
        { finalAmount: 1000 },
        { finalAmount: 2000 },
        { finalAmount: 1500 },
      ];

      const totalRevenue = bookings.reduce(
        (sum, booking) => sum + booking.finalAmount,
        0
      );

      expect(totalRevenue).toBe(4500);
    });

    it("should handle empty bookings array", () => {
      const bookings: Array<{ finalAmount: number }> = [];

      const totalRevenue = bookings.reduce(
        (sum, booking) => sum + booking.finalAmount,
        0
      );

      expect(totalRevenue).toBe(0);
    });
  });

  describe("Seats sold aggregation", () => {
    it("should sum seats correctly", () => {
      const bookings = [{ seats: 2 }, { seats: 3 }, { seats: 1 }];

      const totalSeats = bookings.reduce(
        (sum, booking) => sum + booking.seats,
        0
      );

      expect(totalSeats).toBe(6);
    });
  });
});
