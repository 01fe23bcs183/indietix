import type { Category } from "@indietix/db";

/**
 * User profile vector for recommendation computation
 */
export interface UserProfileVector {
  userId: string;
  catFreq: Record<string, number>; // Category -> frequency count
  priceP50: number; // Median price in paise
  preferredAreas: string[]; // Top cities
  timeSlots: string[]; // Preferred time slots
}

/**
 * Event candidate for scoring
 */
export interface EventCandidate {
  id: string;
  title: string;
  category: Category;
  city: string;
  price: number;
  date: Date;
  bookedSeats: number;
  totalSeats: number;
}

/**
 * Scored recommendation
 */
export interface ScoredReco {
  eventId: string;
  score: number;
  reason: RecoReason;
}

/**
 * Reason for recommendation
 * Uses index signature to be compatible with Prisma's JSON type
 */
export type RecoReason = {
  type: "category_match" | "similar_users" | "popular" | "mf" | "cold_start";
  details: {
    categoryScore?: number;
    priceScore?: number;
    areaScore?: number;
    recencyScore?: number;
    popularityScore?: number;
    similarUserIds?: string[];
    mfScore?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/**
 * Similar user with similarity score
 */
export interface SimilarUser {
  userId: string;
  jaccardSim: number; // Jaccard similarity on categories
  cosineSim: number; // Cosine similarity on price band
  combinedSim: number; // Combined similarity score
}

/**
 * Batch computation result
 */
export interface BatchResult {
  usersProcessed: number;
  recosGenerated: number;
  coldStartUsers: number;
  errors: string[];
  durationMs: number;
}

/**
 * Click log for future tuning
 */
export interface RecoClickLog {
  userId: string;
  eventId: string;
  position: number;
  score: number;
  clickedAt: Date;
}
