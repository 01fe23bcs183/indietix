import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma, Prisma } from "@indietix/db";
import { getPaymentProvider } from "@indietix/payments";
import { TRPCError } from "@trpc/server";

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

const requireAdmin = (userRole: string) => {
  if (userRole !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
};

async function processApprovedRefund(refundId: string) {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: {
      booking: {
        include: {
          event: true,
        },
      },
    },
  });

  if (!refund) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Refund not found",
    });
  }

  if (!refund.organizerApprovedAt || !refund.adminApprovedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Refund requires both organizer and admin approval",
    });
  }

  if (refund.status !== "APPROVED") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Refund is not in approved status",
    });
  }

  const booking = refund.booking;
  const paymentProvider = getPaymentProvider();

  if (refund.amount > 0 && booking.razorpayPaymentId) {
    try {
      await prisma.refund.update({
        where: { id: refund.id },
        data: { status: "PROCESSING" },
      });

      const refundResult = await paymentProvider.createRefund!({
        paymentId: booking.razorpayPaymentId,
        amountPaise: refund.amount,
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
          where: { id: booking.id },
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
        refundAmount: refund.amount,
        message: "Refund processed successfully",
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
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          paymentStatus: refund.amount > 0 ? "REFUNDED" : booking.paymentStatus,
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
      refundAmount: refund.amount,
      message: "Refund processed successfully",
    };
  }
}

const organizerRouter = router({
  approve: publicProcedure
    .input(
      z.object({
        refundId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      const refund = await prisma.refund.findUnique({
        where: { id: input.refundId },
        include: {
          booking: {
            include: {
              event: true,
            },
          },
        },
      });

      if (!refund) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Refund not found",
        });
      }

      if (refund.status !== "PENDING_APPROVAL") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Refund is not pending approval",
        });
      }

      if (
        refund.organizerId !== organizer.id &&
        refund.booking.event.organizerId !== organizer.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to approve this refund",
        });
      }

      if (refund.organizerApprovedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Refund has already been approved by organizer",
        });
      }

      const updatedRefund = await prisma.refund.update({
        where: { id: input.refundId },
        data: {
          organizerApprovedAt: new Date(),
          status: refund.adminApprovedAt ? "APPROVED" : "PENDING_APPROVAL",
        },
      });

      if (updatedRefund.organizerApprovedAt && updatedRefund.adminApprovedAt) {
        return await processApprovedRefund(input.refundId);
      }

      return {
        success: true,
        refundId: updatedRefund.id,
        message: "Organizer approval recorded. Awaiting admin approval.",
        status: updatedRefund.status,
      };
    }),

  reject: publicProcedure
    .input(
      z.object({
        refundId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      const refund = await prisma.refund.findUnique({
        where: { id: input.refundId },
        include: {
          booking: {
            include: {
              event: true,
            },
          },
        },
      });

      if (!refund) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Refund not found",
        });
      }

      if (refund.status !== "PENDING_APPROVAL") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Refund is not pending approval",
        });
      }

      if (
        refund.organizerId !== organizer.id &&
        refund.booking.event.organizerId !== organizer.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to reject this refund",
        });
      }

      const updatedRefund = await prisma.refund.update({
        where: { id: input.refundId },
        data: {
          status: "REJECTED",
          failureReason: input.reason || "Rejected by organizer",
          failedAt: new Date(),
        },
      });

      return {
        success: true,
        refundId: updatedRefund.id,
        message: "Refund request rejected",
        status: updatedRefund.status,
      };
    }),

  list: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        status: z
          .enum([
            "PENDING_APPROVAL",
            "PENDING",
            "APPROVED",
            "PROCESSING",
            "SUCCEEDED",
            "FAILED",
            "REJECTED",
          ])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      const limit = 20;
      const offset = (input.page - 1) * limit;

      const where: Prisma.RefundWhereInput = {
        organizerId: organizer.id,
      };

      if (input.status) {
        where.status = input.status;
      }

      const refunds = await prisma.refund.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          booking: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  date: true,
                  venue: true,
                },
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      const total = await prisma.refund.count({ where });

      return {
        refunds: refunds.map((refund) => ({
          id: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason,
          createdAt: refund.createdAt,
          organizerApprovedAt: refund.organizerApprovedAt,
          adminApprovedAt: refund.adminApprovedAt,
          booking: {
            id: refund.booking.id,
            ticketNumber: refund.booking.ticketNumber,
            seats: refund.booking.seats,
            finalAmount: refund.booking.finalAmount,
            user: refund.booking.user,
            event: refund.booking.event,
          },
        })),
        total,
        page: input.page,
        totalPages: Math.ceil(total / limit),
      };
    }),
});

