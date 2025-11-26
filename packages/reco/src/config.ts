/**
 * Recommendation Engine Configuration
 *
 * Configurable weights for the scoring formula:
 * score = w_cat*catSim + w_price*priceBandSim + w_area*areaMatch + w_recency*recencyBoost + w_pop*popularity
 */

export interface RecoWeights {
  category: number; // Weight for category similarity
  price: number; // Weight for price band similarity
  area: number; // Weight for area/city match
  recency: number; // Weight for recency boost (newer events)
  popularity: number; // Weight for event popularity
}

export interface RecoConfig {
  weights: RecoWeights;
  maxRecosPerUser: number; // Maximum recommendations to store per user
  minScore: number; // Minimum score threshold for recommendations
  coldStartMinBookings: number; // Minimum bookings to consider user "warm"
  similarUsersLimit: number; // Max similar users to consider
  candidatePoolSize: number; // Max candidates before scoring
  priceBandWidth: number; // Price band width in paise for similarity
  mfProvider: "none" | "local"; // Matrix factorization provider
  mfLatentFactors: number; // Number of latent factors for MF
  mfIterations: number; // Number of iterations for MF training
}

/**
 * Default configuration values
 * These can be overridden via environment variables or runtime configuration
 */
export const DEFAULT_WEIGHTS: RecoWeights = {
  category: 0.35, // Category match is most important
  price: 0.2, // Price band similarity
  area: 0.2, // City/area match
  recency: 0.15, // Recency boost for newer events
  popularity: 0.1, // Event popularity (bookings count)
};

export const DEFAULT_CONFIG: RecoConfig = {
  weights: DEFAULT_WEIGHTS,
  maxRecosPerUser: 50,
  minScore: 0.1,
  coldStartMinBookings: 3,
  similarUsersLimit: 100,
  candidatePoolSize: 500,
  priceBandWidth: 50000, // 500 INR bands
  mfProvider: (process.env.RECO_MF_PROVIDER as "none" | "local") || "none",
  mfLatentFactors: 20,
  mfIterations: 50,
};

/**
 * Get the current configuration, merging defaults with any overrides
 */
export function getConfig(overrides?: Partial<RecoConfig>): RecoConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    weights: {
      ...DEFAULT_WEIGHTS,
      ...overrides?.weights,
    },
  };
}

/**
 * Price bands for similarity calculation
 * Events in the same band are considered similar in price
 */
export const PRICE_BANDS = [
  { min: 0, max: 50000, label: "budget" }, // 0-500 INR
  { min: 50000, max: 150000, label: "mid" }, // 500-1500 INR
  { min: 150000, max: 300000, label: "premium" }, // 1500-3000 INR
  { min: 300000, max: Infinity, label: "luxury" }, // 3000+ INR
] as const;

/**
 * Time slots for preference tracking
 */
export const TIME_SLOTS = {
  morning: { start: 6, end: 12 }, // 6 AM - 12 PM
  afternoon: { start: 12, end: 17 }, // 12 PM - 5 PM
  evening: { start: 17, end: 21 }, // 5 PM - 9 PM
  night: { start: 21, end: 6 }, // 9 PM - 6 AM
} as const;

export type TimeSlot = keyof typeof TIME_SLOTS;
export type PriceBand = (typeof PRICE_BANDS)[number]["label"];

/**
 * Get the price band for a given price in paise
 */
export function getPriceBand(priceInPaise: number): PriceBand {
  for (const band of PRICE_BANDS) {
    if (priceInPaise >= band.min && priceInPaise < band.max) {
      return band.label;
    }
  }
  return "luxury";
}

/**
 * Get the time slot for a given hour (0-23)
 */
export function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}
