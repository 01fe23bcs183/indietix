import { describe, it, expect, beforeEach } from "vitest";
import { generateIdempotencyKey } from "../idempotency";
import {
  getRateLimitForChannel,
  calculateBatchSize,
  tryConsumeToken,
  resetAllBuckets,
} from "../rate-limiter";
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  generateUnsubscribeUrl,
} from "../unsubscribe";
import { DEFAULT_RATE_LIMITS } from "../types";

describe("Idempotency", () => {
  describe("generateIdempotencyKey", () => {
    it("should generate a unique key for userId, campaignId, and channel", () => {
      const key = generateIdempotencyKey("user123", "campaign456", "EMAIL");
      expect(key).toBe("user123:campaign456:EMAIL");
    });

    it("should generate different keys for different channels", () => {
      const emailKey = generateIdempotencyKey(
        "user123",
        "campaign456",
        "EMAIL"
      );
      const smsKey = generateIdempotencyKey("user123", "campaign456", "SMS");
      const pushKey = generateIdempotencyKey("user123", "campaign456", "PUSH");

      expect(emailKey).not.toBe(smsKey);
      expect(smsKey).not.toBe(pushKey);
      expect(emailKey).not.toBe(pushKey);
    });

    it("should generate different keys for different users", () => {
      const key1 = generateIdempotencyKey("user1", "campaign456", "EMAIL");
      const key2 = generateIdempotencyKey("user2", "campaign456", "EMAIL");

      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for different campaigns", () => {
      const key1 = generateIdempotencyKey("user123", "campaign1", "EMAIL");
      const key2 = generateIdempotencyKey("user123", "campaign2", "EMAIL");

      expect(key1).not.toBe(key2);
    });
  });
});

describe("Rate Limiter", () => {
  beforeEach(() => {
    resetAllBuckets();
  });

  describe("getRateLimitForChannel", () => {
    it("should return default rate limit for EMAIL", () => {
      const limit = getRateLimitForChannel("EMAIL");
      expect(limit).toBe(DEFAULT_RATE_LIMITS.email);
    });

    it("should return default rate limit for SMS", () => {
      const limit = getRateLimitForChannel("SMS");
      expect(limit).toBe(DEFAULT_RATE_LIMITS.sms);
    });

    it("should return default rate limit for PUSH", () => {
      const limit = getRateLimitForChannel("PUSH");
      expect(limit).toBe(DEFAULT_RATE_LIMITS.push);
    });

    it("should return override when provided", () => {
      const limit = getRateLimitForChannel("EMAIL", 50);
      expect(limit).toBe(50);
    });

    it("should ignore invalid override (0 or negative)", () => {
      const limit1 = getRateLimitForChannel("EMAIL", 0);
      const limit2 = getRateLimitForChannel("EMAIL", -5);

      expect(limit1).toBe(DEFAULT_RATE_LIMITS.email);
      expect(limit2).toBe(DEFAULT_RATE_LIMITS.email);
    });
  });

  describe("calculateBatchSize", () => {
    it("should return total recipients if less than rate limit", () => {
      const batchSize = calculateBatchSize("EMAIL", 10);
      expect(batchSize).toBe(10);
    });

    it("should return rate limit if total recipients exceeds it", () => {
      const batchSize = calculateBatchSize("EMAIL", 1000);
      expect(batchSize).toBe(DEFAULT_RATE_LIMITS.email);
    });

    it("should use override rate limit when provided", () => {
      const batchSize = calculateBatchSize("EMAIL", 1000, 50);
      expect(batchSize).toBe(50);
    });
  });

  describe("tryConsumeToken", () => {
    it("should consume token when available", () => {
      const result = tryConsumeToken("EMAIL");
      expect(result).toBe(true);
    });

    it("should exhaust tokens after consuming rate limit", () => {
      for (let i = 0; i < DEFAULT_RATE_LIMITS.email; i++) {
        tryConsumeToken("EMAIL");
      }

      const result = tryConsumeToken("EMAIL");
      expect(result).toBe(false);
    });
  });
});

describe("Unsubscribe", () => {
  describe("generateUnsubscribeToken", () => {
    it("should generate a valid JWT token", () => {
      const token = generateUnsubscribeToken("user123", "marketing");
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);
    });

    it("should generate different tokens for different users", () => {
      const token1 = generateUnsubscribeToken("user1", "marketing");
      const token2 = generateUnsubscribeToken("user2", "marketing");

      expect(token1).not.toBe(token2);
    });

    it("should generate different tokens for different types", () => {
      const token1 = generateUnsubscribeToken("user123", "marketing");
      const token2 = generateUnsubscribeToken("user123", "reminders");

      expect(token1).not.toBe(token2);
    });
  });

  describe("verifyUnsubscribeToken", () => {
    it("should verify a valid token", () => {
      const token = generateUnsubscribeToken("user123", "marketing");
      const payload = verifyUnsubscribeToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe("user123");
      expect(payload?.type).toBe("marketing");
    });

    it("should return null for invalid token", () => {
      const payload = verifyUnsubscribeToken("invalid-token");
      expect(payload).toBeNull();
    });

    it("should return null for tampered token", () => {
      const token = generateUnsubscribeToken("user123", "marketing");
      const tamperedToken = token.slice(0, -5) + "xxxxx";
      const payload = verifyUnsubscribeToken(tamperedToken);

      expect(payload).toBeNull();
    });
  });

  describe("generateUnsubscribeUrl", () => {
    it("should generate a valid URL with token", () => {
      const url = generateUnsubscribeUrl(
        "https://indietix.com",
        "user123",
        "marketing"
      );

      expect(url).toContain("https://indietix.com/unsubscribe?token=");
      expect(url.length).toBeGreaterThan(50);
    });

    it("should URL-encode the token", () => {
      const url = generateUnsubscribeUrl(
        "https://indietix.com",
        "user123",
        "marketing"
      );

      const tokenPart = url.split("token=")[1];
      expect(tokenPart).toBeTruthy();
    });
  });
});