const adminRouter = router({
  approve: publicProcedure
    .input(
      z.object({
        refundId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireAdmin(user.role);

      const refund = await prisma.refund.findUnique({
        where: { id: input.refundId },
      });

      if (!refund) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Refund not found",
        });
      }

      if (refund.status !== "PENDING_APPROVAL") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Refund is not pending approval",
        });
      }

      if (refund.adminApprovedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Refund has already been approved by admin",
        });
      }

      const updatedRefund = await prisma.refund.update({
        where: { id: input.refundId },
        data: {
          adminApprovedAt: new Date(),
          status: refund.organizerApprovedAt ? "APPROVED" : "PENDING_APPROVAL",
        },
      });

      if (updatedRefund.organizerApprovedAt && updatedRefund.adminApprovedAt) {
        return await processApprovedRefund(input.refundId);
      }

      return {
        success: true,
        refundId: updatedRefund.id,
        message: "Admin approval recorded. Awaiting organizer approval.",
        status: updatedRefund.status,
      };
    }),

  reject: publicProcedure
    .input(
      z.object({
        refundId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireAdmin(user.role);

      const refund = await prisma.refund.findUnique({
        where: { id: input.refundId },
      });

      if (!refund) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Refund not found",
        });
      }

      if (refund.status !== "PENDING_APPROVAL") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Refund is not pending approval",
        });
      }

      const updatedRefund = await prisma.refund.update({
        where: { id: input.refundId },
        data: {
          status: "REJECTED",
          failureReason: input.reason || "Rejected by admin",
          failedAt: new Date(),
        },
      });

      return {
        success: true,
        refundId: updatedRefund.id,
        message: "Refund request rejected",
        status: updatedRefund.status,
      };
    }),

  list: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        status: z
          .enum([
            "PENDING_APPROVAL",
            "PENDING",
            "APPROVED",
            "PROCESSING",
            "SUCCEEDED",
            "FAILED",
            "REJECTED",
          ])
          .optional(),
        organizerId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireAdmin(user.role);

      const limit = 20;
      const offset = (input.page - 1) * limit;

      const where: Prisma.RefundWhereInput = {};

      if (input.status) {
        where.status = input.status;
      }

      if (input.organizerId) {
        where.organizerId = input.organizerId;
      }

      const refunds = await prisma.refund.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          booking: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  date: true,
                  venue: true,
                  organizerId: true,
                },
              },
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      const total = await prisma.refund.count({ where });

      return {
        refunds: refunds.map((refund) => ({
          id: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason,
          createdAt: refund.createdAt,
          organizerApprovedAt: refund.organizerApprovedAt,
          adminApprovedAt: refund.adminApprovedAt,
          requestedBy: refund.requestedBy,
          organizerId: refund.organizerId,
          booking: {
            id: refund.booking.id,
            ticketNumber: refund.booking.ticketNumber,
            seats: refund.booking.seats,
            finalAmount: refund.booking.finalAmount,
            user: refund.booking.user,
            event: refund.booking.event,
          },
        })),
        total,
        page: input.page,
        totalPages: Math.ceil(total / limit),
      };
    }),
});

export const refundApprovalsRouter = router({
  organizer: organizerRouter,
  admin: adminRouter,
});
