import type { PrismaClient, EventStatus, Prisma } from "@indietix/db";
import type { BatchResult, ScoredReco } from "./types";
import { getConfig, type RecoConfig } from "./config";
import { computeUserProfile, batchComputeProfiles } from "./profile";
import {
  generateCandidates,
  findSimilarUsers,
  getCandidatesFromSimilarUsers,
} from "./candidates";
import {
  scoreAllCandidates,
  generateColdStartRecos,
  isColdStartUser,
  computeMFScores,
} from "./engine";

/**
 * Compute recommendations for a single user
 */
export async function computeRecosForUser(
  prisma: PrismaClient,
  userId: string,
  city?: string,
  config: RecoConfig = getConfig()
): Promise<ScoredReco[]> {
  // Check if user is cold-start
  const coldStart = await isColdStartUser(
    prisma,
    userId,
    config.coldStartMinBookings
  );

  if (coldStart) {
    return generateColdStartRecos(prisma, city, config.maxRecosPerUser);
  }

  // Compute user profile
  const userProfile = await computeUserProfile(prisma, userId);

  // Generate candidates
  const candidates = await generateCandidates(
    prisma,
    userId,
    userProfile,
    city
  );

  if (candidates.length === 0) {
    return [];
  }

  // Find similar users
  const similarUsers = await findSimilarUsers(
    prisma,
    userProfile,
    config.similarUsersLimit
  );

  // Get candidates from similar users
  const bookedEventIds = await prisma.booking.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "CONFIRMED", "ATTENDED"] },
    },
    select: { eventId: true },
  });
  const excludeIds = bookedEventIds.map((b) => b.eventId);

  const similarUserScores = await getCandidatesFromSimilarUsers(
    prisma,
    userId,
    similarUsers,
    excludeIds
  );

  // Optionally compute MF scores
  const candidateIds = candidates.map((c) => c.id);
  const mfScores = await computeMFScores(prisma, userId, candidateIds, config);

  // Merge MF scores into similar user scores
  for (const [eventId, mfScore] of mfScores) {
    const existing = similarUserScores.get(eventId);
    if (existing) {
      existing.score += mfScore * 0.5; // Weight MF scores
    } else {
      similarUserScores.set(eventId, {
        eventId,
        score: mfScore * 0.5,
        userIds: [],
      });
    }
  }

  // Score all candidates
  const scoredRecos = scoreAllCandidates(
    candidates,
    userProfile,
    similarUserScores,
    config
  );

  // Mark MF-influenced recommendations
  if (config.mfProvider === "local") {
    for (const reco of scoredRecos) {
      if (
        mfScores.has(reco.eventId) &&
        (mfScores.get(reco.eventId) ?? 0) > 0.3
      ) {
        reco.reason.type = "mf";
        reco.reason.details.mfScore = mfScores.get(reco.eventId);
      }
    }
  }

  return scoredRecos;
}

/**
 * Store recommendations for a user in the database
 */
export async function storeUserRecos(
  prisma: PrismaClient,
  userId: string,
  recos: ScoredReco[]
): Promise<void> {
  // Delete existing recommendations for this user
  await prisma.userReco.deleteMany({
    where: { userId },
  });

  // Insert new recommendations
  if (recos.length > 0) {
    await prisma.userReco.createMany({
      data: recos.map((reco) => ({
        userId,
        eventId: reco.eventId,
        score: reco.score,
        reason: reco.reason as Prisma.InputJsonValue,
      })),
    });
  }
}

/**
 * Run batch computation for all users
 * This is called by the nightly cron job
 */
export async function runBatchCompute(
  prisma: PrismaClient,
  config: RecoConfig = getConfig()
): Promise<BatchResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let usersProcessed = 0;
  let recosGenerated = 0;
  let coldStartUsers = 0;

  // First, update all user profiles
  console.log("Computing user profiles...");
  const profileResult = await batchComputeProfiles(prisma);
  console.log(`Computed ${profileResult.processed} user profiles`);
  errors.push(...profileResult.errors);

  // Get all users who have at least one booking or view
  const users = await prisma.user.findMany({
    where: {
      OR: [{ bookings: { some: {} } }],
    },
    select: { id: true },
  });

  console.log(`Processing ${users.length} users...`);

  // Process users in batches to avoid memory issues
  const batchSize = 100;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (user) => {
        try {
          const isCold = await isColdStartUser(
            prisma,
            user.id,
            config.coldStartMinBookings
          );
          if (isCold) {
            coldStartUsers++;
          }

          const recos = await computeRecosForUser(
            prisma,
            user.id,
            undefined,
            config
          );
          await storeUserRecos(prisma, user.id, recos);

          usersProcessed++;
          recosGenerated += recos.length;
        } catch (error) {
          errors.push(`Failed to compute recos for user ${user.id}: ${error}`);
        }
      })
    );

    console.log(
      `Processed ${Math.min(i + batchSize, users.length)}/${users.length} users`
    );
  }

  const durationMs = Date.now() - startTime;

  return {
    usersProcessed,
    recosGenerated,
    coldStartUsers,
    errors,
    durationMs,
  };
}

/**
 * Get stored recommendations for a user
 * Falls back to cold-start if no stored recommendations
 */
export async function getStoredRecos(
  prisma: PrismaClient,
  userId: string,
  limit: number = 20,
  city?: string
): Promise<ScoredReco[]> {
  // Try to get stored recommendations
  const whereClause: {
    userId: string;
    event?: {
      status: EventStatus;
      date: { gt: Date };
      hidden: boolean;
      city?: string;
    };
  } = {
    userId,
    event: {
      status: "PUBLISHED" as EventStatus,
      date: { gt: new Date() },
      hidden: false,
    },
  };

  if (city && whereClause.event) {
    whereClause.event.city = city;
  }

  const stored = await prisma.userReco.findMany({
    where: whereClause,
    orderBy: { score: "desc" },
    take: limit,
    include: {
      event: {
        select: {
          id: true,
          title: true,
          status: true,
          date: true,
        },
      },
    },
  });

  if (stored.length > 0) {
    return stored.map((r) => ({
      eventId: r.eventId,
      score: r.score,
      reason: r.reason as unknown as ScoredReco["reason"],
    }));
  }

  // Fall back to cold-start recommendations
  return generateColdStartRecos(prisma, city, limit);
}

/**
 * Log a recommendation click for future tuning
 */
export async function logRecoClick(
  prisma: PrismaClient,
  userId: string,
  eventId: string
): Promise<void> {
  // Log clicks as event views for analytics
  await prisma.eventView.create({
    data: {
      eventId,
      userId,
    },
  });
}
