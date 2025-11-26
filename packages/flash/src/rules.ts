/**
 * Flash Sales Rules Engine
 *
 * Detects underperforming events and suggests flash sales based on configurable rules.
 * Default trigger: timeToStart <= 6h AND sell-through < 50% -> start flash at 20-40% off
 */

export interface FlashRuleConfig {
  // Time thresholds (in hours)
  maxTimeToStart: number; // Default: 6 hours
  minTimeToStart: number; // Default: 1 hour (don't trigger too close to event)

  // Sell-through thresholds (percentage 0-100)
  sellThroughThreshold: number; // Default: 50%

  // Velocity threshold (bookings in last 6 hours)
  minVelocityThreshold: number; // Default: 0 (any velocity)

  // Discount range (percentage 0-100)
  minDiscount: number; // Default: 20%
  maxDiscount: number; // Default: 40%

  // Inventory cap (percentage of remaining seats)
  maxInventoryCap: number; // Default: 50%

  // Geofence radius (km)
  cityRadius: number; // Default: 5km

  // Safety: minimum hours between flash sales for same event
  cooldownHours: number; // Default: 24 hours

  // Safety: minimum price guard (in paise)
  minFlashPrice: number; // Default: 0 (no minimum)

  // Flash sale duration (in hours)
  flashDurationHours: number; // Default: 2 hours
}

export const DEFAULT_FLASH_CONFIG: FlashRuleConfig = {
  maxTimeToStart: 6,
  minTimeToStart: 1,
  sellThroughThreshold: 50,
  minVelocityThreshold: 0,
  minDiscount: 20,
  maxDiscount: 40,
  maxInventoryCap: 50,
  cityRadius: 5,
  cooldownHours: 24,
  minFlashPrice: 0,
  flashDurationHours: 2,
};

export interface EventMetrics {
  eventId: string;
  totalSeats: number;
  bookedSeats: number;
  eventDate: Date;
  basePrice: number; // in paise
  city: string;
  venue: string;
  lastFlashSaleEndedAt?: Date;
  recentBookings: number; // bookings in last 6 hours
}

export interface FlashSuggestion {
  eventId: string;
  shouldTrigger: boolean;
  reason: string;
  suggestedDiscount: number; // percentage
  suggestedMaxSeats: number;
  suggestedDurationHours: number;
  suggestedMinPrice: number; // in paise
  cityRadius: number;
  metrics: {
    sellThrough: number;
    timeToStartHours: number;
    velocity: number;
    remainingSeats: number;
  };
}

/**
 * Calculate sell-through percentage
 */
export function calculateSellThrough(
  bookedSeats: number,
  totalSeats: number
): number {
  if (totalSeats === 0) return 100;
  return (bookedSeats / totalSeats) * 100;
}

/**
 * Calculate hours until event starts
 */
