export type RewardType = "PROMO_CODE" | "PERK" | "STATUS";

export interface Reward {
  key: string;
  name: string;
  description: string;
  cost: number;
  type: RewardType;
  perkFlag?: string;
  promoValue?: number;
  promoType?: "FLAT" | "PERCENT";
  maxEventPrice?: number;
  permanent?: boolean;
}

export const REWARDS_CATALOG: Record<string, Reward> = {
  DISCOUNT_200: {
    key: "DISCOUNT_200",
    name: "Rs.200 Off",
    description: "Get Rs.200 off your next booking",
    cost: 500,
    type: "PROMO_CODE",
    promoValue: 20000,
    promoType: "FLAT",
  },
  EARLY_ACCESS: {
    key: "EARLY_ACCESS",
    name: "Early Access",
    description: "Get early access to ticket sales before general public",
    cost: 1000,
    type: "PERK",
    perkFlag: "EARLY_ACCESS",
  },
  WAITLIST_PRIORITY: {
    key: "WAITLIST_PRIORITY",
    name: "Waitlist Priority",
    description: "Get priority placement on waitlists for sold-out events",
    cost: 2000,
    type: "PERK",
    perkFlag: "WAITLIST_PRIORITY",
  },
  FREE_SHOW_500: {
    key: "FREE_SHOW_500",
    name: "Free Show",
    description: "Get a free ticket to any show priced Rs.500 or less",
    cost: 3000,
    type: "PROMO_CODE",
    promoValue: 100,
    promoType: "PERCENT",
    maxEventPrice: 50000,
  },
  VIP_PERKS: {
    key: "VIP_PERKS",
    name: "VIP Perks",
    description:
      "Unlock VIP benefits including priority support and exclusive offers",
    cost: 5000,
    type: "PERK",
    perkFlag: "VIP",
  },
  GOLD_STATUS: {
    key: "GOLD_STATUS",
    name: "Gold Status",
    description:
      "Permanent Gold member status with all VIP benefits plus exclusive access",
    cost: 10000,
    type: "STATUS",
    perkFlag: "GOLD_STATUS",
    permanent: true,
  },
};

export function getReward(key: string): Reward | undefined {
  return REWARDS_CATALOG[key];
}

export function getAvailableRewards(karma: number): Reward[] {
  return Object.values(REWARDS_CATALOG).filter(
    (reward) => karma >= reward.cost
  );
}

export function getNextReward(
  karma: number
): { reward: Reward; remaining: number } | null {
  const sortedRewards = Object.values(REWARDS_CATALOG).sort(
    (a, b) => a.cost - b.cost
  );

  for (const reward of sortedRewards) {
    if (karma < reward.cost) {
      return {
        reward,
        remaining: reward.cost - karma,
      };
    }
  }

  return null;
}

export function getAllRewardsWithProgress(
  karma: number
): Array<Reward & { unlocked: boolean; progress: number }> {
  return Object.values(REWARDS_CATALOG)
    .sort((a, b) => a.cost - b.cost)
    .map((reward) => ({
      ...reward,
      unlocked: karma >= reward.cost,
      progress: Math.min(100, Math.round((karma / reward.cost) * 100)),
    }));
}
