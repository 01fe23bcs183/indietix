import { describe, it, expect } from "vitest";
import {
  validatePromoCode,
  calculateDiscount,
  applyPromo,
  formatPromoCode,
} from "../discounts";
import type { PromoCode } from "@prisma/client";

describe("Discount Utilities", () => {
  const basePromoCode: PromoCode = {
    id: "promo1",
    code: "TEST20",
    type: "PERCENT",
    value: 20,
    startAt: null,
    endAt: null,
    usageLimit: null,
    perUserLimit: null,
    minPrice: null,
    organizerId: null,
    applicableEvents: [],
    applicableCategories: [],
    applicableCities: [],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("validatePromoCode", () => {
    it("should validate active promo code", () => {
      const result = validatePromoCode({
        code: basePromoCode,
        basePrice: 50000,
        quantity: 2,
        now: new Date(),
      });

      expect(result.valid).toBe(true);
    });

    it("should reject inactive promo code", () => {
      const inactiveCode = { ...basePromoCode, active: false };
      const result = validatePromoCode({
        code: inactiveCode,
        basePrice: 50000,
        quantity: 2,
        now: new Date(),
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Promo code is inactive");
    });

    it("should reject promo code not yet valid", () => {
      const futureCode = {
        ...basePromoCode,
        startAt: new Date("2025-12-01"),
      };
      const result = validatePromoCode({
        code: futureCode,
        basePrice: 50000,
        quantity: 2,
        now: new Date("2025-11-01"),
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Promo code not yet valid");
    });

    it("should reject expired promo code", () => {
      const expiredCode = {
        ...basePromoCode,
        endAt: new Date("2025-10-31"),
      };
      const result = validatePromoCode({
        code: expiredCode,
        basePrice: 50000,
        quantity: 2,
        now: new Date("2025-11-01"),
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Promo code has expired");
    });

    it("should reject if minimum price not met", () => {
      const minPriceCode = { ...basePromoCode, minPrice: 100000 };
      const result = validatePromoCode({
        code: minPriceCode,
        basePrice: 50000,
        quantity: 2,
        now: new Date(),
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Minimum ticket price");
    });

    it("should reject if per-user limit reached", () => {
      const limitedCode = { ...basePromoCode, perUserLimit: 2 };
      const result = validatePromoCode({
        code: limitedCode,
        basePrice: 50000,
        quantity: 2,
        now: new Date(),
        userId: "user1",
        userUsageCount: 2,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("usage limit");
    });

    it("should reject if event not in applicable events", () => {
      const eventSpecificCode = {
        ...basePromoCode,
        applicableEvents: ["event1", "event2"],
      };
      const result = validatePromoCode({
        code: eventSpecificCode,
        basePrice: 50000,
        quantity: 2,
        now: new Date(),
        eventId: "event3",
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("not applicable to this event");
    });

    it("should reject if category not in applicable categories", () => {
      const categorySpecificCode = {
        ...basePromoCode,
        applicableCategories: ["COMEDY", "MUSIC"],
      };
      const result = validatePromoCode({
        code: categorySpecificCode,
        basePrice: 50000,
        quantity: 2,
        now: new Date(),
        eventCategory: "SPORTS",
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("not applicable to this event category");
    });

    it("should reject if city not in applicable cities", () => {
      const citySpecificCode = {
        ...basePromoCode,
        applicableCities: ["Bengaluru", "Mumbai"],
      };
      const result = validatePromoCode({
        code: citySpecificCode,
        basePrice: 50000,
        quantity: 2,
        now: new Date(),
        eventCity: "Delhi",
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("not applicable to this city");
    });
  });

  describe("calculateDiscount", () => {
    it("should calculate percentage discount correctly", () => {
      const percentCode = { ...basePromoCode, type: "PERCENT" as const, value: 20 };
      const discount = calculateDiscount(percentCode, 100000);

      expect(discount).toBe(20000); // 20% of 100000
    });

    it("should calculate flat discount correctly", () => {
      const flatCode = { ...basePromoCode, type: "FLAT" as const, value: 5000 };
      const discount = calculateDiscount(flatCode, 100000);

      expect(discount).toBe(5000);
    });

    it("should not exceed subtotal for flat discount", () => {
      const flatCode = { ...basePromoCode, type: "FLAT" as const, value: 150000 };
      const discount = calculateDiscount(flatCode, 100000);

      expect(discount).toBe(100000); // Capped at subtotal
    });
  });

  describe("applyPromo", () => {
    it("should apply valid promo code and return discounted subtotal", () => {
      const result = applyPromo({
        code: basePromoCode,
        basePrice: 50000,
        quantity: 2,
        now: new Date(),
      });

      expect(result.success).toBe(true);
      expect(result.discountedSubtotal).toBe(80000); // 100000 - 20%
      expect(result.discountAmount).toBe(20000);
    });

    it("should return error for invalid promo code", () => {
      const inactiveCode = { ...basePromoCode, active: false };
      const result = applyPromo({
        code: inactiveCode,
        basePrice: 50000,
        quantity: 2,
        now: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("Promo code is inactive");
    });

    it("should apply flat discount correctly", () => {
      const flatCode = { ...basePromoCode, type: "FLAT" as const, value: 5000 };
      const result = applyPromo({
        code: flatCode,
        basePrice: 50000,
        quantity: 2,
        now: new Date(),
      });

      expect(result.success).toBe(true);
      expect(result.discountedSubtotal).toBe(95000); // 100000 - 5000
      expect(result.discountAmount).toBe(5000);
    });
  });

  describe("formatPromoCode", () => {
    it("should format percentage promo code", () => {
      const formatted = formatPromoCode(basePromoCode);
      expect(formatted).toBe("20% OFF");
    });

    it("should format flat promo code", () => {
      const flatCode = { ...basePromoCode, type: "FLAT" as const, value: 5000 };
      const formatted = formatPromoCode(flatCode);
      expect(formatted).toBe("₹50 OFF");
    });
  });
});
