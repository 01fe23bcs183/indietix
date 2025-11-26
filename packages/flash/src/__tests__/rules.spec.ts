import { describe, it, expect } from "vitest";
import {
  calculateSellThrough,
  calculateTimeToStart,
  calculateDiscount,
  calculateMaxSeats,
  calculateMinFlashPrice,
  isInCooldown,
  evaluateFlashRules,
  DEFAULT_FLASH_CONFIG,
  type EventMetrics,
  type FlashRuleConfig,
} from "../rules";

describe("Flash Sales Rules", () => {
  describe("calculateSellThrough", () => {
    it("should return 0% for no bookings", () => {
      expect(calculateSellThrough(0, 100)).toBe(0);
    });

    it("should return 50% for half booked", () => {
      expect(calculateSellThrough(50, 100)).toBe(50);
    });

    it("should return 100% for fully booked", () => {
      expect(calculateSellThrough(100, 100)).toBe(100);
    });

    it("should return 100% for zero total seats", () => {
      expect(calculateSellThrough(0, 0)).toBe(100);
    });
  });

  describe("calculateTimeToStart", () => {
    it("should return positive hours for future event", () => {
      const now = new Date("2025-01-01T10:00:00Z");
      const eventDate = new Date("2025-01-01T16:00:00Z");
      expect(calculateTimeToStart(eventDate, now)).toBe(6);
    });

    it("should return negative hours for past event", () => {
      const now = new Date("2025-01-01T16:00:00Z");
      const eventDate = new Date("2025-01-01T10:00:00Z");
      expect(calculateTimeToStart(eventDate, now)).toBe(-6);
    });

    it("should return 0 for current time", () => {
      const now = new Date("2025-01-01T10:00:00Z");
      expect(calculateTimeToStart(now, now)).toBe(0);
    });
  });

  describe("calculateDiscount", () => {
    const config = DEFAULT_FLASH_CONFIG;

    it("should return minimum discount for low urgency", () => {
      const discount = calculateDiscount(6, 45, config);
      expect(discount).toBeGreaterThanOrEqual(config.minDiscount);
      expect(discount).toBeLessThanOrEqual(config.maxDiscount);
    });

    it("should return higher discount for high urgency", () => {
      const lowUrgencyDiscount = calculateDiscount(6, 45, config);
      const highUrgencyDiscount = calculateDiscount(1, 10, config);
      expect(highUrgencyDiscount).toBeGreaterThan(lowUrgencyDiscount);
    });

    it("should clamp to max discount", () => {
      const discount = calculateDiscount(0.1, 1, config);
      expect(discount).toBeLessThanOrEqual(config.maxDiscount);
    });
  });

  describe("calculateMaxSeats", () => {
    const config = DEFAULT_FLASH_CONFIG;

    it("should return 50% of remaining seats by default", () => {
      expect(calculateMaxSeats(100, config)).toBe(50);
    });

    it("should return at least 1 seat", () => {
      expect(calculateMaxSeats(1, config)).toBe(1);
    });

    it("should handle custom inventory cap", () => {
      const customConfig = { ...config, maxInventoryCap: 25 };
      expect(calculateMaxSeats(100, customConfig)).toBe(25);
    });
  });

  describe("calculateMinFlashPrice", () => {
    it("should return discounted price when above minimum", () => {
      const result = calculateMinFlashPrice(10000, 20, 0);
      expect(result).toBe(8000);
    });

    it("should return config minimum when discounted price is below", () => {
      const result = calculateMinFlashPrice(10000, 50, 6000);
      expect(result).toBe(6000);
    });
  });

  describe("isInCooldown", () => {
    it("should return false when no previous flash sale", () => {
      const now = new Date();
      expect(isInCooldown(undefined, now, 24)).toBe(false);
    });

    it("should return true when within cooldown period", () => {
      const now = new Date("2025-01-01T12:00:00Z");
      const lastSale = new Date("2025-01-01T10:00:00Z");
      expect(isInCooldown(lastSale, now, 24)).toBe(true);
    });

    it("should return false when outside cooldown period", () => {
      const now = new Date("2025-01-02T12:00:00Z");
      const lastSale = new Date("2025-01-01T10:00:00Z");
      expect(isInCooldown(lastSale, now, 24)).toBe(false);
    });
  });

  describe("evaluateFlashRules", () => {
    const baseMetrics: EventMetrics = {
      eventId: "event-1",
      totalSeats: 100,
      bookedSeats: 30,
      eventDate: new Date("2025-01-01T16:00:00Z"),
      basePrice: 100000, // 1000 INR in paise
      city: "Mumbai",
      venue: "Test Venue",
      recentBookings: 2,
    };

    it("should trigger flash sale for underperforming event", () => {
      const now = new Date("2025-01-01T12:00:00Z"); // 4 hours before event
      const result = evaluateFlashRules(baseMetrics, now);

      expect(result.shouldTrigger).toBe(true);
      expect(result.suggestedDiscount).toBeGreaterThanOrEqual(20);
      expect(result.suggestedDiscount).toBeLessThanOrEqual(40);
      expect(result.suggestedMaxSeats).toBe(35); // 50% of 70 remaining
    });

    it("should not trigger for event with good sell-through", () => {
      const now = new Date("2025-01-01T12:00:00Z");
      const metrics = { ...baseMetrics, bookedSeats: 60 };
      const result = evaluateFlashRules(metrics, now);

      expect(result.shouldTrigger).toBe(false);
      expect(result.reason).toContain("Sell-through is good");
    });

    it("should not trigger for event too far in future", () => {
      const now = new Date("2025-01-01T06:00:00Z"); // 10 hours before event
      const result = evaluateFlashRules(baseMetrics, now);

      expect(result.shouldTrigger).toBe(false);
      expect(result.reason).toContain("Too far from event start");
    });

    it("should not trigger for event too close to start", () => {
      const now = new Date("2025-01-01T15:30:00Z"); // 30 minutes before event
      const result = evaluateFlashRules(baseMetrics, now);

      expect(result.shouldTrigger).toBe(false);
      expect(result.reason).toContain("Too close to event start");
    });

    it("should not trigger for past event", () => {
      const now = new Date("2025-01-01T17:00:00Z"); // 1 hour after event
      const result = evaluateFlashRules(baseMetrics, now);

      expect(result.shouldTrigger).toBe(false);
      expect(result.reason).toContain("already started or passed");
    });

    it("should not trigger during cooldown period", () => {
      const now = new Date("2025-01-01T12:00:00Z");
      const metrics = {
        ...baseMetrics,
        lastFlashSaleEndedAt: new Date("2025-01-01T10:00:00Z"),
      };
      const result = evaluateFlashRules(metrics, now);

      expect(result.shouldTrigger).toBe(false);
      expect(result.reason).toContain("cooldown period");
    });

    it("should not trigger for sold out event", () => {
      const now = new Date("2025-01-01T12:00:00Z");
      const metrics = { ...baseMetrics, bookedSeats: 100 };
      const result = evaluateFlashRules(metrics, now);

      expect(result.shouldTrigger).toBe(false);
    });

    it("should respect custom config", () => {
      const now = new Date("2025-01-01T12:00:00Z");
      const customConfig: FlashRuleConfig = {
        ...DEFAULT_FLASH_CONFIG,
        sellThroughThreshold: 20, // Lower threshold
      };
      const result = evaluateFlashRules(baseMetrics, now, customConfig);

      // 30% sell-through is above 20% threshold
      expect(result.shouldTrigger).toBe(false);
    });
  });
});
