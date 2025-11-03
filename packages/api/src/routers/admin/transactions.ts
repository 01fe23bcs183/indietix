import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";

const requireAdmin = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
};

const logAdminAction = async (
  adminId: string,
  entityType: string,
  entityId: string,
  action: string,
  prev: unknown,
  next: unknown
) => {
  await prisma.adminAction.create({
    data: {
      adminId,
      entityType,
      entityId,
      action,
      prev: prev as never,
      next: next as never,
    },
  });
};

export const adminTransactionsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]).optional(),
        paymentStatus: z
          .enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"])
          .optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};

      if (input.status) {
        where.status = input.status;
      }

      if (input.paymentStatus) {
        where.paymentStatus = input.paymentStatus;
      }

      if (input.dateFrom || input.dateTo) {
        where.createdAt = {};
        if (input.dateFrom) {
          where.createdAt.gte = new Date(input.dateFrom);
        }
        if (input.dateTo) {
          where.createdAt.lte = new Date(input.dateTo);
        }
      }

      if (input.search) {
        where.OR = [
          { ticketNumber: { contains: input.search, mode: "insensitive" } },
          { razorpayOrderId: { contains: input.search, mode: "insensitive" } },
          {
            razorpayPaymentId: { contains: input.search, mode: "insensitive" },
          },
          {
            user: {
              email: { contains: input.search, mode: "insensitive" },
            },
          },
          {
            user: {
              name: { contains: input.search, mode: "insensitive" },
            },
          },
        ];
      }

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            event: {
              select: {
                id: true,
                title: true,
                date: true,
              },
            },
            refunds: {
              select: {
                id: true,
                amount: true,
                status: true,
                createdAt: true,
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.booking.count({ where }),
      ]);

      return {
        bookings,
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const booking = await prisma.booking.findUnique({
        where: { id: input.id },
        include: {
          user: true,
          event: {
            include: {
              organizer: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          refunds: {
            orderBy: { createdAt: "desc" },
          },
          paymentEvents: {
            orderBy: { createdAt: "desc" },
          },
          scanLogs: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      return booking;
    }),

  refund: publicProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number().positive(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const booking = await prisma.booking.findUnique({
        where: { id: input.id },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      if (booking.paymentStatus !== "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only refund completed payments",
        });
      }

      if (input.amount > booking.finalAmount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Refund amount cannot exceed booking amount",
        });
      }

      const refund = await prisma.refund.create({
        data: {
          bookingId: input.id,
          amount: input.amount,
          reason: input.reason,
          provider: "RAZORPAY",
          status: "APPROVED",
        },
      });

      await prisma.booking.update({
        where: { id: input.id },
        data: {
          paymentStatus: "REFUNDED",
          status: "CANCELLED",
        },
      });

      await logAdminAction(
        ctx.session?.user?.id,
        "BOOKING",
        input.id,
        "REFUND",
        { paymentStatus: booking.paymentStatus, status: booking.status },
        { paymentStatus: "REFUNDED", status: "CANCELLED", refundId: refund.id }
      );

      return refund;
    }),
});
