import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import {
  earnKarma,
  redeemReward,
  checkAndAwardStreak,
  checkEarlyBird,
  checkLowSalesHelp,
  getLeaderboard,
  getUserRank,
  getAvailableCities,
  getAvailableMonths,
  getCurrentMonth,
  getAllRewardsWithProgress,
  getAllBadges,
  EARNING_RULES,
} from "@indietix/loyalty";
import { TRPCError } from "@trpc/server";

export const loyaltyRouter = router({
  getKarma: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          karma: true,
          profileCompleted: true,
          referralCode: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        karma: user.karma,
        profileCompleted: user.profileCompleted,
        referralCode: user.referralCode,
      };
    }),

  history: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const transactions = await prisma.karmaTransaction.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        select: {
          id: true,
          delta: true,
          type: true,
          reason: true,
          refId: true,
          meta: true,
          held: true,
          createdAt: true,
        },
      });

      let nextCursor: string | undefined;
      if (transactions.length > input.limit) {
        const nextItem = transactions.pop();
        nextCursor = nextItem?.id;
      }

      return {
        transactions,
        nextCursor,
      };
    }),

  redeem: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        rewardKey: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await redeemReward({
        userId: input.userId,
        rewardKey: input.rewardKey,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error ?? "Failed to redeem reward",
        });
      }

      return {
        success: true,
        newBalance: result.newBalance,
        transactionId: result.transactionId,
        rewardGrantId: result.rewardGrantId,
        promoCode: result.promoCode,
      };
    }),

  rewards: router({
    catalog: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
          select: { karma: true },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        return getAllRewardsWithProgress(user.karma);
      }),

    grants: publicProcedure
      .input(
        z.object({
          userId: z.string(),
          status: z
            .enum(["PENDING", "ACTIVE", "USED", "EXPIRED", "CANCELLED"])
            .optional(),
        })
      )
      .query(async ({ input }) => {
        const grants = await prisma.rewardGrant.findMany({
          where: {
            userId: input.userId,
            ...(input.status ? { status: input.status } : {}),
          },
          orderBy: { createdAt: "desc" },
          include: {
            promoCode: {
              select: {
                code: true,
                endAt: true,
              },
            },
          },
        });

        return grants;
      }),
  }),

  badges: router({
    list: publicProcedure.query(async () => {
      const badges = getAllBadges();

      const dbBadges = await prisma.badge.findMany();

      if (dbBadges.length === 0) {
        await prisma.badge.createMany({
          data: badges.map((b) => ({
            key: b.key,
            name: b.name,
            description: b.description,
            icon: b.icon,
            threshold: b.threshold,
            category: b.category,
          })),
          skipDuplicates: true,
        });
      }

      return badges;
    }),

    userBadges: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }) => {
        const userBadges = await prisma.userBadge.findMany({
          where: { userId: input.userId },
          include: {
            badge: true,
          },
          orderBy: { earnedAt: "desc" },
        });

        return userBadges;
      }),

    check: publicProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input }) => {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
          select: { karma: true },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const bookingCount = await prisma.booking.count({
          where: { userId: input.userId, status: "CONFIRMED" },
        });

        const attendanceCount = await prisma.booking.count({
          where: { userId: input.userId, status: "ATTENDED" },
        });

        const existingBadges = await prisma.userBadge.findMany({
          where: { userId: input.userId },
          select: { badgeKey: true },
        });
        const existingKeys = new Set(existingBadges.map((b) => b.badgeKey));

        const allBadges = getAllBadges();
        const newBadges: string[] = [];

        for (const badge of allBadges) {
          if (existingKeys.has(badge.key)) continue;

          let earned = false;

          if (badge.category === "BOOKINGS") {
            if (badge.key === "FIRST_BOOKING" && bookingCount >= 1)
              earned = true;
            if (badge.key === "BOOKINGS_5" && bookingCount >= 5) earned = true;
            if (badge.key === "BOOKINGS_10" && bookingCount >= 10)
              earned = true;
            if (badge.key === "BOOKINGS_25" && bookingCount >= 25)
              earned = true;
            if (badge.key === "BOOKINGS_50" && bookingCount >= 50)
              earned = true;
          }

          if (badge.category === "ATTENDANCE") {
            if (badge.key === "FIRST_ATTENDANCE" && attendanceCount >= 1)
              earned = true;
            if (badge.key === "ATTENDANCE_5" && attendanceCount >= 5)
              earned = true;
            if (badge.key === "ATTENDANCE_10" && attendanceCount >= 10)
              earned = true;
            if (badge.key === "ATTENDANCE_25" && attendanceCount >= 25)
              earned = true;
          }

          if (badge.category === "KARMA") {
            if (badge.key === "KARMA_100" && user.karma >= 100) earned = true;
            if (badge.key === "KARMA_500" && user.karma >= 500) earned = true;
            if (badge.key === "KARMA_1000" && user.karma >= 1000) earned = true;
            if (badge.key === "KARMA_5000" && user.karma >= 5000) earned = true;
            if (badge.key === "KARMA_10000" && user.karma >= 10000)
              earned = true;
          }

          if (earned) {
            await prisma.userBadge.create({
              data: {
                userId: input.userId,
                badgeKey: badge.key,
              },
            });
            newBadges.push(badge.key);
          }
        }

        return { newBadges };
      }),
  }),

  leaderboard: router({
    get: publicProcedure
      .input(
        z.object({
          city: z.string(),
          month: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        const month = input.month ?? getCurrentMonth();
        return getLeaderboard(input.city, month, input.limit, input.offset);
      }),

    userRank: publicProcedure
      .input(
        z.object({
          userId: z.string(),
          city: z.string(),
          month: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const month = input.month ?? getCurrentMonth();
        return getUserRank(input.userId, input.city, month);
      }),

    cities: publicProcedure.query(async () => {
      return getAvailableCities();
    }),

    months: publicProcedure.query(async () => {
      return getAvailableMonths();
    }),
  }),

  perks: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const perks = await prisma.userPerks.findUnique({
        where: { userId: input.userId },
      });

      return {
        flags: perks?.flags ?? [],
        hasEarlyAccess: perks?.flags.includes("EARLY_ACCESS") ?? false,
        hasWaitlistPriority:
          perks?.flags.includes("WAITLIST_PRIORITY") ?? false,
        hasVIP: perks?.flags.includes("VIP") ?? false,
        hasGoldStatus: perks?.flags.includes("GOLD_STATUS") ?? false,
      };
    }),

  rules: publicProcedure.query(() => {
    return Object.values(EARNING_RULES).map((rule) => ({
      reason: rule.reason,
      delta: rule.delta,
      description: rule.description,
    }));
  }),

  earn: router({
    book: publicProcedure
      .input(
        z.object({
          userId: z.string(),
          bookingId: z.string(),
          eventDate: z.date(),
        })
      )
      .mutation(async ({ input }) => {
        const bookResult = await earnKarma({
          userId: input.userId,
          reason: "BOOK",
          refId: input.bookingId,
        });

        const earlyBirdResult = await checkEarlyBird(
          input.userId,
          input.bookingId,
          input.eventDate
        );

        return {
          book: bookResult,
          earlyBird: earlyBirdResult,
        };
      }),

    attend: publicProcedure
      .input(
        z.object({
          userId: z.string(),
          bookingId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const attendResult = await earnKarma({
          userId: input.userId,
          reason: "ATTEND",
          refId: input.bookingId,
        });

        const streakResult = await checkAndAwardStreak(input.userId);

        return {
          attend: attendResult,
          streak: streakResult,
        };
      }),

    referral: publicProcedure
      .input(
        z.object({
          referrerId: z.string(),
          refereeId: z.string(),
          bookingId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const existingReferral = await prisma.referral.findUnique({
          where: {
            referrerId_refereeId: {
              referrerId: input.referrerId,
              refereeId: input.refereeId,
            },
          },
        });

        if (existingReferral?.credited) {
          return { success: false, alreadyCredited: true };
        }

        if (!existingReferral) {
          await prisma.referral.create({
            data: {
              referrerId: input.referrerId,
              refereeId: input.refereeId,
              bookingId: input.bookingId,
              credited: false,
            },
          });
        }

        const result = await earnKarma({
          userId: input.referrerId,
          reason: "REFERRAL",
          refId: input.refereeId,
          meta: { bookingId: input.bookingId },
        });

        if (result.success && !result.alreadyEarned) {
          await prisma.referral.update({
            where: {
              referrerId_refereeId: {
                referrerId: input.referrerId,
                refereeId: input.refereeId,
              },
            },
            data: { credited: true },
          });
        }

        return result;
      }),

    review: publicProcedure
      .input(
        z.object({
          userId: z.string(),
          bookingId: z.string(),
          eventId: z.string(),
          rating: z.number().min(1).max(5),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const booking = await prisma.booking.findFirst({
          where: {
            id: input.bookingId,
            userId: input.userId,
            status: "ATTENDED",
          },
        });

        if (!booking) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You must attend the event before posting a review",
          });
        }

        const existingReview = await prisma.review.findUnique({
          where: { bookingId: input.bookingId },
        });

        if (existingReview) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You have already reviewed this booking",
          });
        }

        await prisma.review.create({
          data: {
            userId: input.userId,
            eventId: input.eventId,
            bookingId: input.bookingId,
            rating: input.rating,
            comment: input.comment,
          },
        });

        const result = await earnKarma({
          userId: input.userId,
          reason: "REVIEW",
          refId: input.bookingId,
        });

        return result;
      }),

    share: publicProcedure
      .input(
        z.object({
          userId: z.string(),
          eventId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return earnKarma({
          userId: input.userId,
          reason: "SHARE",
          refId: input.eventId,
        });
      }),

    profile: publicProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input }) => {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
          select: { profileCompleted: true },
        });

        if (user?.profileCompleted) {
          return { success: false, alreadyCompleted: true };
        }

        await prisma.user.update({
          where: { id: input.userId },
          data: { profileCompleted: true },
        });

        return earnKarma({
          userId: input.userId,
          reason: "PROFILE",
          refId: input.userId,
        });
      }),

    lowSalesHelp: publicProcedure
      .input(
        z.object({
          userId: z.string(),
          bookingId: z.string(),
          eventId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return checkLowSalesHelp(input.userId, input.bookingId, input.eventId);
      }),
  }),
});
