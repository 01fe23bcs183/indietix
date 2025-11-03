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

export const adminFraudRouter = router({
  dashboard: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    await requireAdmin(ctx.session.user.id);

    const [
      totalRules,
      activeRules,
      totalBlacklisted,
      openCases,
      recentAttempts,
      highRiskBookings,
    ] = await Promise.all([
      prisma.fraudRule.count(),
      prisma.fraudRule.count({ where: { enabled: true } }),
      prisma.fraudList.count(),
      prisma.fraudCase.count({ where: { status: "OPEN" } }),
      prisma.bookingAttempt.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.booking.count({
        where: {
          riskScore: { gte: 50 },
        },
      }),
    ]);

    const topIPs = await prisma.$queryRaw<
      Array<{ ip: string; count: bigint }>
    >`
      SELECT ip, COUNT(*) as count
      FROM "BookingAttempt"
      WHERE ip IS NOT NULL
        AND "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY ip
      ORDER BY count DESC
      LIMIT 10
    `;

    const ruleStats = await prisma.fraudRule.findMany({
      select: {
        id: true,
        name: true,
        enabled: true,
      },
    });

    return {
      totalRules,
      activeRules,
      totalBlacklisted,
      openCases,
      recentAttempts,
      highRiskBookings,
      topIPs: topIPs.map((row) => ({
        ip: row.ip,
        count: Number(row.count),
      })),
      ruleStats,
    };
  }),

  listRules: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    await requireAdmin(ctx.session.user.id);

    return prisma.fraudRule.findMany({
      orderBy: { priority: "desc" },
    });
  }),

  createRule: publicProcedure
    .input(
      z.object({
        name: z.string(),
        enabled: z.boolean().default(true),
        priority: z.number().default(0),
        definition: z.any(),
        action: z.enum(["FLAG", "REJECT", "REVIEW"]),
        weight: z.number().default(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      return prisma.fraudRule.create({
        data: {
          name: input.name,
          enabled: input.enabled,
          priority: input.priority,
          definition: input.definition || {},
          action: input.action,
          weight: input.weight,
        },
      });
    }),

  updateRule: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        enabled: z.boolean().optional(),
        priority: z.number().optional(),
        definition: z.any().optional(),
        action: z.enum(["FLAG", "REJECT", "REVIEW"]).optional(),
        weight: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const { id, ...data } = input;
      return prisma.fraudRule.update({
        where: { id },
        data,
      });
    }),

  deleteRule: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      return prisma.fraudRule.delete({
        where: { id: input.id },
      });
    }),

  listBlacklists: publicProcedure
    .input(
      z
        .object({
          type: z.enum(["EMAIL", "PHONE", "IP"]).optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      return prisma.fraudList.findMany({
        where: input?.type ? { type: input.type } : undefined,
        orderBy: { createdAt: "desc" },
      });
    }),

  addToBlacklist: publicProcedure
    .input(
      z.object({
        type: z.enum(["EMAIL", "PHONE", "IP"]),
        value: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      return prisma.fraudList.create({
        data: {
          ...input,
          createdBy: ctx.session.user.id,
        },
      });
    }),

  removeFromBlacklist: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      return prisma.fraudList.delete({
        where: { id: input.id },
      });
    }),

  bulkAddToBlacklist: publicProcedure
    .input(
      z.object({
        type: z.enum(["EMAIL", "PHONE", "IP"]),
        values: z.array(z.string()),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const userId = ctx.session?.user?.id || "system";
      const entries = input.values.map((value) => ({
        type: input.type,
        value,
        reason: input.reason,
        createdBy: userId,
      }));

      return prisma.fraudList.createMany({
        data: entries,
        skipDuplicates: true,
      });
    }),

  listCases: publicProcedure
    .input(
      z
        .object({
          status: z.enum(["OPEN", "APPROVED", "REJECTED"]).optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      return prisma.fraudCase.findMany({
        where: input?.status ? { status: input.status } : undefined,
        include: {
          booking: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              event: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getCase: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      return prisma.fraudCase.findUnique({
        where: { id: input.id },
        include: {
          booking: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              event: {
                select: {
                  id: true,
                  title: true,
                  price: true,
                  date: true,
                },
              },
              bookingAttempts: {
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      });
    }),

  resolveCase: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["APPROVED", "REJECTED"]),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const fraudCase = await prisma.fraudCase.findUnique({
        where: { id: input.id },
      });

      if (!fraudCase) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fraud case not found",
        });
      }

      const notes = fraudCase.notes as Array<{
        text: string;
        createdBy: string;
        createdAt: string;
      }>;

      const updatedNotes = input.note
        ? [
            ...notes,
            {
              text: input.note,
              createdBy: ctx.session.user.id,
              createdAt: new Date().toISOString(),
            },
          ]
        : notes;

      return prisma.fraudCase.update({
        where: { id: input.id },
        data: {
          status: input.status,
          notes: updatedNotes,
          resolvedAt: new Date(),
          resolvedBy: ctx.session.user.id,
        },
      });
    }),

  addCaseNote: publicProcedure
    .input(
      z.object({
        id: z.string(),
        note: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const fraudCase = await prisma.fraudCase.findUnique({
        where: { id: input.id },
      });

      if (!fraudCase) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fraud case not found",
        });
      }

      const notes = fraudCase.notes as Array<{
        text: string;
        createdBy: string;
        createdAt: string;
      }>;

      const updatedNotes = [
        ...notes,
        {
          text: input.note,
          createdBy: ctx.session.user.id,
          createdAt: new Date().toISOString(),
        },
      ];

      return prisma.fraudCase.update({
        where: { id: input.id },
        data: {
          notes: updatedNotes,
        },
      });
    }),
});
