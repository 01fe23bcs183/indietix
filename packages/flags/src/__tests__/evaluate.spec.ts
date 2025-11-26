import { describe, it, expect } from "vitest";
import { evaluateRules, evaluateFlag } from "../evaluate";
import type { UserContext, TargetingRules } from "../types";

describe("evaluateRules", () => {
  it("should return true when no rules are provided", () => {
    const userCtx: UserContext = { userId: "user1" };
    expect(evaluateRules(userCtx, null)).toBe(true);
  });

  it("should return true when rules object is empty", () => {
    const userCtx: UserContext = { userId: "user1" };
    expect(evaluateRules(userCtx, {})).toBe(true);
  });

  describe("deny list", () => {
    it("should return false when user is in deny list", () => {
      const userCtx: UserContext = { userId: "blocked-user" };
      const rules: TargetingRules = {
        denyList: ["blocked-user", "other-user"],
      };
      expect(evaluateRules(userCtx, rules)).toBe(false);
    });

    it("should return true when user is not in deny list", () => {
      const userCtx: UserContext = { userId: "allowed-user" };
      const rules: TargetingRules = { denyList: ["blocked-user"] };
      expect(evaluateRules(userCtx, rules)).toBe(true);
    });
  });

  describe("allow list", () => {
    it("should return true when user is in allow list", () => {
      const userCtx: UserContext = { userId: "vip-user" };
      const rules: TargetingRules = { allowList: ["vip-user"] };
      expect(evaluateRules(userCtx, rules)).toBe(true);
    });

    it("should bypass other rules when user is in allow list", () => {
      const userCtx: UserContext = { userId: "vip-user", role: "CUSTOMER" };
      const rules: TargetingRules = {
        allowList: ["vip-user"],
        roles: ["ADMIN"], // User doesn't have this role
      };
      expect(evaluateRules(userCtx, rules)).toBe(true);
    });
  });

  describe("role targeting", () => {
    it("should return true when user has matching role", () => {
      const userCtx: UserContext = { userId: "user1", role: "ADMIN" };
      const rules: TargetingRules = { roles: ["ADMIN", "ORGANIZER"] };
      expect(evaluateRules(userCtx, rules)).toBe(true);
    });

    it("should return false when user does not have matching role", () => {
      const userCtx: UserContext = { userId: "user1", role: "CUSTOMER" };
      const rules: TargetingRules = { roles: ["ADMIN", "ORGANIZER"] };
      expect(evaluateRules(userCtx, rules)).toBe(false);
    });

    it("should return false when user has no role", () => {
      const userCtx: UserContext = { userId: "user1" };
      const rules: TargetingRules = { roles: ["ADMIN"] };
      expect(evaluateRules(userCtx, rules)).toBe(false);
    });
  });

  describe("city targeting", () => {
    it("should return true when user is in matching city", () => {
      const userCtx: UserContext = { userId: "user1", city: "Mumbai" };
      const rules: TargetingRules = { cities: ["Mumbai", "Delhi"] };
      expect(evaluateRules(userCtx, rules)).toBe(true);
    });

    it("should return false when user is not in matching city", () => {
      const userCtx: UserContext = { userId: "user1", city: "Bangalore" };
      const rules: TargetingRules = { cities: ["Mumbai", "Delhi"] };
      expect(evaluateRules(userCtx, rules)).toBe(false);
    });
  });

  describe("category targeting", () => {
    it("should return true when user matches category", () => {
      const userCtx: UserContext = { userId: "user1", category: "MUSIC" };
      const rules: TargetingRules = { categories: ["MUSIC", "TECH"] };
      expect(evaluateRules(userCtx, rules)).toBe(true);
    });

    it("should return false when user does not match category", () => {
      const userCtx: UserContext = { userId: "user1", category: "SPORTS" };
      const rules: TargetingRules = { categories: ["MUSIC", "TECH"] };
      expect(evaluateRules(userCtx, rules)).toBe(false);
    });
  });

  describe("combined rules", () => {
    it("should require all rules to pass", () => {
      const userCtx: UserContext = {
        userId: "user1",
        role: "ADMIN",
        city: "Mumbai",
      };
      const rules: TargetingRules = {
        roles: ["ADMIN"],
        cities: ["Mumbai"],
      };
      expect(evaluateRules(userCtx, rules)).toBe(true);
    });

    it("should fail if any rule fails", () => {
      const userCtx: UserContext = {
        userId: "user1",
        role: "ADMIN",
        city: "Bangalore", // Wrong city
      };
      const rules: TargetingRules = {
        roles: ["ADMIN"],
        cities: ["Mumbai"],
      };
      expect(evaluateRules(userCtx, rules)).toBe(false);
    });
  });
});

describe("evaluateFlag", () => {
  it("should return false when flag is disabled", () => {
    const userCtx: UserContext = { userId: "user1" };
    const flag = {
      key: "test-flag",
      enabled: false,
      rollout: 100,
      rules: null,
    };
    expect(evaluateFlag(userCtx, flag)).toBe(false);
  });

  it("should return true when flag is enabled with 100% rollout", () => {
    const userCtx: UserContext = { userId: "user1" };
    const flag = {
      key: "test-flag",
      enabled: true,
      rollout: 100,
      rules: null,
    };
    expect(evaluateFlag(userCtx, flag)).toBe(true);
  });

  it("should return false when user fails targeting rules", () => {
    const userCtx: UserContext = { userId: "user1", role: "CUSTOMER" };
    const flag = {
      key: "test-flag",
      enabled: true,
      rollout: 100,
      rules: { roles: ["ADMIN"] },
    };
    expect(evaluateFlag(userCtx, flag)).toBe(false);
  });

  it("should return false for anonymous users when rollout is less than 100%", () => {
    const userCtx: UserContext = {}; // No userId
    const flag = {
      key: "test-flag",
      enabled: true,
      rollout: 50,
      rules: null,
    };
    expect(evaluateFlag(userCtx, flag)).toBe(false);
  });

  it("should return true for anonymous users when rollout is 100%", () => {
    const userCtx: UserContext = {}; // No userId
    const flag = {
      key: "test-flag",
      enabled: true,
      rollout: 100,
      rules: null,
    };
    expect(evaluateFlag(userCtx, flag)).toBe(true);
  });

  it("should be deterministic for same user", () => {
    const userCtx: UserContext = { userId: "deterministic-user" };
    const flag = {
      key: "test-flag",
      enabled: true,
      rollout: 50,
      rules: null,
    };
    const result1 = evaluateFlag(userCtx, flag);
    const result2 = evaluateFlag(userCtx, flag);
    expect(result1).toBe(result2);
  });
});
