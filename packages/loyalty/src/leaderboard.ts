import { prisma, Prisma } from "@indietix/db";

export interface LeaderboardEntryWithUser {
  rank: number;
  userId: string;
  userName: string;
  score: number;
}

export interface LeaderboardResult {
  city: string;
  month: string;
  entries: LeaderboardEntryWithUser[];
  totalEntries: number;
}

export async function getLeaderboard(
  city: string,
  month: string,
  limit = 50,
  offset = 0
): Promise<LeaderboardResult> {
  const entries = await prisma.leaderboardEntry.findMany({
    where: { city, month },
    orderBy: { score: "desc" },
    take: limit,
    skip: offset,
    include: {
      user: {
        select: { name: true },
      },
    },
  });

  const totalEntries = await prisma.leaderboardEntry.count({
    where: { city, month },
  });

  return {
    city,
    month,
    entries: entries.map((entry, index) => ({
      rank: offset + index + 1,
      userId: entry.userId,
      userName: entry.user.name,
      score: entry.score,
    })),
    totalEntries,
  };
}

export async function getUserRank(
  userId: string,
  city: string,
  month: string
): Promise<{ rank: number; score: number } | null> {
  const userEntry = await prisma.leaderboardEntry.findUnique({
    where: {
      city_month_userId: { city, month, userId },
    },
  });

  if (!userEntry) {
    return null;
  }

  const higherRanked = await prisma.leaderboardEntry.count({
    where: {
      city,
      month,
      score: { gt: userEntry.score },
    },
  });

  return {
    rank: higherRanked + 1,
    score: userEntry.score,
  };
}

export interface RecomputeResult {
  citiesProcessed: number;
  entriesCreated: number;
}

export async function recomputeLeaderboard(month: string): Promise<RecomputeResult> {
  const cities = await prisma.event.findMany({
    select: { city: true },
    distinct: ["city"],
  });

  let totalEntries = 0;
  for (const { city } of cities) {
    const entriesCreated = await recomputeCityLeaderboard(city, month);
    totalEntries += entriesCreated;
  }

  return {
    citiesProcessed: cities.length,
    entriesCreated: totalEntries,
  };
}

export async function recomputeCityLeaderboard(
  city: string,
  month: string
): Promise<number> {
  const parts = month.split("-").map(Number);
  const year = parts[0] ?? 2024;
  const monthNum = parts[1] ?? 1;
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

  const userScores = await prisma.karmaTransaction.groupBy({
    by: ["userId"],
    where: {
      type: "EARN",
      held: false,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      user: {
        bookings: {
          some: {
            event: { city },
          },
        },
      },
    },
    _sum: {
      delta: true,
    },
    orderBy: {
      _sum: {
        delta: "desc",
      },
    },
  });

  const entriesToCreate = userScores
    .filter((score) => score._sum.delta && score._sum.delta > 0)
    .map((score) => ({
      city,
      month,
      userId: score.userId,
      score: score._sum.delta ?? 0,
    }));

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.leaderboardEntry.deleteMany({
      where: { city, month },
    });

    if (entriesToCreate.length > 0) {
      await tx.leaderboardEntry.createMany({
        data: entriesToCreate,
      });
    }
  });

  return entriesToCreate.length;
}

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function getAvailableCities(): Promise<string[]> {
  const cities = await prisma.event.findMany({
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });

  return cities.map((c) => c.city);
}

export async function getAvailableMonths(): Promise<string[]> {
  const transactions = await prisma.karmaTransaction.findMany({
    select: { createdAt: true },
    distinct: ["createdAt"],
    orderBy: { createdAt: "desc" },
  });

  const months = new Set<string>();
  for (const t of transactions) {
    months.add(t.createdAt.toISOString().slice(0, 7));
  }

  return Array.from(months).sort().reverse();
}
