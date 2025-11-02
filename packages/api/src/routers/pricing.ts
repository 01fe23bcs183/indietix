import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import { getEffectivePrice } from "@indietix/utils";
import { TRPCError } from "@trpc/server";

export const pricingRouter = router({
  effectivePrice: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        now: z.string().datetime().optional(),
      })
    )
    .query(async ({ input }) => {
      const event = await prisma.event.findUnique({
        where: { id: input.eventId },
        include: {
          pricePhases: true,
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      const now = input.now ? new Date(input.now) : new Date();

      const result = getEffectivePrice(
        event.price,
        event.pricePhases,
        event.bookedSeats,
        now
      );

      return {
        eventId: event.id,
        basePrice: result.basePrice,
        effectivePrice: result.effectivePrice,
        activePhase: result.activePhase
          ? {
              id: result.activePhase.id,
              name: result.activePhase.name,
              price: result.activePhase.price,
            }
          : null,
        message: result.message,
      };
    }),
});
