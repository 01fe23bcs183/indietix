import { describe, it, expect, beforeEach } from "vitest";
import {
  evaluateRule,
  type RuleDefinition,
  type EvaluationContext,
} from "../engine";

describe("Fraud Engine", () => {
  let mockContext: EvaluationContext;

  beforeEach(() => {
    mockContext = {
      signals: {
        eventId: "event-1",
        userId: "user-1",
        ip: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        city: "Mumbai",
        emailDomain: "example.com",
        phonePrefix: "+91",
        qty: 2,
        eventPrice: 1000,
        userSignupAgeDays: 30,
      },
      velocityByIp: 3,
      velocityByUser: 2,
      blacklistedEmails: new Set(["spam.com", "fraud.com"]),
      blacklistedPhones: new Set(["+99"]),
      blacklistedIps: new Set(["10.0.0.1"]),
      failedPaymentsByUser: 1,
    };
  });

  describe("velocity_ip rule", () => {
    it("should match when IP velocity exceeds threshold", () => {
      const rule: RuleDefinition = {
        type: "velocity_ip",
        threshold: 2,
        minutes: 10,
      };
      expect(evaluateRule(rule, mockContext)).toBe(true);
    });

    it("should not match when IP velocity is below threshold", () => {
      const rule: RuleDefinition = {
        type: "velocity_ip",
        threshold: 5,
        minutes: 10,
      };
      expect(evaluateRule(rule, mockContext)).toBe(false);
    });
  });

  describe("velocity_user rule", () => {
    it("should match when user velocity exceeds threshold", () => {
      const rule: RuleDefinition = {
        type: "velocity_user",
        threshold: 1,
        minutes: 10,
      };
      expect(evaluateRule(rule, mockContext)).toBe(true);
    });

    it("should not match when user velocity is below threshold", () => {
      const rule: RuleDefinition = {
        type: "velocity_user",
        threshold: 5,
        minutes: 10,
      };
      expect(evaluateRule(rule, mockContext)).toBe(false);
    });
  });

  describe("email_domain_blacklist rule", () => {
    it("should match when email domain is blacklisted", () => {
      mockContext.signals.emailDomain = "spam.com";
      const rule: RuleDefinition = {
        type: "email_domain_blacklist",
      };
      expect(evaluateRule(rule, mockContext)).toBe(true);
    });

    it("should not match when email domain is not blacklisted", () => {
      mockContext.signals.emailDomain = "example.com";
      const rule: RuleDefinition = {
        type: "email_domain_blacklist",
      };
      expect(evaluateRule(rule, mockContext)).toBe(false);
    });

    it("should not match when email domain is missing", () => {
      mockContext.signals.emailDomain = undefined;
      const rule: RuleDefinition = {
        type: "email_domain_blacklist",
      };
      expect(evaluateRule(rule, mockContext)).toBe(false);
    });
  });

  describe("phone_prefix_blacklist rule", () => {
    it("should match when phone prefix is blacklisted", () => {
      mockContext.signals.phonePrefix = "+99";
      const rule: RuleDefinition = {
        type: "phone_prefix_blacklist",
      };
      expect(evaluateRule(rule, mockContext)).toBe(true);
    });

    it("should not match when phone prefix is not blacklisted", () => {
      mockContext.signals.phonePrefix = "+91";
      const rule: RuleDefinition = {
        type: "phone_prefix_blacklist",
      };
      expect(evaluateRule(rule, mockContext)).toBe(false);
    });
  });

  describe("ip_blacklist rule", () => {
    it("should match when IP is blacklisted", () => {
      mockContext.signals.ip = "10.0.0.1";
      const rule: RuleDefinition = {
        type: "ip_blacklist",
      };
      expect(evaluateRule(rule, mockContext)).toBe(true);
    });

    it("should not match when IP is not blacklisted", () => {
      mockContext.signals.ip = "192.168.1.1";
      const rule: RuleDefinition = {
        type: "ip_blacklist",
      };
      expect(evaluateRule(rule, mockContext)).toBe(false);
    });
  });

  describe("qty_threshold rule", () => {
    it("should match when quantity exceeds threshold", () => {
      mockContext.signals.qty = 15;
      const rule: RuleDefinition = {
        type: "qty_threshold",
        threshold: 10,
      };
      expect(evaluateRule(rule, mockContext)).toBe(true);
    });

    it("should not match when quantity is below threshold", () => {
      mockContext.signals.qty = 5;
      const rule: RuleDefinition = {
        type: "qty_threshold",
        threshold: 10,
      };
      expect(evaluateRule(rule, mockContext)).toBe(false);
    });
  });

  describe("high_value_new_user rule", () => {
    it("should match when high price event and new user", () => {
      mockContext.signals.eventPrice = 6000;
      mockContext.signals.userSignupAgeDays = 3;
      const rule: RuleDefinition = {
        type: "high_value_new_user",
        priceThreshold: 5000,
        ageThreshold: 7,
      };
      expect(evaluateRule(rule, mockContext)).toBe(true);
    });

    it("should not match when price is below threshold", () => {
      mockContext.signals.eventPrice = 3000;
      mockContext.signals.userSignupAgeDays = 3;
      const rule: RuleDefinition = {
        type: "high_value_new_user",
        priceThreshold: 5000,
        ageThreshold: 7,
      };
      expect(evaluateRule(rule, mockContext)).toBe(false);
    });

    it("should not match when user is not new", () => {
      mockContext.signals.eventPrice = 6000;
      mockContext.signals.userSignupAgeDays = 30;
      const rule: RuleDefinition = {
        type: "high_value_new_user",
        priceThreshold: 5000,
        ageThreshold: 7,
      };
      expect(evaluateRule(rule, mockContext)).toBe(false);
    });
  });

  describe("repeated_failed_payments rule", () => {
    it("should match when failed payments exceed threshold", () => {
      mockContext.failedPaymentsByUser = 4;
      const rule: RuleDefinition = {
        type: "repeated_failed_payments",
        threshold: 3,
      };
      expect(evaluateRule(rule, mockContext)).toBe(true);
    });

    it("should not match when failed payments are below threshold", () => {
      mockContext.failedPaymentsByUser = 1;
      const rule: RuleDefinition = {
        type: "repeated_failed_payments",
        threshold: 3,
      };
      expect(evaluateRule(rule, mockContext)).toBe(false);
    });
  });

  describe("unknown rule type", () => {
    it("should return false for unknown rule types", () => {
      const rule: RuleDefinition = {
        type: "unknown_rule_type",
      };
      expect(evaluateRule(rule, mockContext)).toBe(false);
    });
  });
});
