import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";

const effectivePriceSchema = z.object({
  eventId: z.string(),
  now: z.date().optional(),
});

export const pricingRouter = router({
  effectivePrice: publicProcedure
    .input(effectivePriceSchema)
    .query(async ({ input }) => {
      const now = input.now || new Date();

      const event = await prisma.event.findUnique({
        where: { id: input.eventId },
        include: {
          pricePhases: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      let activePhase = null;
      for (const phase of event.pricePhases) {
        const timeValid =
          (!phase.startsAt || now >= phase.startsAt) &&
          (!phase.endsAt || now <= phase.endsAt);

        const seatsValid =
          !phase.maxSeats || event.bookedSeats < phase.maxSeats;

        if (timeValid && seatsValid) {
          activePhase = phase;
          break; // Use first matching phase
        }
      }

      return {
        basePrice: event.price,
        effectivePrice: activePhase ? activePhase.price : event.price,
        activePhase: activePhase
          ? {
              id: activePhase.id,
              name: activePhase.name,
              price: activePhase.price,
              endsAt: activePhase.endsAt,
              maxSeats: activePhase.maxSeats,
            }
          : null,
      };
    }),

  createPhase: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        name: z.string(),
        startsAt: z.date().optional(),
        endsAt: z.date().optional(),
        maxSeats: z.number().positive().optional(),
        price: z.number().positive(),
      })
    )
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

      const event = await prisma.event.findUnique({
        where: { id: input.eventId },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (user.role !== "ADMIN" && event.organizerId !== user.organizer?.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const phase = await prisma.eventPricePhase.create({
        data: {
          eventId: input.eventId,
          name: input.name,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          maxSeats: input.maxSeats,
          price: input.price,
        },
      });

      return phase;
    }),

  listPhases: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input }) => {
      const phases = await prisma.eventPricePhase.findMany({
        where: { eventId: input.eventId },
        orderBy: { createdAt: "asc" },
      });

      return phases;
    }),

  deletePhase: publicProcedure
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

      const phase = await prisma.eventPricePhase.findUnique({
        where: { id: input.id },
        include: { event: true },
      });

      if (!phase) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Price phase not found",
        });
      }

      if (
        user.role !== "ADMIN" &&
        phase.event.organizerId !== user.organizer?.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await prisma.eventPricePhase.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
