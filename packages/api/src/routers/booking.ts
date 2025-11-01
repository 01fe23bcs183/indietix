import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import {
  computeBookingAmounts,
  createSignedTicket,
  encodeTicketForQR,
  hashTicketPayload,
} from "@indietix/utils";
import { getPaymentProvider } from "@indietix/payments";
import { TRPCError } from "@trpc/server";

const HOLD_TTL_MINUTES = 15;

function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TIX-${timestamp}-${random}`;
}

async function reserveSeats(eventId: string, quantity: number) {
  return await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Event not found",
      });
    }

    if (event.bookedSeats + quantity > event.totalSeats) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Not enough seats available",
      });
    }

    return event;
  });
}

async function confirmBookingAndIncrementSeats(bookingId: string) {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { event: true },
    });

    if (!booking) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Booking not found",
      });
    }

    if (
      booking.status === "CONFIRMED" &&
      booking.paymentStatus === "COMPLETED"
    ) {
      return booking;
    }

    const ticket = createSignedTicket(
      booking.id,
      booking.userId,
      booking.eventId
    );
    const qrCode = encodeTicketForQR(ticket);
    const ticketPayloadHash = hashTicketPayload(ticket.payload);

    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        paymentStatus: "COMPLETED",
        qrCode,
        ticketPayloadHash,
      },
    });

    await tx.event.update({
      where: { id: booking.eventId },
      data: {
        bookedSeats: {
          increment: booking.seats,
        },
      },
    });

    return updatedBooking;
  });
}

export const bookingRouter = router({
  start: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        quantity: z.number().int().min(1).max(10),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const event = await reserveSeats(input.eventId, input.quantity);

      const amounts = computeBookingAmounts(event.price, input.quantity);

      const holdExpiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000);

      const ticketNumber = generateTicketNumber();

      const booking = await prisma.booking.create({
        data: {
          eventId: input.eventId,
          userId: input.userId,
          ticketNumber,
          seats: amounts.seats,
          ticketPrice: amounts.ticketPrice,
          convenienceFee: amounts.convenienceFee,
          platformFee: amounts.platformFee,
          finalAmount: amounts.finalAmount,
          holdExpiresAt,
          paymentStatus: "PENDING",
          status: "PENDING",
        },
      });

      const paymentProvider = getPaymentProvider();
      const paymentOrder = await paymentProvider.createOrder({
        amountINR: amounts.finalAmount,
        receipt: booking.id,
      });

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          razorpayOrderId: paymentOrder.orderId,
        },
      });

      return {
        bookingId: booking.id,
        ticketNumber: booking.ticketNumber,
        holdExpiresAt: booking.holdExpiresAt,
        amountBreakdown: {
          subtotal: amounts.subtotal,
          convenienceFee: amounts.convenienceFee,
          platformFee: amounts.platformFee,
          gst: amounts.gst,
          finalAmount: amounts.finalAmount,
        },
        paymentProvider: {
          kind: paymentProvider.kind,
          orderId: paymentOrder.orderId,
          keyId:
            paymentProvider.kind === "razorpay"
              ? process.env.RAZORPAY_KEY_ID
              : undefined,
        },
      };
    }),

  poll: publicProcedure
    .input(
      z.object({
        bookingId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const booking = await prisma.booking.findUnique({
        where: { id: input.bookingId },
        include: {
          event: {
            select: {
              title: true,
              date: true,
              venue: true,
              city: true,
            },
          },
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      return {
        bookingId: booking.id,
        ticketNumber: booking.ticketNumber,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        holdExpiresAt: booking.holdExpiresAt,
        event: booking.event,
        finalAmount: booking.finalAmount,
      };
    }),

  cancel: publicProcedure
    .input(
      z.object({
        bookingId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const booking = await prisma.booking.findUnique({
        where: { id: input.bookingId },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      if (booking.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending bookings can be cancelled",
        });
      }

      await prisma.booking.update({
        where: { id: input.bookingId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      });

      return {
        success: true,
        message: "Booking cancelled successfully",
      };
    }),

  confirmPayment: publicProcedure
    .input(
      z.object({
        bookingId: z.string(),
        razorpayPaymentId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const booking = await confirmBookingAndIncrementSeats(input.bookingId);

      if (input.razorpayPaymentId) {
        await prisma.booking.update({
          where: { id: input.bookingId },
          data: {
            razorpayPaymentId: input.razorpayPaymentId,
          },
        });
      }

      return {
        success: true,
        booking: {
          id: booking.id,
          ticketNumber: booking.ticketNumber,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
        },
      };
    }),
});