export function calculateTimeToStart(eventDate: Date, now: Date): number {
  const diffMs = eventDate.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Calculate suggested discount based on urgency
 * More urgent (less time) = higher discount
 */
export function calculateDiscount(
  timeToStartHours: number,
  sellThrough: number,
  config: FlashRuleConfig
): number {
  // Base discount starts at minDiscount
  let discount = config.minDiscount;

  // Increase discount based on time urgency (closer to event = higher discount)
  const timeUrgency = 1 - timeToStartHours / config.maxTimeToStart;
  const timeBonus =
    (config.maxDiscount - config.minDiscount) * timeUrgency * 0.5;

  // Increase discount based on low sell-through (lower = higher discount)
  const sellThroughUrgency = 1 - sellThrough / config.sellThroughThreshold;
  const sellThroughBonus =
    (config.maxDiscount - config.minDiscount) * sellThroughUrgency * 0.5;

  discount += timeBonus + sellThroughBonus;

  // Clamp to valid range
  return Math.min(
    config.maxDiscount,
    Math.max(config.minDiscount, Math.round(discount))
  );
}

/**
 * Calculate maximum seats for flash sale
 * Cap at maxInventoryCap% of remaining seats
 */
export function calculateMaxSeats(
  remainingSeats: number,
  config: FlashRuleConfig
): number {
  return Math.max(
    1,
    Math.floor(remainingSeats * (config.maxInventoryCap / 100))
  );
}

/**
 * Calculate minimum flash price
 * Ensures we don't go below a certain price point
 */
export function calculateMinFlashPrice(
  basePrice: number,
  discount: number,
  configMinPrice: number
): number {
  const discountedPrice = Math.round(basePrice * (1 - discount / 100));
  return Math.max(discountedPrice, configMinPrice);
}

/**
 * Check if event is in cooldown period (had a flash sale recently)
 */
export function isInCooldown(
  lastFlashSaleEndedAt: Date | undefined,
  now: Date,
  cooldownHours: number
): boolean {
  if (!lastFlashSaleEndedAt) return false;
  const hoursSinceLastSale =
    (now.getTime() - lastFlashSaleEndedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastSale < cooldownHours;
}

/**
 * Evaluate flash sale rules for an event
 */
export function evaluateFlashRules(
  metrics: EventMetrics,
  now: Date = new Date(),
  config: FlashRuleConfig = DEFAULT_FLASH_CONFIG
): FlashSuggestion {
  const sellThrough = calculateSellThrough(
    metrics.bookedSeats,
    metrics.totalSeats
  );
  const timeToStartHours = calculateTimeToStart(metrics.eventDate, now);
  const remainingSeats = metrics.totalSeats - metrics.bookedSeats;

  const baseResult: FlashSuggestion = {
    eventId: metrics.eventId,
    shouldTrigger: false,
    reason: "",
    suggestedDiscount: 0,
    suggestedMaxSeats: 0,
    suggestedDurationHours: config.flashDurationHours,
    suggestedMinPrice: 0,
    cityRadius: config.cityRadius,
    metrics: {
      sellThrough,
      timeToStartHours,
      velocity: metrics.recentBookings,
      remainingSeats,
    },
  };

  // Check: Event already passed
  if (timeToStartHours <= 0) {
    return {
      ...baseResult,
      reason: "Event has already started or passed",
    };
  }

  // Check: Too close to event start
  if (timeToStartHours < config.minTimeToStart) {
    return {
      ...baseResult,
      reason: `Too close to event start (${timeToStartHours.toFixed(1)}h < ${config.minTimeToStart}h minimum)`,
    };
  }

  // Check: Too far from event start
  if (timeToStartHours > config.maxTimeToStart) {
    return {
      ...baseResult,
      reason: `Too far from event start (${timeToStartHours.toFixed(1)}h > ${config.maxTimeToStart}h maximum)`,
    };
  }

  // Check: Cooldown period
  if (isInCooldown(metrics.lastFlashSaleEndedAt, now, config.cooldownHours)) {
    return {
      ...baseResult,
      reason: `Event is in cooldown period (${config.cooldownHours}h since last flash sale)`,
    };
  }

  // Check: Sell-through already good
  if (sellThrough >= config.sellThroughThreshold) {
    return {
      ...baseResult,
      reason: `Sell-through is good (${sellThrough.toFixed(1)}% >= ${config.sellThroughThreshold}% threshold)`,
    };
  }

  // Check: No remaining seats
  if (remainingSeats <= 0) {
    return {
      ...baseResult,
      reason: "No remaining seats available",
    };
  }

  // All checks passed - suggest flash sale
  const suggestedDiscount = calculateDiscount(
    timeToStartHours,
    sellThrough,
    config
  );
  const suggestedMaxSeats = calculateMaxSeats(remainingSeats, config);
  const suggestedMinPrice = calculateMinFlashPrice(
    metrics.basePrice,
    suggestedDiscount,
    config.minFlashPrice
  );

  return {
    eventId: metrics.eventId,
    shouldTrigger: true,
    reason: `Low sell-through (${sellThrough.toFixed(1)}%) with ${timeToStartHours.toFixed(1)}h to event`,
    suggestedDiscount,
    suggestedMaxSeats,
    suggestedDurationHours: config.flashDurationHours,
    suggestedMinPrice,
    cityRadius: config.cityRadius,
    metrics: {
      sellThrough,
      timeToStartHours,
      velocity: metrics.recentBookings,
      remainingSeats,
    },
  };
}

/**
 * Batch evaluate multiple events for flash sale suggestions
 */
export function evaluateMultipleEvents(
  events: EventMetrics[],
  now: Date = new Date(),
  config: FlashRuleConfig = DEFAULT_FLASH_CONFIG
): FlashSuggestion[] {
  return events.map((event) => evaluateFlashRules(event, now, config));
}

/**
 * Filter suggestions to only those that should trigger
 */
export function getTriggeredSuggestions(
  suggestions: FlashSuggestion[]
): FlashSuggestion[] {
  return suggestions.filter((s) => s.shouldTrigger);
}
