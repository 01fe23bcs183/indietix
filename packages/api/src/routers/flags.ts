import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";
import { evaluateFlag } from "@indietix/flags";
import type { TargetingRules } from "@indietix/flags";

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

const targetingRulesSchema = z
  .object({
    roles: z.array(z.string()).optional(),
    cities: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    allowList: z.array(z.string()).optional(),
    denyList: z.array(z.string()).optional(),
  })
  .nullable()
  .optional();

export const flagsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    await requireAdmin(ctx.session.user.id);

    const flags = await prisma.featureFlag.findMany({
      orderBy: { createdAt: "desc" },
    });

    return flags;
  }),

  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const flag = await prisma.featureFlag.findUnique({
        where: { key: input.key },
      });

      if (!flag) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature flag not found",
        });
      }

      return flag;
    }),

  set: publicProcedure
    .input(
      z.object({
        key: z.string().min(1).max(100),
        description: z.string().optional(),
        enabled: z.boolean().optional(),
        rollout: z.number().min(0).max(100).optional(),
        rules: targetingRulesSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const prev = await prisma.featureFlag.findUnique({
        where: { key: input.key },
      });

      const flag = await prisma.featureFlag.upsert({
        where: { key: input.key },
        create: {
          key: input.key,
          description: input.description ?? null,
          enabled: input.enabled ?? false,
          rollout: input.rollout ?? 100,
          rules: input.rules as never,
        },
        update: {
          description: input.description,
          enabled: input.enabled,
          rollout: input.rollout,
          rules: input.rules as never,
        },
      });

      await logAdminAction(
        ctx.session.user.id,
        "FEATURE_FLAG",
        input.key,
        prev ? "UPDATE" : "CREATE",
        prev,
        flag
      );

      return flag;
    }),

  delete: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const prev = await prisma.featureFlag.findUnique({
        where: { key: input.key },
      });

      if (!prev) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feature flag not found",
        });
      }

      await prisma.featureFlag.delete({
        where: { key: input.key },
      });

      await logAdminAction(
        ctx.session.user.id,
        "FEATURE_FLAG",
        input.key,
        "DELETE",
        prev,
        null
      );

      return { success: true };
    }),

  evaluate: publicProcedure
    .input(
      z.object({
        keys: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;
      const userRole = ctx.session?.user?.role;

      const userCtx = {
        userId,
        role: userRole,
      };

      let flags;
      if (input.keys && input.keys.length > 0) {
        flags = await prisma.featureFlag.findMany({
          where: { key: { in: input.keys } },
        });
      } else {
        flags = await prisma.featureFlag.findMany();
      }

      const result: Record<string, boolean> = {};
      for (const flag of flags) {
        result[flag.key] = evaluateFlag(userCtx, {
          key: flag.key,
          enabled: flag.enabled,
          rollout: flag.rollout,
          rules: flag.rules as TargetingRules | null,
        });
      }

      return result;
    }),
});
