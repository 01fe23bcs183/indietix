// Rules and configuration
export {
  EARNING_RULES,
  getEarningRule,
  getEarningDelta,
  STREAK_THRESHOLD,
  STREAK_WINDOW_DAYS,
  LOW_SALES_THRESHOLD_PERCENT,
  LOW_SALES_WINDOW_HOURS,
  EARLY_BIRD_DAYS_BEFORE,
  REFERRAL_MAX_PER_MONTH,
  type EarningRule,
} from "./rules";

// Rewards catalog
export {
  REWARDS_CATALOG,
  getReward,
  getAvailableRewards,
  getNextReward,
  getAllRewardsWithProgress,
  type Reward,
  type RewardType,
} from "./rewards";

// Badge definitions
export {
  BADGE_DEFINITIONS,
  getBadgeDefinition,
  getBadgesByCategory,
  getAllBadges,
  type BadgeDefinition,
} from "./badges";

// Earning functions
export {
  earnKarma,
  checkAndAwardStreak,
  checkEarlyBird,
  checkLowSalesHelp,
  releaseHeldKarma,
  cancelHeldKarma,
  type EarnResult,
  type EarnOptions,
} from "./earn";

// Spending/redemption functions
export {
  redeemReward,
  adminAdjustKarma,
  type SpendResult,
  type RedeemOptions,
} from "./spend";

// Leaderboard functions
export {
  getLeaderboard,
  getUserRank,
  recomputeLeaderboard,
  recomputeCityLeaderboard,
  getCurrentMonth,
  getAvailableCities,
  getAvailableMonths,
  type LeaderboardEntryWithUser,
  type LeaderboardResult,
  type RecomputeResult,
} from "./leaderboard";
