import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma, Prisma, FlashSaleStatus, EventStatus } from "@indietix/db";
import { TRPCError } from "@trpc/server";
import { evaluateFlashRules, DEFAULT_FLASH_CONFIG } from "@indietix/flash";
import type { EventMetrics } from "@indietix/flash";

// Used in suggestions query
void DEFAULT_FLASH_CONFIG;

const requireAuth = (ctx: {
  session?: { user?: { id: string; email: string; role: string } };
}) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }
  return ctx.session.user;
};

const requireOrganizer = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organizer: true },
  });

  if (!user?.organizer) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User is not an organizer",
    });
  }

  return user.organizer;
};

const checkEventOwnership = async (
  eventId: string,
  organizerId: string,
  userRole: string
) => {
  if (userRole === "ADMIN") {
    return;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });

  if (!event) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Event not found",
    });
  }

  if (event.organizerId !== organizerId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to manage this event",
    });
  }
};

export const flashRouter = router({
  /**
   * Get flash sale suggestions for events within a time window
   */
  suggestions: publicProcedure
    .input(
      z.object({
        windowHours: z.number().min(1).max(24).default(6),
        organizerId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);

      // Get events within the time window
      const now = new Date();
      const windowEnd = new Date(
        now.getTime() + input.windowHours * 60 * 60 * 1000
      );

      const whereClause: Prisma.EventWhereInput = {
        date: {
          gte: now,
          lte: windowEnd,
        },
        status: EventStatus.PUBLISHED,
      };

      // If user is not admin, filter by their organizer
      if (user.role !== "ADMIN") {
        const organizer = await requireOrganizer(user.id);
        whereClause.organizerId = organizer.id;
      } else if (input.organizerId) {
        whereClause.organizerId = input.organizerId;
      }

      const events = await prisma.event.findMany({
        where: whereClause,
        include: {
          flashSales: {
            where: {
              status: { in: ["ACTIVE", "ENDED"] },
            },
            orderBy: { endsAt: "desc" },
            take: 1,
          },
          bookings: {
            where: {
              createdAt: {
                gte: new Date(now.getTime() - 6 * 60 * 60 * 1000),
              },
              status: { in: ["PENDING", "CONFIRMED"] },
            },
          },
        },
      });

      // Evaluate flash rules for each event
      const suggestions = events.map((event) => {
        const metrics: EventMetrics = {
          eventId: event.id,
          totalSeats: event.totalSeats,
          bookedSeats: event.bookedSeats,
          eventDate: event.date,
          basePrice: event.price,
          city: event.city,
          venue: event.venue,
          lastFlashSaleEndedAt: event.flashSales[0]?.endsAt,
          recentBookings: event.bookings.length,
        };

        const suggestion = evaluateFlashRules(metrics, now);

        return {
          event: {
            id: event.id,
            title: event.title,
            slug: event.slug,
            date: event.date,
            city: event.city,
            venue: event.venue,
            totalSeats: event.totalSeats,
            bookedSeats: event.bookedSeats,
            price: event.price,
          },
          suggestion,
        };
      });

      return suggestions;
    }),

  /**
   * Create a new flash sale
   */
  create: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        discountPercent: z.number().min(1).max(100),
        durationHours: z.number().min(0.5).max(24).default(2),
        maxSeats: z.number().min(1).optional(),
        minFlashPrice: z.number().min(0).optional(),
        cityRadius: z.number().min(1).max(50).default(5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);
      await checkEventOwnership(input.eventId, organizer.id, user.role);

      // Get event details
      const event = await prisma.event.findUnique({
        where: { id: input.eventId },
        include: {
          flashSales: {
            where: {
              status: { in: ["PENDING", "ACTIVE"] },
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Check for existing active flash sale
      if (event.flashSales.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Event already has an active or pending flash sale",
        });
      }

      // Check cooldown (24h since last flash sale)
      const lastFlashSale = await prisma.flashSale.findFirst({
        where: {
          eventId: input.eventId,
          status: "ENDED",
        },
        orderBy: { endsAt: "desc" },
      });

      if (lastFlashSale) {
        const hoursSinceLastSale =
          (Date.now() - lastFlashSale.endsAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSale < 24) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Flash sale cooldown: ${Math.ceil(24 - hoursSinceLastSale)} hours remaining`,
          });
        }
      }

      // Calculate max seats (default to 50% of remaining)
      const remainingSeats = event.totalSeats - event.bookedSeats;
      const maxSeats =
        input.maxSeats ?? Math.max(1, Math.floor(remainingSeats * 0.5));

      if (maxSeats > remainingSeats) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Max seats (${maxSeats}) exceeds remaining seats (${remainingSeats})`,
        });
      }

      // Calculate time window
      const now = new Date();
      const startsAt = now;
      const endsAt = new Date(
        now.getTime() + input.durationHours * 60 * 60 * 1000
      );

      // Ensure flash sale ends before event starts
      if (endsAt > event.date) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Flash sale must end before event starts",
        });
      }

      // Create flash sale
      const flashSale = await prisma.flashSale.create({
        data: {
          eventId: input.eventId,
          discountPercent: input.discountPercent,
          startsAt,
          endsAt,
          maxSeats,
          minFlashPrice: input.minFlashPrice,
          cityRadius: input.cityRadius,
          status: "ACTIVE",
        },
      });

      return flashSale;
    }),

  /**
   * Update a flash sale
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        discountPercent: z.number().min(1).max(100).optional(),
        maxSeats: z.number().min(1).optional(),
        endsAt: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);

      const flashSale = await prisma.flashSale.findUnique({
        where: { id: input.id },
        include: { event: true },
      });

      if (!flashSale) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Flash sale not found",
        });
      }

      if (flashSale.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only update active flash sales",
        });
      }

      const organizer = await requireOrganizer(user.id);
      await checkEventOwnership(flashSale.eventId, organizer.id, user.role);

      const updated = await prisma.flashSale.update({
        where: { id: input.id },
        data: {
          discountPercent: input.discountPercent,
          maxSeats: input.maxSeats,
          endsAt: input.endsAt,
        },
      });

      return updated;
    }),

  /**
   * Cancel a flash sale
   */
  cancel: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);

      const flashSale = await prisma.flashSale.findUnique({
        where: { id: input.id },
        include: { event: true },
      });

      if (!flashSale) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Flash sale not found",
        });
      }

      if (flashSale.status === "ENDED" || flashSale.status === "CANCELLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Flash sale is already ended or cancelled",
        });
      }

      const organizer = await requireOrganizer(user.id);
      await checkEventOwnership(flashSale.eventId, organizer.id, user.role);

      const cancelled = await prisma.flashSale.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });

      return cancelled;
    }),

  /**
   * Get flash sale by ID
   */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const flashSale = await prisma.flashSale.findUnique({
        where: { id: input.id },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              date: true,
              city: true,
              venue: true,
              price: true,
              totalSeats: true,
              bookedSeats: true,
            },
          },
        },
      });

      if (!flashSale) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Flash sale not found",
        });
      }

      return flashSale;
    }),

  /**
   * Get active flash sale for an event
   */
  getActiveForEvent: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input }) => {
      const now = new Date();

      const flashSale = await prisma.flashSale.findFirst({
        where: {
          eventId: input.eventId,
          status: "ACTIVE",
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
      });

      return flashSale;
    }),

  /**
   * List flash sales for an event
   */
  listForEvent: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        status: z.enum(["PENDING", "ACTIVE", "ENDED", "CANCELLED"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const flashSales = await prisma.flashSale.findMany({
        where: {
          eventId: input.eventId,
          ...(input.status && { status: input.status }),
        },
        orderBy: { createdAt: "desc" },
      });

      return flashSales;
    }),

  /**
   * Admin: List all flash sales with filters
   */
  adminList: publicProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "ACTIVE", "ENDED", "CANCELLED"]).optional(),
        city: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const where: Prisma.FlashSaleWhereInput = {};

      if (input.status) {
        where.status = input.status as FlashSaleStatus;
      }

      if (input.city) {
        where.event = { city: input.city };
      }

      const [flashSales, total] = await Promise.all([
        prisma.flashSale.findMany({
          where,
          include: {
            event: {
              select: {
                id: true,
                title: true,
                slug: true,
                date: true,
                city: true,
                venue: true,
                price: true,
                totalSeats: true,
                bookedSeats: true,
                organizer: {
                  select: {
                    id: true,
                    businessName: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        prisma.flashSale.count({ where }),
      ]);

      return {
        flashSales,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  /**
   * Admin: Stop/pause a flash sale
   */
  adminStop: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      const flashSale = await prisma.flashSale.findUnique({
        where: { id: input.id },
      });

      if (!flashSale) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Flash sale not found",
        });
      }

      if (flashSale.status !== "ACTIVE" && flashSale.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only stop active or pending flash sales",
        });
      }

      const stopped = await prisma.flashSale.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });

      return stopped;
    }),
});
