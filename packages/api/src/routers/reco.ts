import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { prisma, type Prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";
import {
  getStoredRecos,
  computeRecosForUser,
  logRecoClick,
  getConfig,
} from "@indietix/reco";

export const recoRouter = router({
  /**
   * Get recommendations for the current user
   * Returns stored recommendations or computes on-demand for new users
   */
  forUser: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(20),
        city: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;

      if (!userId) {
        // Return popular events for anonymous users
        const now = new Date();
        const events = await prisma.event.findMany({
          where: {
            status: "PUBLISHED",
            date: { gt: now },
            hidden: false,
            ...(input.city ? { city: input.city } : {}),
          },
          orderBy: [{ bookedSeats: "desc" }, { date: "asc" }],
          take: input.limit,
          select: {
            id: true,
            title: true,
            slug: true,
            category: true,
            city: true,
            venue: true,
            date: true,
            price: true,
            totalSeats: true,
            bookedSeats: true,
            organizer: {
              select: {
                businessName: true,
              },
            },
          },
        });

        return {
          recommendations: events.map((event, index) => ({
            event,
            score: 1 - index * 0.02, // Decreasing score by position
            reason: {
              type: "popular" as const,
              details: {
                popularityScore:
                  event.totalSeats > 0
                    ? event.bookedSeats / event.totalSeats
                    : 0,
              },
            },
          })),
          isPersonalized: false,
        };
      }

      // Get stored recommendations for logged-in users
      const recos = await getStoredRecos(
        prisma,
        userId,
        input.limit,
        input.city
      );

      // Fetch event details for recommendations
      const eventIds = recos.map((r) => r.eventId);
      const events = await prisma.event.findMany({
        where: {
          id: { in: eventIds },
          status: "PUBLISHED",
          date: { gt: new Date() },
          hidden: false,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          city: true,
          venue: true,
          date: true,
          price: true,
          totalSeats: true,
          bookedSeats: true,
          organizer: {
            select: {
              businessName: true,
            },
          },
        },
      });

      // Create a map for quick lookup
      const eventMap = new Map(events.map((e) => [e.id, e]));

      // Combine recommendations with event details, preserving order
      const recommendations = recos
        .map((reco) => {
          const event = eventMap.get(reco.eventId);
          if (!event) return null;
          return {
            event,
            score: reco.score,
            reason: reco.reason,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      return {
        recommendations,
        isPersonalized: true,
      };
    }),

  /**
   * Log a click on a recommendation for future tuning
   */
  logClick: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        position: z.number(),
        score: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;

      if (!userId) {
        // Still log anonymous clicks as event views
        await prisma.eventView.create({
          data: {
            eventId: input.eventId,
            userId: null,
          },
        });
        return { success: true };
      }

      await logRecoClick(prisma, userId, input.eventId);

      return { success: true };
    }),

  /**
   * Force refresh recommendations for the current user
   * Useful for testing or when user wants fresh recommendations
   */
  refresh: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be logged in to refresh recommendations",
        });
      }

      const config = getConfig();
      const recos = await computeRecosForUser(
        prisma,
        userId,
        input.city,
        config
      );

      // Store the new recommendations
      await prisma.userReco.deleteMany({
        where: { userId },
      });

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

      return {
        count: recos.length,
        message: `Generated ${recos.length} recommendations`,
      };
    }),
});
