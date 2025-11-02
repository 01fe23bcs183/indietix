import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma, Prisma } from "@indietix/db";
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
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
              price: true,
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
        eventId: booking.eventId,
        ticketNumber: booking.ticketNumber,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        holdExpiresAt: booking.holdExpiresAt,
        event: booking.event,
        seats: booking.seats,
        finalAmount: booking.finalAmount,
      };
    }),

  cancel: publicProcedure
    .input(
      z.object({
        bookingId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const booking = await prisma.booking.findUnique({
        where: { id: input.bookingId },
        include: { event: true },
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

  requestCancellation: publicProcedure
    .input(
      z.object({
        bookingId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const booking = await prisma.booking.findUnique({
        where: { id: input.bookingId },
        include: { event: true },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      if (booking.status === "CANCELLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Booking is already cancelled",
        });
      }

      if (
        booking.status !== "CONFIRMED" ||
        booking.paymentStatus !== "COMPLETED"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only confirmed bookings can be cancelled with refund",
        });
      }

      const existingRefund = await prisma.refund.findFirst({
        where: {
          bookingId: input.bookingId,
          status: { in: ["PENDING", "APPROVED", "PROCESSING", "SUCCEEDED"] },
        },
      });

      if (existingRefund) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A refund request already exists for this booking",
        });
      }

      const { computeRefund, canCancelBooking } = await import(
        "@indietix/utils"
      );

      const now = new Date();
      const canCancel = canCancelBooking({
        now,
        eventStart: booking.event.date,
        deadlineHours: booking.event.cancellationDeadlineHours,
        allowCancellation: booking.event.allowCancellation,
      });

      if (!canCancel.canCancel) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: canCancel.reason || "Cancellation not allowed",
        });
      }

      const refundCalc = computeRefund({
        baseTicketPrice: booking.ticketPrice,
        qty: booking.seats,
        policy: {
          cancellationFeeFlat: booking.event.cancellationFeeFlat,
          allowLateRefundPercent: null,
        },
        now,
        eventStart: booking.event.date,
        deadlineHours: booking.event.cancellationDeadlineHours,
      });

      const paymentProvider = getPaymentProvider();

      const refund = await prisma.refund.create({
        data: {
          bookingId: input.bookingId,
          amount: refundCalc.refundableAmount,
          currency: "INR",
          status: "APPROVED",
          reason: input.reason,
          provider: paymentProvider.kind,
        },
      });

      if (refundCalc.refundableAmount > 0 && booking.razorpayPaymentId) {
        try {
          await prisma.refund.update({
            where: { id: refund.id },
            data: { status: "PROCESSING" },
          });

          const refundResult = await paymentProvider.createRefund!({
            paymentId: booking.razorpayPaymentId,
            amountPaise: refundCalc.refundableAmount,
            speed: "normal",
          });

          await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.refund.update({
              where: { id: refund.id },
              data: {
                status: "SUCCEEDED",
                providerRefundId: refundResult.refundId,
                processedAt: new Date(),
              },
            });

            await tx.booking.update({
              where: { id: input.bookingId },
              data: {
                status: "CANCELLED",
                paymentStatus: "REFUNDED",
                cancelledAt: new Date(),
              },
            });

            await tx.event.update({
              where: { id: booking.eventId },
              data: {
                bookedSeats: {
                  decrement: booking.seats,
                },
              },
            });
          });

          const { issueWaitlistOffers } = await import("../lib/waitlist");
          await issueWaitlistOffers(booking.eventId, booking.seats);

          return {
            success: true,
            refundId: refund.id,
            refundAmount: refundCalc.refundableAmount,
            message: refundCalc.message,
          };
        } catch (error) {
          await prisma.refund.update({
            where: { id: refund.id },
            data: {
              status: "FAILED",
              failedAt: new Date(),
              failureReason:
                error instanceof Error ? error.message : "Unknown error",
            },
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to process refund",
          });
        }
      } else {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await tx.refund.update({
            where: { id: refund.id },
            data: {
              status: "SUCCEEDED",
              processedAt: new Date(),
            },
          });

          await tx.booking.update({
            where: { id: input.bookingId },
            data: {
              status: "CANCELLED",
              paymentStatus:
                refundCalc.refundableAmount > 0
                  ? "REFUNDED"
                  : booking.paymentStatus,
              cancelledAt: new Date(),
            },
          });

          await tx.event.update({
            where: { id: booking.eventId },
            data: {
              bookedSeats: {
                decrement: booking.seats,
              },
            },
          });
        });

        const { issueWaitlistOffers } = await import("../lib/waitlist");
        await issueWaitlistOffers(booking.eventId, booking.seats);

        return {
          success: true,
          refundId: refund.id,
          refundAmount: refundCalc.refundableAmount,
          message: refundCalc.message,
        };
      }
    }),

  getRefundPreview: publicProcedure
    .input(
      z.object({
        bookingId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const booking = await prisma.booking.findUnique({
        where: { id: input.bookingId },
        include: { event: true },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      const { computeRefund, canCancelBooking } = await import(
        "@indietix/utils"
      );

      const now = new Date();
      const canCancel = canCancelBooking({
        now,
        eventStart: booking.event.date,
        deadlineHours: booking.event.cancellationDeadlineHours,
        allowCancellation: booking.event.allowCancellation,
      });

      if (!canCancel.canCancel) {
        return {
          canCancel: false,
          reason: canCancel.reason,
          refundableAmount: 0,
          nonRefundableBreakdown: null,
        };
      }

      const refundCalc = computeRefund({
        baseTicketPrice: booking.ticketPrice,
        qty: booking.seats,
        policy: {
          cancellationFeeFlat: booking.event.cancellationFeeFlat,
          allowLateRefundPercent: null,
        },
        now,
        eventStart: booking.event.date,
        deadlineHours: booking.event.cancellationDeadlineHours,
      });

      return {
        canCancel: true,
        refundableAmount: refundCalc.refundableAmount,
        nonRefundableBreakdown: refundCalc.nonRefundableBreakdown,
        message: refundCalc.message,
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
