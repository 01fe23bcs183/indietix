import { describe, it, expect } from "vitest";
import {
  EARNING_RULES,
  getEarningRule,
  getEarningDelta,
  STREAK_THRESHOLD,
  EARLY_BIRD_DAYS_BEFORE,
  REFERRAL_MAX_PER_MONTH,
} from "../rules";

describe("Earning Rules", () => {
  describe("EARNING_RULES", () => {
    it("should have all required earning rules", () => {
      const requiredRules = [
        "BOOK",
        "ATTEND",
        "REFERRAL",
        "REVIEW",
        "EARLY_BIRD",
        "PROFILE",
        "SHARE",
        "STREAK",
        "LOW_SALES_HELP",
      ];

      for (const rule of requiredRules) {
        expect(EARNING_RULES[rule]).toBeDefined();
      }
    });

    it("should have correct karma values", () => {
      expect(EARNING_RULES.BOOK.delta).toBe(10);
      expect(EARNING_RULES.ATTEND.delta).toBe(50);
      expect(EARNING_RULES.REFERRAL.delta).toBe(100);
      expect(EARNING_RULES.REVIEW.delta).toBe(20);
      expect(EARNING_RULES.EARLY_BIRD.delta).toBe(30);
      expect(EARNING_RULES.PROFILE.delta).toBe(50);
      expect(EARNING_RULES.SHARE.delta).toBe(10);
      expect(EARNING_RULES.STREAK.delta).toBe(200);
      expect(EARNING_RULES.LOW_SALES_HELP.delta).toBe(40);
    });

    it("should require attendance for REVIEW", () => {
      expect(EARNING_RULES.REVIEW.requiresAttendance).toBe(true);
    });

    it("should have max per month for REFERRAL", () => {
      expect(EARNING_RULES.REFERRAL.maxPerMonth).toBe(5);
    });
  });

  describe("getEarningRule", () => {
    it("should return the correct rule for a valid reason", () => {
      const rule = getEarningRule("BOOK");
      expect(rule).toBeDefined();
      expect(rule?.delta).toBe(10);
    });

    it("should return undefined for an invalid reason", () => {
      const rule = getEarningRule("INVALID" as never);
      expect(rule).toBeUndefined();
    });
  });

  describe("getEarningDelta", () => {
    it("should return the correct delta for a valid reason", () => {
      expect(getEarningDelta("BOOK")).toBe(10);
      expect(getEarningDelta("ATTEND")).toBe(50);
      expect(getEarningDelta("STREAK")).toBe(200);
    });

    it("should return 0 for an invalid reason", () => {
      expect(getEarningDelta("INVALID" as never)).toBe(0);
    });
  });

  describe("Constants", () => {
    it("should have correct streak threshold", () => {
      expect(STREAK_THRESHOLD).toBe(5);
    });

    it("should have correct early bird days", () => {
      expect(EARLY_BIRD_DAYS_BEFORE).toBe(7);
    });

    it("should have correct referral max per month", () => {
      expect(REFERRAL_MAX_PER_MONTH).toBe(5);
    });
  });
});
