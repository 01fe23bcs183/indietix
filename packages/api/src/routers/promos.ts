import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";
import { applyPromo } from "@indietix/utils";

const createPromoCodeSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  type: z.enum(["PERCENT", "FLAT"]),
  value: z.number().positive(),
  startAt: z.date().optional(),
  endAt: z.date().optional(),
  usageLimit: z.number().positive().optional(),
  perUserLimit: z.number().positive().optional(),
  minPrice: z.number().positive().optional(),
  organizerId: z.string().optional(),
  applicableEvents: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional(),
  applicableCities: z.array(z.string()).optional(),
});

const updatePromoCodeSchema = z.object({
  id: z.string(),
  active: z.boolean().optional(),
  startAt: z.date().optional(),
  endAt: z.date().optional(),
  usageLimit: z.number().positive().optional(),
  perUserLimit: z.number().positive().optional(),
});

const validatePromoSchema = z.object({
  code: z.string(),
  eventId: z.string(),
  quantity: z.number().positive(),
  userId: z.string().optional(),
});

export const promosRouter = router({
  create: publicProcedure
    .input(createPromoCodeSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { organizer: true },
      });

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const organizerId =
        user.role === "ORGANIZER" ? user.organizer?.id : input.organizerId;

      const existing = await prisma.promoCode.findUnique({
        where: { code: input.code },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Promo code already exists",
        });
      }

      if (input.type === "PERCENT" && (input.value < 1 || input.value > 100)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Percentage must be between 1 and 100",
        });
      }

      const promoCode = await prisma.promoCode.create({
        data: {
          code: input.code,
          type: input.type,
          value: input.value,
          startAt: input.startAt,
          endAt: input.endAt,
          usageLimit: input.usageLimit,
          perUserLimit: input.perUserLimit,
          minPrice: input.minPrice,
          organizerId,
          applicableEvents: input.applicableEvents || [],
          applicableCategories: input.applicableCategories || [],
          applicableCities: input.applicableCities || [],
        },
      });

      return promoCode;
    }),

  update: publicProcedure
    .input(updatePromoCodeSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { organizer: true },
      });

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const promoCode = await prisma.promoCode.findUnique({
        where: { id: input.id },
      });

      if (!promoCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Promo code not found",
        });
      }

      if (
        user.role !== "ADMIN" &&
        promoCode.organizerId !== user.organizer?.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updated = await prisma.promoCode.update({
        where: { id: input.id },
        data: {
          active: input.active,
          startAt: input.startAt,
          endAt: input.endAt,
          usageLimit: input.usageLimit,
          perUserLimit: input.perUserLimit,
        },
      });

      return updated;
    }),

  disable: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { organizer: true },
      });

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const promoCode = await prisma.promoCode.findUnique({
        where: { id: input.id },
      });

      if (!promoCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Promo code not found",
        });
      }

      if (
        user.role !== "ADMIN" &&
        promoCode.organizerId !== user.organizer?.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updated = await prisma.promoCode.update({
        where: { id: input.id },
        data: { active: false },
      });

      return updated;
    }),

  validate: publicProcedure
    .input(validatePromoSchema)
    .query(async ({ input }) => {
      const promoCode = await prisma.promoCode.findUnique({
        where: { code: input.code },
      });

      if (!promoCode) {
        return {
          valid: false,
          reason: "Promo code not found",
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

      if (promoCode.usageLimit) {
        const totalUsage = await prisma.booking.count({
          where: {
            promoCodeId: promoCode.id,
            status: "CONFIRMED",
          },
        });

        if (totalUsage >= promoCode.usageLimit) {
          return {
            valid: false,
            reason: "Promo code usage limit reached",
          };
        }
      }

      const result = applyPromo({
        code: promoCode,
        basePrice: event.price,
        quantity: input.quantity,
        now: new Date(),
        eventId: event.id,
        eventCategory: event.category,
        eventCity: event.city,
        userId: input.userId,
        userUsageCount,
      });

      return result;
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: { organizer: true },
    });

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const where =
      user.role === "ADMIN"
        ? {}
        : { organizerId: user.organizer?.id || "none" };

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
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

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

      return promoCode;
    }),
});
