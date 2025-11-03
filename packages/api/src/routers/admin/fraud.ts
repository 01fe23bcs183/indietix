import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";

function requireAdmin(session: { role: string } | null) {
  if (!session || session.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
}

export const fraudRouter = router({
  listRules: publicProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.session);
    return await prisma.fraudRule.findMany({
      orderBy: { priority: "desc" },
    });
  }),

  getRule: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      requireAdmin(ctx.session);
      const rule = await prisma.fraudRule.findUnique({
        where: { id: input.id },
      });
      if (!rule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Rule not found" });
      }
      return rule;
    }),

  createRule: publicProcedure
    .input(
      z.object({
        name: z.string(),
        enabled: z.boolean().default(true),
        priority: z.number().int().default(0),
        definition: z.record(z.unknown()),
        action: z.enum(["FLAG", "REJECT", "REVIEW"]),
        weight: z.number().int().default(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.session);
      return await prisma.fraudRule.create({
        data: input,
      });
    }),

  updateRule: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        enabled: z.boolean().optional(),
        priority: z.number().int().optional(),
        definition: z.record(z.unknown()).optional(),
        action: z.enum(["FLAG", "REJECT", "REVIEW"]).optional(),
        weight: z.number().int().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.session);
      const { id, ...data } = input;
      return await prisma.fraudRule.update({
        where: { id },
        data,
      });
    }),

  deleteRule: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.session);
      return await prisma.fraudRule.delete({
        where: { id: input.id },
      });
    }),

  listBlacklists: publicProcedure
    .input(
      z.object({
        type: z.enum(["EMAIL", "PHONE", "IP"]).optional(),
        limit: z.number().int().default(100),
        offset: z.number().int().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      requireAdmin(ctx.session);
      const where = input.type ? { type: input.type } : {};
      const [items, total] = await Promise.all([
        prisma.fraudList.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          orderBy: { createdAt: "desc" },
        }),
        prisma.fraudList.count({ where }),
      ]);
      return { items, total };
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
      requireAdmin(ctx.session);
      if (!ctx.session?.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID required",
        });
      }
      return await prisma.fraudList.create({
        data: {
          type: input.type,
          value: input.value,
          reason: input.reason,
          createdBy: ctx.session.userId,
        },
      });
    }),

  removeFromBlacklist: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.session);
      return await prisma.fraudList.delete({
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
      requireAdmin(ctx.session);
      if (!ctx.session?.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID required",
        });
      }
      const data = input.values.map((value) => ({
        type: input.type,
        value,
        reason: input.reason,
        createdBy: ctx.session!.userId!,
      }));
      return await prisma.fraudList.createMany({
        data,
        skipDuplicates: true,
      });
    }),

  listCases: publicProcedure
    .input(
      z.object({
        status: z.enum(["OPEN", "APPROVED", "REJECTED"]).optional(),
        limit: z.number().int().default(50),
        offset: z.number().int().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      requireAdmin(ctx.session);
      const where = input.status ? { status: input.status } : {};
      const [items, total] = await Promise.all([
        prisma.fraudCase.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          orderBy: { createdAt: "desc" },
          include: {
            booking: {
              include: {
                user: { select: { email: true, name: true } },
                event: { select: { title: true, date: true } },
              },
            },
          },
        }),
        prisma.fraudCase.count({ where }),
      ]);
      return { items, total };
    }),

  getCase: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      requireAdmin(ctx.session);
      const fraudCase = await prisma.fraudCase.findUnique({
        where: { id: input.id },
        include: {
          booking: {
            include: {
              user: { select: { email: true, name: true, phone: true } },
              event: { select: { title: true, date: true, venue: true } },
              bookingAttempt: true,
            },
          },
        },
      });
      if (!fraudCase) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }
      return fraudCase;
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
      requireAdmin(ctx.session);
      if (!ctx.session?.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID required",
        });
      }

      const fraudCase = await prisma.fraudCase.findUnique({
        where: { id: input.id },
        include: { booking: true },
      });

      if (!fraudCase) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }

      const notes = (fraudCase.notes as Array<{
        adminId: string;
        note: string;
        ts: string;
      }>) || [];

      if (input.note) {
        notes.push({
          adminId: ctx.session.userId,
          note: input.note,
          ts: new Date().toISOString(),
        });
      }

      const updatedCase = await prisma.fraudCase.update({
        where: { id: input.id },
        data: {
          status: input.status,
          notes,
          resolvedAt: new Date(),
          resolvedBy: ctx.session.userId,
        },
      });

      await prisma.adminAction.create({
        data: {
          adminId: ctx.session.userId,
          entityType: "FraudCase",
          entityId: input.id,
          action: input.status === "APPROVED" ? "APPROVE_CASE" : "REJECT_CASE",
          prev: { status: fraudCase.status },
          next: { status: input.status },
        },
      });

      return updatedCase;
    }),

  addCaseNote: publicProcedure
    .input(
      z.object({
        id: z.string(),
        note: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.session);
      if (!ctx.session?.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID required",
        });
      }

      const fraudCase = await prisma.fraudCase.findUnique({
        where: { id: input.id },
      });

      if (!fraudCase) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
      }

      const notes = (fraudCase.notes as Array<{
        adminId: string;
        note: string;
        ts: string;
      }>) || [];

      notes.push({
        adminId: ctx.session.userId,
        note: input.note,
        ts: new Date().toISOString(),
      });

      return await prisma.fraudCase.update({
        where: { id: input.id },
        data: { notes },
      });
    }),

  getDashboardStats: publicProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.session);

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalAttempts24h,
      totalAttempts7d,
      openCases,
      topIps,
      ruleStats,
      riskDistribution,
    ] = await Promise.all([
      prisma.bookingAttempt.count({
        where: { createdAt: { gte: last24h } },
      }),
      prisma.bookingAttempt.count({
        where: { createdAt: { gte: last7d } },
      }),
      prisma.fraudCase.count({
        where: { status: "OPEN" },
      }),
      prisma.bookingAttempt.groupBy({
        by: ["ip"],
        where: {
          createdAt: { gte: last24h },
          ip: { not: null },
        },
        _count: { ip: true },
        orderBy: { _count: { ip: "desc" } },
        take: 10,
      }),
      prisma.fraudRule.findMany({
        select: { id: true, name: true, enabled: true, action: true },
      }),
      prisma.booking.groupBy({
        by: ["riskScore"],
        where: {
          riskScore: { not: null },
          createdAt: { gte: last7d },
        },
        _count: { riskScore: true },
      }),
    ]);

    const riskBuckets = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    riskDistribution.forEach((item) => {
      const score = item.riskScore || 0;
      const count = item._count.riskScore;
      if (score < 25) riskBuckets.low += count;
      else if (score < 50) riskBuckets.medium += count;
      else if (score < 75) riskBuckets.high += count;
      else riskBuckets.critical += count;
    });

    return {
      totalAttempts24h,
      totalAttempts7d,
      openCases,
      topIps: topIps.map((item) => ({
        ip: item.ip,
        count: item._count.ip,
      })),
      ruleStats,
      riskDistribution: riskBuckets,
    };
  }),
});
