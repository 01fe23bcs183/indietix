import type { PrismaClient, Category, EventStatus } from "@indietix/db";
import type { UserProfileVector, EventCandidate, SimilarUser } from "./types";
import { getConfig, getPriceBand } from "./config";

/**
 * Compute Jaccard similarity between two category frequency maps
 * Returns a value between 0 and 1
 */
export function computeJaccardSimilarity(
  catFreq1: Record<string, number>,
  catFreq2: Record<string, number>
): number {
  const set1 = new Set(Object.keys(catFreq1));
  const set2 = new Set(Object.keys(catFreq2));

  if (set1.size === 0 && set2.size === 0) return 0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Compute cosine similarity between two price values
 * Uses price bands for comparison
 * Returns a value between 0 and 1
 */
export function computeCosineSimilarity(
  price1: number,
  price2: number
): number {
  const band1 = getPriceBand(price1);
  const band2 = getPriceBand(price2);

  const priceBands = ["budget", "mid", "premium", "luxury"];
  const idx1 = priceBands.indexOf(band1);
  const idx2 = priceBands.indexOf(band2);

  if (idx1 === -1 || idx2 === -1) return 0;

  const maxDiff = priceBands.length - 1;
  const diff = Math.abs(idx1 - idx2);

  return 1 - diff / maxDiff;
}

/**
 * Filter out expired and already booked events from candidates
 */
export function filterExpiredAndBooked(
  candidates: EventCandidate[],
  bookedEventIds: string[]
): EventCandidate[] {
  const now = new Date();
  const bookedSet = new Set(bookedEventIds);

  return candidates.filter((c) => {
    const eventDate = new Date(c.date);
    const isExpired = eventDate <= now;
    const isBooked = bookedSet.has(c.id);
    return !isExpired && !isBooked;
  });
}

/**
 * Find similar users based on Jaccard similarity on categories
 * and cosine similarity on price band
 */
export async function findSimilarUsers(
  prisma: PrismaClient,
  userProfile: UserProfileVector,
  limit: number = 100
): Promise<SimilarUser[]> {
  // Get all user profiles except the current user
  const otherProfiles = await prisma.userProfile.findMany({
    where: {
      userId: { not: userProfile.userId },
    },
  });

  const userCategories = new Set(Object.keys(userProfile.catFreq));
  const userPriceBand = getPriceBand(userProfile.priceP50);

  const similarities: SimilarUser[] = [];

  for (const other of otherProfiles) {
    const otherCatFreq = other.catFreq as Record<string, number>;
    const otherCategories = new Set(Object.keys(otherCatFreq));
    const otherPriceBand = getPriceBand(other.priceP50);

    // Jaccard similarity on categories
    const intersection = new Set(
      [...userCategories].filter((x) => otherCategories.has(x))
    );
    const union = new Set([...userCategories, ...otherCategories]);
    const jaccardSim = union.size > 0 ? intersection.size / union.size : 0;

    // Simple price band similarity (1 if same band, 0.5 if adjacent, 0 otherwise)
    const priceBands = ["budget", "mid", "premium", "luxury"];
    const userBandIdx = priceBands.indexOf(userPriceBand);
    const otherBandIdx = priceBands.indexOf(otherPriceBand);
    const bandDiff = Math.abs(userBandIdx - otherBandIdx);
    const cosineSim = bandDiff === 0 ? 1 : bandDiff === 1 ? 0.5 : 0;

    // Combined similarity (weighted average)
    const combinedSim = 0.7 * jaccardSim + 0.3 * cosineSim;

    if (combinedSim > 0) {
      similarities.push({
        userId: other.userId,
        jaccardSim,
        cosineSim,
        combinedSim,
      });
    }
  }

  // Sort by combined similarity and return top N
  return similarities
    .sort((a, b) => b.combinedSim - a.combinedSim)
    .slice(0, limit);
}

/**
 * Generate candidate events for a user
 * Excludes already booked and expired events
 */
export async function generateCandidates(
  prisma: PrismaClient,
  userId: string,
  userProfile: UserProfileVector,
  city?: string
): Promise<EventCandidate[]> {
  const config = getConfig();
  const now = new Date();

  // Get user's already booked event IDs
  const bookedEventIds = await prisma.booking.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "CONFIRMED", "ATTENDED"] },
    },
    select: { eventId: true },
  });
  const excludeIds = bookedEventIds.map((b) => b.eventId);

  // Build where clause for candidate events
  const whereClause: {
    id: { notIn: string[] };
    status: EventStatus;
    date: { gt: Date };
    hidden: boolean;
    city?: string;
  } = {
    id: { notIn: excludeIds },
    status: "PUBLISHED" as EventStatus,
    date: { gt: now },
    hidden: false,
  };

  // Filter by city if specified
  if (city) {
    whereClause.city = city;
  }

  // Get candidate events
  const events = await prisma.event.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      category: true,
      city: true,
      price: true,
      date: true,
      bookedSeats: true,
      totalSeats: true,
    },
    orderBy: [{ date: "asc" }, { bookedSeats: "desc" }],
    take: config.candidatePoolSize,
  });

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    city: e.city,
    price: e.price,
    date: e.date,
    bookedSeats: e.bookedSeats,
    totalSeats: e.totalSeats,
  }));
}

