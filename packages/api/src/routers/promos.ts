import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import { applyPromo } from "@indietix/utils";
import { TRPCError } from "@trpc/server";

function requireAuth(ctx: { session?: { user?: { id: string; role: string } } }) {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }
  return ctx.session.user;
}

function requireOrganizerOrAdmin(user: { role: string }) {
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organizers and admins can manage promo codes",
    });
  }
}

export const promosRouter = router({
  create: publicProcedure
    .input(
      z.object({
        code: z.string().min(3).max(50).transform((s) => s.toUpperCase()),
        type: z.enum(["PERCENT", "FLAT"]),
        value: z.number().int().positive(),
        startAt: z.string().datetime().optional(),
        endAt: z.string().datetime().optional(),
        usageLimit: z.number().int().positive().optional(),
        perUserLimit: z.number().int().positive().optional(),
        minPrice: z.number().int().positive().optional(),
        applicableEvents: z.array(z.string()).optional(),
        applicableCategories: z.array(z.string()).optional(),
        applicableCities: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      if (input.type === "PERCENT" && (input.value < 1 || input.value > 100)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Percentage discount must be between 1 and 100",
        });
      }

      const existing = await prisma.promoCode.findUnique({
        where: { code: input.code },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Promo code already exists",
        });
      }

      let organizerId: string | null = null;
      if (user.role === "ORGANIZER") {
        const organizer = await prisma.organizer.findUnique({
          where: { userId: user.id },
        });
        if (!organizer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Organizer profile not found",
          });
        }
        organizerId = organizer.id;
      }

      const promoCode = await prisma.promoCode.create({
        data: {
          code: input.code,
          type: input.type,
          value: input.value,
          startAt: input.startAt ? new Date(input.startAt) : null,
          endAt: input.endAt ? new Date(input.endAt) : null,
          usageLimit: input.usageLimit ?? null,
          perUserLimit: input.perUserLimit ?? null,
          minPrice: input.minPrice ?? null,
          organizerId,
          applicableEvents: input.applicableEvents ?? [],
          applicableCategories: input.applicableCategories ?? [],
          applicableCities: input.applicableCities ?? [],
        },
      });

      return promoCode;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        startAt: z.string().datetime().optional(),
        endAt: z.string().datetime().optional(),
        usageLimit: z.number().int().positive().optional(),
        perUserLimit: z.number().int().positive().optional(),
        minPrice: z.number().int().positive().optional(),
        applicableEvents: z.array(z.string()).optional(),
        applicableCategories: z.array(z.string()).optional(),
        applicableCities: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      const promoCode = await prisma.promoCode.findUnique({
        where: { id: input.id },
      });

      if (!promoCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Promo code not found",
        });
      }

      if (user.role === "ORGANIZER") {
        const organizer = await prisma.organizer.findUnique({
          where: { userId: user.id },
        });
        if (!organizer || promoCode.organizerId !== organizer.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update your own promo codes",
          });
        }
      }

      const updated = await prisma.promoCode.update({
        where: { id: input.id },
        data: {
          startAt: input.startAt ? new Date(input.startAt) : undefined,
          endAt: input.endAt ? new Date(input.endAt) : undefined,
          usageLimit: input.usageLimit ?? undefined,
          perUserLimit: input.perUserLimit ?? undefined,
          minPrice: input.minPrice ?? undefined,
          applicableEvents: input.applicableEvents ?? undefined,
          applicableCategories: input.applicableCategories ?? undefined,
          applicableCities: input.applicableCities ?? undefined,
        },
      });

      return updated;
    }),

  disable: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      const promoCode = await prisma.promoCode.findUnique({
        where: { id: input.id },
      });

      if (!promoCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Promo code not found",
        });
      }

      if (user.role === "ORGANIZER") {
        const organizer = await prisma.organizer.findUnique({
          where: { userId: user.id },
        });
        if (!organizer || promoCode.organizerId !== organizer.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only disable your own promo codes",
          });
        }
      }

      const updated = await prisma.promoCode.update({
        where: { id: input.id },
        data: { active: false },
      });

      return updated;
    }),

  list: publicProcedure
    .input(
      z.object({
        organizerId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      let where: { organizerId?: string | null } = {};

      if (user.role === "ORGANIZER") {
        const organizer = await prisma.organizer.findUnique({
          where: { userId: user.id },
        });
        if (!organizer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Organizer profile not found",
          });
        }
        where.organizerId = organizer.id;
      } else if (input.organizerId) {
        where.organizerId = input.organizerId;
      }

      const promoCodes = await prisma.promoCode.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { bookings: true },
          },
        },
      });

      return promoCodes;
    }),

  get: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      const promoCode = await prisma.promoCode.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { bookings: true },
          },
        },
      });

      if (!promoCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Promo code not found",
        });
      }

      if (user.role === "ORGANIZER") {
        const organizer = await prisma.organizer.findUnique({
          where: { userId: user.id },
        });
        if (!organizer || promoCode.organizerId !== organizer.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only view your own promo codes",
          });
        }
      }

      return promoCode;
    }),

  validate: publicProcedure
    .input(
      z.object({
        code: z.string(),
        eventId: z.string(),
        qty: z.number().int().positive(),
        userId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const promoCode = await prisma.promoCode.findUnique({
        where: { code: input.code.toUpperCase() },
      });

      if (!promoCode) {
        return {
          valid: false,
          reason: "Invalid promo code",
        };
      }

      const event = await prisma.event.findUnique({
        where: { id: input.eventId },
      });

      if (!event) {
        return {
          valid: false,
          reason: "Event not found",
        };
      }

      let userUsageCount = 0;
      if (input.userId) {
        userUsageCount = await prisma.booking.count({
          where: {
            userId: input.userId,
            promoCodeId: promoCode.id,
            status: "CONFIRMED",
          },
        });
      }

      const result = applyPromo({
        code: promoCode,
        basePrice: event.price,
        qty: input.qty,
        now: new Date(),
        eventId: event.id,
        eventCategory: event.category,
        eventCity: event.city,
        userUsageCount,
      });

      return result;
    }),
});
