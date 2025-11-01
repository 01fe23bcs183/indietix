import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";
import {
  computePayoutAmount,
  formatPayoutForCSV,
  type PrismaClient,
} from "@indietix/utils";
import { getPaymentProvider } from "@indietix/payments";

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

export const payoutsRouter = router({
  organizer: router({
    create: publicProcedure
      .input(
        z.object({
          periodStart: z.coerce.date(),
          periodEnd: z.coerce.date(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = requireAuth(ctx);
        const organizer = await requireOrganizer(user.id);

        if (input.periodStart >= input.periodEnd) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Period start must be before period end",
          });
        }

        const existingPayout = await prisma.payout.findFirst({
          where: {
            organizerId: organizer.id,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
          },
        });

        if (existingPayout) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A payout already exists for this period",
          });
        }

        const breakdown = await computePayoutAmount(
          {
            organizerId: organizer.id,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
          },
          prisma as unknown as PrismaClient
        );

        if (breakdown.netPayable <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No payable amount for this period",
          });
        }

        const payout = await prisma.payout.create({
          data: {
            organizerId: organizer.id,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            amount: breakdown.netPayable,
            currency: "INR",
            status: "PENDING",
            beneficiaryName: organizer.businessName,
            breakdown: JSON.parse(JSON.stringify(breakdown)),
          },
        });

        return {
          payout,
          breakdown,
        };
      }),

    list: publicProcedure
      .input(
        z.object({
          status: z
            .enum([
              "PENDING",
              "APPROVED",
              "PROCESSING",
              "COMPLETED",
              "FAILED",
              "CANCELLED",
            ])
            .optional(),
          page: z.number().min(1).default(1),
        })
      )
      .query(async ({ input, ctx }) => {
        const user = requireAuth(ctx);
        const organizer = await requireOrganizer(user.id);

        const limit = 20;
        const offset = (input.page - 1) * limit;

        const where: {
          organizerId: string;
          status?:
            | "PENDING"
            | "APPROVED"
            | "PROCESSING"
            | "COMPLETED"
            | "FAILED"
            | "CANCELLED";
        } = {
          organizerId: organizer.id,
        };

        if (input.status) {
          where.status = input.status;
        }

        const [payouts, total] = await Promise.all([
          prisma.payout.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: offset,
            take: limit,
          }),
          prisma.payout.count({ where }),
        ]);

        return {
          payouts,
          total,
          page: input.page,
          totalPages: Math.ceil(total / limit),
        };
      }),

    getById: publicProcedure
      .input(z.object({ payoutId: z.string() }))
      .query(async ({ input, ctx }) => {
        const user = requireAuth(ctx);
        const organizer = await requireOrganizer(user.id);

        const payout = await prisma.payout.findUnique({
          where: { id: input.payoutId },
          include: {
            organizer: {
              select: {
                businessName: true,
                description: true,
              },
            },
          },
        });

        if (!payout) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payout not found",
          });
        }

        if (payout.organizerId !== organizer.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to view this payout",
          });
        }

        return payout;
      }),
  }),

  admin: router({
    list: publicProcedure
      .input(
        z.object({
          status: z
            .enum([
              "PENDING",
              "APPROVED",
              "PROCESSING",
              "COMPLETED",
              "FAILED",
              "CANCELLED",
            ])
            .optional(),
          page: z.number().min(1).default(1),
        })
      )
      .query(async ({ input, ctx }) => {
        const user = requireAuth(ctx);
        requireAdmin(user.role);

        const limit = 20;
        const offset = (input.page - 1) * limit;

        const where: {
          status?:
            | "PENDING"
            | "APPROVED"
            | "PROCESSING"
            | "COMPLETED"
            | "FAILED"
            | "CANCELLED";
        } = {};

        if (input.status) {
          where.status = input.status;
        }

        const [payouts, total] = await Promise.all([
          prisma.payout.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: offset,
            take: limit,
            include: {
              organizer: {
                select: {
                  businessName: true,
                  userId: true,
                  user: {
                    select: {
                      email: true,
                      name: true,
                    },
                  },
                },
              },
            },
          }),
          prisma.payout.count({ where }),
        ]);

        return {
          payouts,
          total,
          page: input.page,
          totalPages: Math.ceil(total / limit),
        };
      }),

    approve: publicProcedure
      .input(z.object({ payoutId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = requireAuth(ctx);
        requireAdmin(user.role);

        const payout = await prisma.payout.findUnique({
          where: { id: input.payoutId },
        });

        if (!payout) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payout not found",
          });
        }

        if (payout.status !== "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only pending payouts can be approved",
          });
        }

        const updatedPayout = await prisma.payout.update({
          where: { id: input.payoutId },
          data: {
            status: "APPROVED",
            approvedAt: new Date(),
            approvedBy: user.id,
          },
        });

        return updatedPayout;
      }),

    reject: publicProcedure
      .input(
        z.object({
          payoutId: z.string(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = requireAuth(ctx);
        requireAdmin(user.role);

        const payout = await prisma.payout.findUnique({
          where: { id: input.payoutId },
        });

        if (!payout) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payout not found",
          });
        }

        if (payout.status !== "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only pending payouts can be rejected",
          });
        }

        const updatedPayout = await prisma.payout.update({
          where: { id: input.payoutId },
          data: {
            status: "CANCELLED",
          },
        });

        return updatedPayout;
      }),

    process: publicProcedure
      .input(z.object({ payoutId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = requireAuth(ctx);
        requireAdmin(user.role);

        const payout = await prisma.payout.findUnique({
          where: { id: input.payoutId },
          include: {
            organizer: {
              select: {
                businessName: true,
              },
            },
          },
        });

        if (!payout) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payout not found",
          });
        }

        if (payout.status !== "APPROVED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only approved payouts can be processed",
          });
        }

        await prisma.payout.update({
          where: { id: input.payoutId },
          data: {
            status: "PROCESSING",
            processedAt: new Date(),
          },
        });

        try {
          const paymentProvider = getPaymentProvider();

          const payoutResult = await paymentProvider.createPayout!({
            account: "DUMMY_ACCOUNT",
            ifsc: "DUMMY_IFSC",
            amountPaise: payout.amount,
            mode: "NEFT",
          });

          const updatedPayout = await prisma.payout.update({
            where: { id: input.payoutId },
            data: {
              status: "COMPLETED",
              provider: paymentProvider.kind,
              providerPayoutId: payoutResult.payoutId,
              providerResponse: JSON.parse(JSON.stringify(payoutResult)),
              completedAt: new Date(),
            },
          });

          await prisma.paymentEvent.create({
            data: {
              provider: paymentProvider.kind,
              eventId: payoutResult.payoutId,
              providerEventType: "payout.processed",
              payoutId: input.payoutId,
              payload: JSON.parse(JSON.stringify(payoutResult)),
            },
          });

          return updatedPayout;
        } catch (error) {
          await prisma.payout.update({
            where: { id: input.payoutId },
            data: {
              status: "FAILED",
            },
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Failed to process payout",
          });
        }
      }),

    exportCsv: publicProcedure
      .input(z.object({ payoutId: z.string() }))
      .query(async ({ input, ctx }) => {
        const user = requireAuth(ctx);
        requireAdmin(user.role);

        const payout = await prisma.payout.findUnique({
          where: { id: input.payoutId },
        });

        if (!payout) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payout not found",
          });
        }

        const csvData = formatPayoutForCSV(payout);

        const headers = [
          "beneficiary_name",
          "account",
          "ifsc",
          "amount",
          "utr",
        ];
        const values = [
          csvData.beneficiary_name,
          csvData.account,
          csvData.ifsc,
          csvData.amount.toString(),
          csvData.utr || "",
        ];

        const csv = [headers.join(","), values.join(",")].join("\n");

        return {
          csv,
          filename: `payout_${payout.id}_${Date.now()}.csv`,
        };
      }),
  }),
});
