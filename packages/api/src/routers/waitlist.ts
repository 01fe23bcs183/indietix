import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";

export const waitlistRouter = router({
  join: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        userId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const event = await prisma.event.findUnique({
        where: { id: input.eventId },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event.status !== "PUBLISHED" && event.status !== "SOLD_OUT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Event is not available for waitlist",
        });
      }

      const existingEntry = await prisma.waitlistEntry.findFirst({
        where: {
          eventId: input.eventId,
          email: input.email,
          status: { in: ["ACTIVE", "INVITED"] },
        },
      });

      if (existingEntry) {
        return {
          success: true,
          entryId: existingEntry.id,
          message: "You are already on the waitlist",
        };
      }

      const entry = await prisma.waitlistEntry.create({
        data: {
          eventId: input.eventId,
          email: input.email,
          phone: input.phone,
          userId: input.userId,
          status: "ACTIVE",
        },
      });

      return {
        success: true,
        entryId: entry.id,
        message: "Successfully joined the waitlist",
      };
    }),

  status: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        email: z.string().email(),
      })
    )
    .query(async ({ input }) => {
      const entry = await prisma.waitlistEntry.findFirst({
        where: {
          eventId: input.eventId,
          email: input.email,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          offers: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

      if (!entry) {
        return {
          isOnWaitlist: false,
          status: null,
          offer: null,
        };
      }

      const latestOffer = entry.offers[0];

      return {
        isOnWaitlist: true,
        status: entry.status,
        offer: latestOffer
          ? {
              id: latestOffer.id,
              quantity: latestOffer.quantity,
              expiresAt: latestOffer.expiresAt,
              status: latestOffer.status,
            }
          : null,
      };
    }),

  claim: publicProcedure
    .input(
      z.object({
        offerId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const offer = await prisma.waitlistOffer.findUnique({
        where: { id: input.offerId },
        include: {
          entry: {
            include: {
              event: true,
            },
          },
        },
      });

      if (!offer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Offer not found",
        });
      }

      if (offer.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Offer is no longer available",
        });
      }

      const now = new Date();
      if (now > offer.expiresAt) {
        await prisma.$transaction(async (tx: typeof prisma) => {
          await tx.waitlistOffer.update({
            where: { id: offer.id },
            data: {
              status: "EXPIRED",
              expiredAt: now,
            },
          });

          await tx.waitlistEntry.update({
            where: { id: offer.entryId },
            data: {
              status: "ACTIVE",
              invitedAt: null,
            },
          });
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Offer has expired",
        });
      }

      await prisma.$transaction(async (tx: typeof prisma) => {
        await tx.waitlistOffer.update({
          where: { id: offer.id },
          data: {
            status: "CLAIMED",
            claimedAt: now,
          },
        });

        await tx.waitlistEntry.update({
          where: { id: offer.entryId },
          data: {
            status: "CLAIMED",
            claimedAt: now,
          },
        });
      });

      return {
        success: true,
        eventId: offer.entry.event.id,
        quantity: offer.quantity,
        message: "Offer claimed successfully. Proceed to checkout.",
      };
    }),

  getOffer: publicProcedure
    .input(
      z.object({
        offerId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const offer = await prisma.waitlistOffer.findUnique({
        where: { id: input.offerId },
        include: {
          entry: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  date: true,
                  venue: true,
                  city: true,
                  price: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!offer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Offer not found",
        });
      }

      return {
        id: offer.id,
        quantity: offer.quantity,
        expiresAt: offer.expiresAt,
        status: offer.status,
        event: offer.entry.event,
      };
    }),
});
