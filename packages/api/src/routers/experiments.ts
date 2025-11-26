import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";
import { assignToBucket } from "@indietix/flags";

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

const variantSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0).max(100),
});

export const experimentsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    await requireAdmin(ctx.session.user.id);

    const experiments = await prisma.experiment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            assignments: true,
            exposures: true,
          },
        },
      },
    });

    return experiments;
  }),

  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const experiment = await prisma.experiment.findUnique({
        where: { key: input.key },
        include: {
          _count: {
            select: {
              assignments: true,
              exposures: true,
            },
          },
        },
      });

      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      return experiment;
    }),

  create: publicProcedure
    .input(
      z.object({
        key: z.string().min(1).max(100),
        description: z.string().optional(),
        variants: z.array(variantSchema).min(2),
        startAt: z.date().optional(),
        stopAt: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const existing = await prisma.experiment.findUnique({
        where: { key: input.key },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Experiment with this key already exists",
        });
      }

      const experiment = await prisma.experiment.create({
        data: {
          key: input.key,
          description: input.description ?? null,
          variants: input.variants as never,
          status: "DRAFT",
          startAt: input.startAt ?? null,
          stopAt: input.stopAt ?? null,
        },
      });

      await logAdminAction(
        ctx.session.user.id,
        "EXPERIMENT",
        input.key,
        "CREATE",
        null,
        experiment
      );

      return experiment;
    }),

  update: publicProcedure
    .input(
      z.object({
        key: z.string(),
        description: z.string().optional(),
        variants: z.array(variantSchema).min(2).optional(),
        startAt: z.date().nullable().optional(),
        stopAt: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const prev = await prisma.experiment.findUnique({
        where: { key: input.key },
      });

      if (!prev) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      if (prev.status === "RUNNING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update a running experiment",
        });
      }

      const experiment = await prisma.experiment.update({
        where: { key: input.key },
        data: {
          description: input.description,
          variants: input.variants as never,
          startAt: input.startAt,
          stopAt: input.stopAt,
        },
      });

      await logAdminAction(
        ctx.session.user.id,
        "EXPERIMENT",
        input.key,
        "UPDATE",
        prev,
        experiment
      );

      return experiment;
    }),

  launch: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const prev = await prisma.experiment.findUnique({
        where: { key: input.key },
      });

      if (!prev) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      if (prev.status === "RUNNING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Experiment is already running",
        });
      }

      if (prev.status === "STOPPED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot restart a stopped experiment",
        });
      }

      const experiment = await prisma.experiment.update({
        where: { key: input.key },
        data: {
          status: "RUNNING",
          startAt: prev.startAt ?? new Date(),
        },
      });

      await logAdminAction(
        ctx.session.user.id,
        "EXPERIMENT",
        input.key,
        "LAUNCH",
        prev,
        experiment
      );

      return experiment;
    }),

  pause: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const prev = await prisma.experiment.findUnique({
        where: { key: input.key },
      });

      if (!prev) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      if (prev.status !== "RUNNING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only pause a running experiment",
        });
      }

      const experiment = await prisma.experiment.update({
        where: { key: input.key },
        data: { status: "PAUSED" },
      });

      await logAdminAction(
        ctx.session.user.id,
        "EXPERIMENT",
        input.key,
        "PAUSE",
        prev,
        experiment
      );

      return experiment;
    }),

  stop: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const prev = await prisma.experiment.findUnique({
        where: { key: input.key },
      });

      if (!prev) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      if (prev.status === "STOPPED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Experiment is already stopped",
        });
      }

      const experiment = await prisma.experiment.update({
        where: { key: input.key },
        data: {
          status: "STOPPED",
          stopAt: new Date(),
        },
      });

      await logAdminAction(
        ctx.session.user.id,
        "EXPERIMENT",
        input.key,
        "STOP",
        prev,
        experiment
      );

      return experiment;
    }),

  assign: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be logged in to participate in experiments",
        });
      }

      // Check for existing assignment (sticky)
      const existingAssignment = await prisma.experimentAssignment.findUnique({
        where: {
          experimentKey_userId: {
            experimentKey: input.key,
            userId,
          },
        },
      });

      if (existingAssignment) {
        // Log exposure event
        await prisma.experimentExposure.create({
          data: {
            experimentKey: input.key,
            userId,
            variant: existingAssignment.variant,
          },
        });

        return {
          variant: existingAssignment.variant,
          isNew: false,
        };
      }

      // Get experiment
      const experiment = await prisma.experiment.findUnique({
        where: { key: input.key },
      });

      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      if (experiment.status !== "RUNNING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Experiment is not running",
        });
      }

      // Assign to variant based on hash
      const variants = experiment.variants as Array<{
        name: string;
        weight: number;
      }>;
      const variant = assignToBucket(userId, input.key, variants);

      // Create assignment
      await prisma.experimentAssignment.create({
        data: {
          experimentKey: input.key,
          userId,
          variant,
        },
      });

      // Log exposure event
      await prisma.experimentExposure.create({
        data: {
          experimentKey: input.key,
          userId,
          variant,
        },
      });

      return {
        variant,
        isNew: true,
      };
    }),

  getVariant: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;

      if (!userId) {
        return { variant: null };
      }

      // Check for existing assignment
      const existingAssignment = await prisma.experimentAssignment.findUnique({
        where: {
          experimentKey_userId: {
            experimentKey: input.key,
            userId,
          },
        },
      });

      if (existingAssignment) {
        return { variant: existingAssignment.variant };
      }

      // Get experiment to check if it's running
      const experiment = await prisma.experiment.findUnique({
        where: { key: input.key },
      });

      if (!experiment || experiment.status !== "RUNNING") {
        return { variant: null };
      }

      // Calculate variant without persisting
      const variants = experiment.variants as Array<{
        name: string;
        weight: number;
      }>;
      const variant = assignToBucket(userId, input.key, variants);

      return { variant };
    }),

  metrics: publicProcedure
    .input(
      z.object({
        key: z.string(),
        from: z.date().optional(),
        to: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const experiment = await prisma.experiment.findUnique({
        where: { key: input.key },
      });

      if (!experiment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      const variants = experiment.variants as Array<{
        name: string;
        weight: number;
      }>;

      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (input.from) dateFilter.gte = input.from;
      if (input.to) dateFilter.lte = input.to;

      const metrics = await Promise.all(
        variants.map(async (variant) => {
          // Count exposures
          const exposures = await prisma.experimentExposure.count({
            where: {
              experimentKey: input.key,
              variant: variant.name,
              ...(Object.keys(dateFilter).length > 0 && { ts: dateFilter }),
            },
          });

          // Count unique users assigned to this variant
          const assignments = await prisma.experimentAssignment.count({
            where: {
              experimentKey: input.key,
              variant: variant.name,
            },
          });

          // Count conversions (bookings confirmed within 7 days of exposure)
          const exposedUserIds = await prisma.experimentExposure.findMany({
            where: {
              experimentKey: input.key,
              variant: variant.name,
              ...(Object.keys(dateFilter).length > 0 && { ts: dateFilter }),
            },
            select: { userId: true, ts: true },
            distinct: ["userId"],
          });

          let conversions = 0;
          for (const exposure of exposedUserIds) {
            const sevenDaysLater = new Date(exposure.ts);
            sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

            const booking = await prisma.booking.findFirst({
              where: {
                userId: exposure.userId,
                status: "CONFIRMED",
                createdAt: {
                  gte: exposure.ts,
                  lte: sevenDaysLater,
                },
              },
            });

            if (booking) {
              conversions++;
            }
          }

          // Count event detail clicks (using EventView as proxy)
          const clicks = await prisma.eventView.count({
            where: {
              userId: { in: exposedUserIds.map((e) => e.userId) },
              ...(Object.keys(dateFilter).length > 0 && {
                createdAt: dateFilter,
              }),
            },
          });

          const conversionRate =
            exposedUserIds.length > 0
              ? (conversions / exposedUserIds.length) * 100
              : 0;
          const clickRate =
            exposedUserIds.length > 0
              ? (clicks / exposedUserIds.length) * 100
              : 0;

          return {
            variant: variant.name,
            weight: variant.weight,
            assignments,
            exposures,
            conversions,
            conversionRate: Math.round(conversionRate * 100) / 100,
            clicks,
            clickRate: Math.round(clickRate * 100) / 100,
          };
        })
      );

      // Calculate basic z-score for significance (comparing first two variants)
      let significance = null;
      const firstMetric = metrics[0];
      const secondMetric = metrics[1];
      if (metrics.length >= 2 && firstMetric && secondMetric) {
        const n1 = firstMetric.exposures || 1;
        const n2 = secondMetric.exposures || 1;
        const p1 = firstMetric.conversionRate / 100;
        const p2 = secondMetric.conversionRate / 100;
        const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
        const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));
        const zScore = se > 0 ? (p1 - p2) / se : 0;

        significance = {
          zScore: Math.round(zScore * 100) / 100,
          isSignificant: Math.abs(zScore) > 1.96, // 95% confidence
        };
      }

      return {
        experimentKey: input.key,
        status: experiment.status,
        startAt: experiment.startAt,
        stopAt: experiment.stopAt,
        metrics,
        significance,
      };
    }),

  delete: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const prev = await prisma.experiment.findUnique({
        where: { key: input.key },
      });

      if (!prev) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Experiment not found",
        });
      }

      if (prev.status === "RUNNING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete a running experiment. Stop it first.",
        });
      }

      await prisma.experiment.delete({
        where: { key: input.key },
      });

      await logAdminAction(
        ctx.session.user.id,
        "EXPERIMENT",
        input.key,
        "DELETE",
        prev,
        null
      );

      return { success: true };
    }),
});
