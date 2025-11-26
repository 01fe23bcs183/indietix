import { describe, it, expect } from "vitest";
import {
  REWARDS_CATALOG,
  getReward,
  getAvailableRewards,
  getNextReward,
  getAllRewardsWithProgress,
} from "../rewards";

describe("Rewards Catalog", () => {
  describe("REWARDS_CATALOG", () => {
    it("should have all required rewards", () => {
      const requiredRewards = [
        "DISCOUNT_200",
        "EARLY_ACCESS",
        "WAITLIST_PRIORITY",
        "FREE_SHOW_500",
        "VIP_PERKS",
        "GOLD_STATUS",
      ];

      for (const reward of requiredRewards) {
        expect(REWARDS_CATALOG[reward]).toBeDefined();
      }
    });

    it("should have correct costs", () => {
      expect(REWARDS_CATALOG.DISCOUNT_200.cost).toBe(500);
      expect(REWARDS_CATALOG.EARLY_ACCESS.cost).toBe(1000);
      expect(REWARDS_CATALOG.WAITLIST_PRIORITY.cost).toBe(2000);
      expect(REWARDS_CATALOG.FREE_SHOW_500.cost).toBe(3000);
      expect(REWARDS_CATALOG.VIP_PERKS.cost).toBe(5000);
      expect(REWARDS_CATALOG.GOLD_STATUS.cost).toBe(10000);
    });

    it("should mark GOLD_STATUS as permanent", () => {
      expect(REWARDS_CATALOG.GOLD_STATUS.permanent).toBe(true);
    });

    it("should have correct reward types", () => {
      expect(REWARDS_CATALOG.DISCOUNT_200.type).toBe("PROMO_CODE");
      expect(REWARDS_CATALOG.EARLY_ACCESS.type).toBe("PERK");
      expect(REWARDS_CATALOG.GOLD_STATUS.type).toBe("STATUS");
    });
  });

  describe("getReward", () => {
    it("should return the correct reward for a valid key", () => {
      const reward = getReward("DISCOUNT_200");
      expect(reward).toBeDefined();
      expect(reward?.cost).toBe(500);
    });

    it("should return undefined for an invalid key", () => {
      const reward = getReward("INVALID");
      expect(reward).toBeUndefined();
    });
  });

  describe("getAvailableRewards", () => {
    it("should return no rewards for 0 karma", () => {
      const rewards = getAvailableRewards(0);
      expect(rewards).toHaveLength(0);
    });

    it("should return one reward for 500 karma", () => {
      const rewards = getAvailableRewards(500);
      expect(rewards).toHaveLength(1);
      expect(rewards[0].key).toBe("DISCOUNT_200");
    });

    it("should return multiple rewards for 2000 karma", () => {
      const rewards = getAvailableRewards(2000);
      expect(rewards.length).toBeGreaterThan(1);
    });

    it("should return all rewards for 10000 karma", () => {
      const rewards = getAvailableRewards(10000);
      expect(rewards).toHaveLength(Object.keys(REWARDS_CATALOG).length);
    });
  });

  describe("getNextReward", () => {
    it("should return the first reward for 0 karma", () => {
      const next = getNextReward(0);
      expect(next).not.toBeNull();
      expect(next?.reward.cost).toBe(500);
      expect(next?.remaining).toBe(500);
    });

    it("should return the second reward for 500 karma", () => {
      const next = getNextReward(500);
      expect(next).not.toBeNull();
      expect(next?.reward.cost).toBe(1000);
      expect(next?.remaining).toBe(500);
    });

    it("should return null when all rewards are unlocked", () => {
      const next = getNextReward(10000);
      expect(next).toBeNull();
    });

    it("should calculate remaining correctly", () => {
      const next = getNextReward(300);
      expect(next?.remaining).toBe(200);
    });
  });

  describe("getAllRewardsWithProgress", () => {
    it("should return all rewards with progress info", () => {
      const rewards = getAllRewardsWithProgress(250);
      expect(rewards).toHaveLength(Object.keys(REWARDS_CATALOG).length);
    });

    it("should mark unlocked rewards correctly", () => {
      const rewards = getAllRewardsWithProgress(1500);
      const discount = rewards.find((r) => r.key === "DISCOUNT_200");
      const earlyAccess = rewards.find((r) => r.key === "EARLY_ACCESS");
      const waitlist = rewards.find((r) => r.key === "WAITLIST_PRIORITY");

      expect(discount?.unlocked).toBe(true);
      expect(earlyAccess?.unlocked).toBe(true);
      expect(waitlist?.unlocked).toBe(false);
    });

    it("should calculate progress correctly", () => {
      const rewards = getAllRewardsWithProgress(250);
      const discount = rewards.find((r) => r.key === "DISCOUNT_200");
      expect(discount?.progress).toBe(50);
    });

    it("should cap progress at 100%", () => {
      const rewards = getAllRewardsWithProgress(1000);
      const discount = rewards.find((r) => r.key === "DISCOUNT_200");
      expect(discount?.progress).toBe(100);
    });
  });
});
