import type { PrismaClient, EventStatus } from "@indietix/db";
import type {
  UserProfileVector,
  EventCandidate,
  ScoredReco,
  RecoReason,
} from "./types";
import { getConfig, getPriceBand, type RecoConfig } from "./config";

/**
 * Score a single event candidate for a user
 */
export function scoreCandidate(
  candidate: EventCandidate,
  userProfile: UserProfileVector,
  similarUserScore: number = 0,
  similarUserIds: string[] = [],
  config: RecoConfig = getConfig()
): ScoredReco {
  const { weights } = config;

  // Category similarity score
  const userCatTotal = Object.values(userProfile.catFreq).reduce(
    (a, b) => a + b,
    0
  );
  const catFreq = userProfile.catFreq[candidate.category] || 0;
  const categoryScore = userCatTotal > 0 ? catFreq / userCatTotal : 0;

  // Price band similarity score
  const userPriceBand = getPriceBand(userProfile.priceP50);
  const eventPriceBand = getPriceBand(candidate.price);
  const priceBands = ["budget", "mid", "premium", "luxury"];
  const userBandIdx = priceBands.indexOf(userPriceBand);
  const eventBandIdx = priceBands.indexOf(eventPriceBand);
  const bandDiff = Math.abs(userBandIdx - eventBandIdx);
  const priceScore =
    bandDiff === 0 ? 1 : bandDiff === 1 ? 0.7 : bandDiff === 2 ? 0.3 : 0;

  // Area match score
  const areaScore = userProfile.preferredAreas.includes(candidate.city) ? 1 : 0;

  // Recency boost (events happening sooner get higher scores)
  const daysUntilEvent = Math.max(
    0,
    (candidate.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const recencyScore = Math.max(0, 1 - daysUntilEvent / 90); // Decay over 90 days

  // Popularity score (based on booking percentage)
  const bookingPercentage =
    candidate.totalSeats > 0 ? candidate.bookedSeats / candidate.totalSeats : 0;
  const popularityScore = Math.min(1, bookingPercentage * 1.5); // Cap at 1, boost slightly

  // Calculate weighted score
  const baseScore =
    weights.category * categoryScore +
    weights.price * priceScore +
    weights.area * areaScore +
    weights.recency * recencyScore +
    weights.popularity * popularityScore;

  // Add similar user score if available (normalized)
  const normalizedSimilarScore = Math.min(1, similarUserScore / 5); // Normalize to 0-1
  const finalScore = baseScore * 0.7 + normalizedSimilarScore * 0.3;

  // Determine recommendation type
  let recoType: RecoReason["type"] = "category_match";
  if (similarUserScore > 0.5) {
    recoType = "similar_users";
  } else if (popularityScore > 0.7 && categoryScore < 0.2) {
    recoType = "popular";
  }

  return {
    eventId: candidate.id,
    score: Math.round(finalScore * 1000) / 1000, // Round to 3 decimal places
    reason: {
      type: recoType,
      details: {
        categoryScore: Math.round(categoryScore * 100) / 100,
        priceScore: Math.round(priceScore * 100) / 100,
        areaScore,
        recencyScore: Math.round(recencyScore * 100) / 100,
        popularityScore: Math.round(popularityScore * 100) / 100,
        similarUserIds:
          similarUserIds.length > 0 ? similarUserIds.slice(0, 5) : undefined,
      },
    },
  };
}

/**
 * Score all candidates for a user and return top N
 */
export function scoreAllCandidates(
  candidates: EventCandidate[],
  userProfile: UserProfileVector,
  similarUserScores: Map<string, { score: number; userIds: string[] }>,
  config: RecoConfig = getConfig()
): ScoredReco[] {
  const scored: ScoredReco[] = [];

  for (const candidate of candidates) {
    const similarData = similarUserScores.get(candidate.id);
    const similarScore = similarData?.score || 0;
    const similarUserIds = similarData?.userIds || [];

    const reco = scoreCandidate(
      candidate,
      userProfile,
      similarScore,
      similarUserIds,
      config
    );

    if (reco.score >= config.minScore) {
      scored.push(reco);
    }
  }

  // Sort by score descending and return top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, config.maxRecosPerUser);
}

/**
 * Generate cold-start recommendations for new users
 * Uses popularity-by-segment (city + category)
 */
export async function generateColdStartRecos(
  prisma: PrismaClient,
  city?: string,
  limit: number = 20
): Promise<ScoredReco[]> {
  const now = new Date();

  // Get popular events, optionally filtered by city
  const whereClause: {
    status: EventStatus;
    date: { gt: Date };
    hidden: boolean;
    city?: string;
  } = {
    status: "PUBLISHED" as EventStatus,
    date: { gt: now },
    hidden: false,
  };

  if (city) {
    whereClause.city = city;
  }

  const events = await prisma.event.findMany({
    where: whereClause,
    select: {
      id: true,
      bookedSeats: true,
      totalSeats: true,
      date: true,
    },
    orderBy: [{ bookedSeats: "desc" }, { date: "asc" }],
    take: limit,
  });

  return events.map((event, index) => {
    // Score based on popularity and position
    const bookingPercentage =
      event.totalSeats > 0 ? event.bookedSeats / event.totalSeats : 0;
    const positionBoost = 1 - (index / limit) * 0.3; // Top items get slight boost
    const score = Math.min(1, bookingPercentage * 1.2) * positionBoost;

    return {
      eventId: event.id,
      score: Math.round(score * 1000) / 1000,
      reason: {
        type: "cold_start" as const,
        details: {
          popularityScore: Math.round(bookingPercentage * 100) / 100,
        },
      },
    };
  });
}

/**
 * Check if a user is a cold-start user (not enough history)
 */
export async function isColdStartUser(
  prisma: PrismaClient,
  userId: string,
  minBookings: number = 3
): Promise<boolean> {
  const bookingCount = await prisma.booking.count({
    where: {
      userId,
      status: { in: ["CONFIRMED", "ATTENDED"] },
    },
  });

  return bookingCount < minBookings;
}

/**
 * Optional: Simple matrix factorization using SVD approximation
 * Only enabled when RECO_MF_PROVIDER=local
 */
export async function computeMFScores(
  prisma: PrismaClient,
  userId: string,
  candidateIds: string[],
  config: RecoConfig = getConfig()
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  // Only compute if MF is enabled
  if (config.mfProvider !== "local") {
    return scores;
  }

  // Get user-event interaction matrix
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "ATTENDED"] },
    },
    select: {
      userId: true,
      eventId: true,
    },
  });

  // Build user-event matrix
  const userIds = [...new Set(bookings.map((b) => b.userId))];
  const eventIds = [...new Set(bookings.map((b) => b.eventId))];

  const userIndex = new Map(userIds.map((id, i) => [id, i]));
  const eventIndex = new Map(eventIds.map((id, i) => [id, i]));

  // Create sparse matrix
  const matrix: number[][] = Array(userIds.length)
    .fill(null)
    .map(() => Array(eventIds.length).fill(0));

  for (const booking of bookings) {
    const ui = userIndex.get(booking.userId);
    const ei = eventIndex.get(booking.eventId);
    if (ui !== undefined && ei !== undefined && matrix[ui]) {
      matrix[ui][ei] = 1;
    }
  }

  // Simple SVD approximation using power iteration
  // This is a very basic implementation for demonstration
  const targetUserIdx = userIndex.get(userId);
  if (targetUserIdx === undefined) {
    return scores;
  }

  const userVector = matrix[targetUserIdx];
  if (!userVector) {
    return scores;
  }

  // Compute similarity with all events based on co-occurrence
  for (const candidateId of candidateIds) {
    const candidateIdx = eventIndex.get(candidateId);
    if (candidateIdx === undefined) {
      continue;
    }

    // Simple collaborative score: sum of similarities with booked events
    let score = 0;
    for (let i = 0; i < eventIds.length; i++) {
      if (userVector[i] === 1) {
        // Count users who booked both events
        let coOccurrence = 0;
        for (let u = 0; u < userIds.length; u++) {
          const userRow = matrix[u];
          if (userRow && userRow[i] === 1 && userRow[candidateIdx] === 1) {
            coOccurrence++;
          }
        }
        score += coOccurrence;
      }
    }

    if (score > 0) {
      scores.set(candidateId, Math.min(1, score / 10)); // Normalize
    }
  }

  return scores;
}
