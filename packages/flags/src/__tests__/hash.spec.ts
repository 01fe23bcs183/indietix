import { describe, it, expect } from "vitest";
import { hashString, isInRollout, assignToBucket } from "../hash";

describe("hashString", () => {
  it("should return consistent hash for same input", () => {
    const hash1 = hashString("test-string");
    const hash2 = hashString("test-string");
    expect(hash1).toBe(hash2);
  });

  it("should return different hashes for different inputs", () => {
    const hash1 = hashString("string-a");
    const hash2 = hashString("string-b");
    expect(hash1).not.toBe(hash2);
  });

  it("should return non-negative numbers", () => {
    const testStrings = ["test", "user123", "experiment:key", "a:b:c"];
    for (const str of testStrings) {
      expect(hashString(str)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("isInRollout", () => {
  it("should always return true for 100% rollout", () => {
    const users = ["user1", "user2", "user3", "user4", "user5"];
    for (const userId of users) {
      expect(isInRollout(userId, "flag-key", 100)).toBe(true);
    }
  });

  it("should always return false for 0% rollout", () => {
    const users = ["user1", "user2", "user3", "user4", "user5"];
    for (const userId of users) {
      expect(isInRollout(userId, "flag-key", 0)).toBe(false);
    }
  });

  it("should be deterministic for same user and flag", () => {
    const result1 = isInRollout("user123", "my-flag", 50);
    const result2 = isInRollout("user123", "my-flag", 50);
    expect(result1).toBe(result2);
  });

  it("should produce different results for different users", () => {
    // With 50% rollout, we expect roughly half to be in and half out
    const results: boolean[] = [];
    for (let i = 0; i < 100; i++) {
      results.push(isInRollout(`user-${i}`, "test-flag", 50));
    }
    const inRollout = results.filter((r) => r).length;
    // Should be roughly 50%, allow some variance
    expect(inRollout).toBeGreaterThan(30);
    expect(inRollout).toBeLessThan(70);
  });

  it("should respect rollout percentage boundaries", () => {
    // Test with a specific user that we know the hash for
    const userId = "test-user-deterministic";
    const flagKey = "test-flag";

    // The result should be consistent regardless of how many times we call
    const result50 = isInRollout(userId, flagKey, 50);
    const result50Again = isInRollout(userId, flagKey, 50);
    expect(result50).toBe(result50Again);
  });
});

describe("assignToBucket", () => {
  it("should throw error for empty variants", () => {
    expect(() => assignToBucket("user1", "exp1", [])).toThrow(
      "No variants provided"
    );
  });

  it("should return the only variant when there is one", () => {
    const variant = assignToBucket("user1", "exp1", [
      { name: "A", weight: 100 },
    ]);
    expect(variant).toBe("A");
  });

  it("should be deterministic for same user and experiment", () => {
    const variants = [
      { name: "A", weight: 50 },
      { name: "B", weight: 50 },
    ];
    const result1 = assignToBucket("user123", "experiment-key", variants);
    const result2 = assignToBucket("user123", "experiment-key", variants);
    expect(result1).toBe(result2);
  });

  it("should distribute users across variants based on weights", () => {
    const variants = [
      { name: "A", weight: 50 },
      { name: "B", weight: 50 },
    ];

    const counts: Record<string, number> = { A: 0, B: 0 };
    for (let i = 0; i < 1000; i++) {
      const variant = assignToBucket(`user-${i}`, "test-exp", variants);
      counts[variant]++;
    }

    // Should be roughly 50/50, allow some variance
    expect(counts.A).toBeGreaterThan(400);
    expect(counts.A).toBeLessThan(600);
    expect(counts.B).toBeGreaterThan(400);
    expect(counts.B).toBeLessThan(600);
  });

  it("should respect unequal weights", () => {
    const variants = [
      { name: "A", weight: 80 },
      { name: "B", weight: 20 },
    ];

    const counts: Record<string, number> = { A: 0, B: 0 };
    for (let i = 0; i < 1000; i++) {
      const variant = assignToBucket(`user-${i}`, "weighted-exp", variants);
      counts[variant]++;
    }

    // A should get roughly 80%, B roughly 20%
    expect(counts.A).toBeGreaterThan(700);
    expect(counts.B).toBeLessThan(300);
  });

  it("should handle three or more variants", () => {
    const variants = [
      { name: "A", weight: 33 },
      { name: "B", weight: 33 },
      { name: "C", weight: 34 },
    ];

    const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
    for (let i = 0; i < 1000; i++) {
      const variant = assignToBucket(`user-${i}`, "three-way-exp", variants);
      counts[variant]++;
    }

    // Each should get roughly 33%
    expect(counts.A).toBeGreaterThan(250);
    expect(counts.A).toBeLessThan(420);
    expect(counts.B).toBeGreaterThan(250);
    expect(counts.B).toBeLessThan(420);
    expect(counts.C).toBeGreaterThan(250);
    expect(counts.C).toBeLessThan(420);
  });

  it("should throw error for zero total weight", () => {
    expect(() =>
      assignToBucket("user1", "exp1", [
        { name: "A", weight: 0 },
        { name: "B", weight: 0 },
      ])
    ).toThrow("Total weight must be positive");
  });
});