/**
 * Get events booked by similar users that the current user hasn't booked
 */
export async function getCandidatesFromSimilarUsers(
  prisma: PrismaClient,
  userId: string,
  similarUsers: SimilarUser[],
  excludeEventIds: string[]
): Promise<Map<string, { eventId: string; score: number; userIds: string[] }>> {
  const now = new Date();
  const eventScores = new Map<
    string,
    { eventId: string; score: number; userIds: string[] }
  >();

  if (similarUsers.length === 0) {
    return eventScores;
  }

  // Get bookings from similar users
  const similarUserIds = similarUsers.map((u) => u.userId);
  const similarityMap = new Map(
    similarUsers.map((u) => [u.userId, u.combinedSim])
  );

  const bookings = await prisma.booking.findMany({
    where: {
      userId: { in: similarUserIds },
      status: { in: ["CONFIRMED", "ATTENDED"] },
      event: {
        id: { notIn: excludeEventIds },
        status: "PUBLISHED",
        date: { gt: now },
        hidden: false,
      },
    },
    select: {
      userId: true,
      eventId: true,
    },
  });

  // Aggregate scores by event
  for (const booking of bookings) {
    const similarity = similarityMap.get(booking.userId) || 0;
    const existing = eventScores.get(booking.eventId);

    if (existing) {
      existing.score += similarity;
      existing.userIds.push(booking.userId);
    } else {
      eventScores.set(booking.eventId, {
        eventId: booking.eventId,
        score: similarity,
        userIds: [booking.userId],
      });
    }
  }

  return eventScores;
}

/**
 * Get popular events by segment (city + category)
 * Used for cold-start users
 */
export async function getPopularBySegment(
  prisma: PrismaClient,
  city?: string,
  category?: Category,
  limit: number = 20
): Promise<EventCandidate[]> {
  const now = new Date();

  const whereClause: {
    status: EventStatus;
    date: { gt: Date };
    hidden: boolean;
    city?: string;
    category?: Category;
  } = {
    status: "PUBLISHED" as EventStatus,
    date: { gt: now },
    hidden: false,
  };

  if (city) {
    whereClause.city = city;
  }

  if (category) {
    whereClause.category = category;
  }

  const events = await prisma.event.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      category: true,
      city: true,
      price: true,
      date: true,
      bookedSeats: true,
      totalSeats: true,
    },
    orderBy: [{ bookedSeats: "desc" }, { date: "asc" }],
    take: limit,
  });

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    city: e.city,
    price: e.price,
    date: e.date,
    bookedSeats: e.bookedSeats,
    totalSeats: e.totalSeats,
  }));
}
