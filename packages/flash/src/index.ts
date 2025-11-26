export {
  DEFAULT_FLASH_CONFIG,
  calculateSellThrough,
  calculateTimeToStart,
  calculateDiscount,
  calculateMaxSeats,
  calculateMinFlashPrice,
  isInCooldown,
  evaluateFlashRules,
  evaluateMultipleEvents,
  getTriggeredSuggestions,
} from "./rules";

export type { FlashRuleConfig, EventMetrics, FlashSuggestion } from "./rules";
