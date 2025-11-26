import type { PrismaClient } from "@indietix/db";
import type { UserProfileVector } from "./types";
import { getTimeSlot } from "./config";

/**
 * Compute user profile vector from their booking and view history
 */
export async function computeUserProfile(
  prisma: PrismaClient,
  userId: string
): Promise<UserProfileVector> {
  // Get user's confirmed bookings with event details
  const bookings = await prisma.booking.findMany({
    where: {
      userId,
      status: { in: ["CONFIRMED", "ATTENDED"] },
    },
    include: {
      event: {
        select: {
          category: true,
          city: true,
          price: true,
          date: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get user's event views
  const views = await prisma.eventView.findMany({
    where: { userId },
    include: {
      event: {
        select: {
          category: true,
          city: true,
          price: true,
          date: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100, // Limit to recent views
  });

  // Compute category frequency (bookings weighted 3x, views weighted 1x)
  const catFreq: Record<string, number> = {};

  for (const booking of bookings) {
    const cat = booking.event.category;
    catFreq[cat] = (catFreq[cat] || 0) + 3;
  }

  for (const view of views) {
    const cat = view.event.category;
    catFreq[cat] = (catFreq[cat] || 0) + 1;
  }

  // Compute median price from bookings
  const prices = bookings.map((b) => b.event.price).sort((a, b) => a - b);
  const priceP50 =
    prices.length > 0 ? (prices[Math.floor(prices.length / 2)] ?? 0) : 0;

  // Compute preferred areas (top 3 cities from bookings)
  const cityCounts: Record<string, number> = {};
  for (const booking of bookings) {
    const city = booking.event.city;
    cityCounts[city] = (cityCounts[city] || 0) + 1;
  }
  const preferredAreas = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([city]) => city);

  // Compute preferred time slots from booking event dates
  const slotCounts: Record<string, number> = {};
  for (const booking of bookings) {
    const hour = booking.event.date.getHours();
    const slot = getTimeSlot(hour);
    slotCounts[slot] = (slotCounts[slot] || 0) + 1;
  }
  const timeSlots = Object.entries(slotCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([slot]) => slot);

  return {
    userId,
    catFreq,
    priceP50,
    preferredAreas,
    timeSlots,
  };
}

/**
 * Batch compute and store user profiles for all active users
 */
export async function batchComputeProfiles(
  prisma: PrismaClient
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];

  // Get users with at least one confirmed booking
  const users = await prisma.user.findMany({
    where: {
      bookings: {
        some: {
          status: { in: ["CONFIRMED", "ATTENDED"] },
        },
      },
    },
    select: { id: true },
  });

  let processed = 0;

  for (const user of users) {
    try {
      const profile = await computeUserProfile(prisma, user.id);

      await prisma.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          catFreq: profile.catFreq,
          priceP50: profile.priceP50,
          preferredAreas: profile.preferredAreas,
          timeSlots: profile.timeSlots,
        },
        update: {
          catFreq: profile.catFreq,
          priceP50: profile.priceP50,
          preferredAreas: profile.preferredAreas,
          timeSlots: profile.timeSlots,
        },
      });

      processed++;
    } catch (error) {
      errors.push(`Failed to compute profile for user ${user.id}: ${error}`);
    }
  }

  return { processed, errors };
}

/**
 * Get stored user profile or compute on-demand
 */
export async function getUserProfile(
  prisma: PrismaClient,
  userId: string
): Promise<UserProfileVector | null> {
  // Try to get stored profile first
  const stored = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (stored) {
    return {
      userId: stored.userId,
      catFreq: stored.catFreq as Record<string, number>,
      priceP50: stored.priceP50,
      preferredAreas: stored.preferredAreas,
      timeSlots: stored.timeSlots,
    };
  }

  // Compute on-demand if not stored
  return computeUserProfile(prisma, userId);
}
