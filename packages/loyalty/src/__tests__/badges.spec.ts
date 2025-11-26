import { describe, it, expect } from "vitest";
import {
  BADGE_DEFINITIONS,
  getBadgeDefinition,
  getBadgesByCategory,
  getAllBadges,
} from "../badges";

describe("Badge Definitions", () => {
  describe("BADGE_DEFINITIONS", () => {
    it("should have badges for all categories", () => {
      const categories = new Set(BADGE_DEFINITIONS.map((b) => b.category));
      expect(categories.has("BOOKINGS")).toBe(true);
      expect(categories.has("ATTENDANCE")).toBe(true);
      expect(categories.has("KARMA")).toBe(true);
    });

    it("should have unique keys", () => {
      const keys = BADGE_DEFINITIONS.map((b) => b.key);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it("should have required fields for all badges", () => {
      for (const badge of BADGE_DEFINITIONS) {
        expect(badge.key).toBeDefined();
        expect(badge.name).toBeDefined();
        expect(badge.description).toBeDefined();
        expect(badge.icon).toBeDefined();
        expect(badge.threshold).toBeDefined();
        expect(badge.category).toBeDefined();
      }
    });
  });

  describe("getBadgeDefinition", () => {
    it("should return the correct badge for a valid key", () => {
      const badge = getBadgeDefinition("FIRST_BOOKING");
      expect(badge).toBeDefined();
      expect(badge?.name).toBe("First Timer");
    });

    it("should return undefined for an invalid key", () => {
      const badge = getBadgeDefinition("INVALID");
      expect(badge).toBeUndefined();
    });
  });

  describe("getBadgesByCategory", () => {
    it("should return only booking badges for BOOKINGS category", () => {
      const badges = getBadgesByCategory("BOOKINGS");
      expect(badges.length).toBeGreaterThan(0);
      for (const badge of badges) {
        expect(badge.category).toBe("BOOKINGS");
      }
    });

    it("should return only attendance badges for ATTENDANCE category", () => {
      const badges = getBadgesByCategory("ATTENDANCE");
      expect(badges.length).toBeGreaterThan(0);
      for (const badge of badges) {
        expect(badge.category).toBe("ATTENDANCE");
      }
    });

    it("should return only karma badges for KARMA category", () => {
      const badges = getBadgesByCategory("KARMA");
      expect(badges.length).toBeGreaterThan(0);
      for (const badge of badges) {
        expect(badge.category).toBe("KARMA");
      }
    });
  });

  describe("getAllBadges", () => {
    it("should return all badges", () => {
      const badges = getAllBadges();
      expect(badges).toHaveLength(BADGE_DEFINITIONS.length);
    });
  });

  describe("Badge thresholds", () => {
    it("should have increasing thresholds for booking badges", () => {
      const bookingBadges = getBadgesByCategory("BOOKINGS")
        .filter(
          (b) => b.key.startsWith("BOOKINGS_") || b.key === "FIRST_BOOKING"
        )
        .sort((a, b) => a.threshold - b.threshold);

      for (let i = 1; i < bookingBadges.length; i++) {
        expect(bookingBadges[i].threshold).toBeGreaterThan(
          bookingBadges[i - 1].threshold
        );
      }
    });

    it("should have increasing thresholds for karma badges", () => {
      const karmaBadges = getBadgesByCategory("KARMA")
        .filter((b) => b.key.startsWith("KARMA_"))
        .sort((a, b) => a.threshold - b.threshold);

      for (let i = 1; i < karmaBadges.length; i++) {
        expect(karmaBadges[i].threshold).toBeGreaterThan(
          karmaBadges[i - 1].threshold
        );
      }
    });
  });
});
