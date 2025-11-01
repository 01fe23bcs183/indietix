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

export const adminSettingsRouter = router({
  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const setting = await prisma.platformSetting.findUnique({
        where: { key: input.key },
      });

      return setting;
    }),

  getAll: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    await requireAdmin(ctx.session?.user?.id);

    const settings = await prisma.platformSetting.findMany();
    return settings;
  }),

  set: publicProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.unknown(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const prev = await prisma.platformSetting.findUnique({
        where: { key: input.key },
      });

      const setting = await prisma.platformSetting.upsert({
        where: { key: input.key },
        create: {
          key: input.key,
          value: input.value as never,
        },
        update: {
          value: input.value as never,
        },
      });

      await logAdminAction(
        ctx.session?.user?.id,
        "PLATFORM_SETTING",
        input.key,
        "UPDATE",
        prev?.value,
        input.value
      );

      return setting;
    }),

  getFees: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    await requireAdmin(ctx.session?.user?.id);

    const fees = await prisma.platformSetting.findUnique({
      where: { key: "fees" },
    });

    return (
      fees?.value || {
        paymentGateway: 2,
        serverMaintenance: 2,
        platformSupport: 10,
      }
    );
  }),

  setFees: publicProcedure
    .input(
      z.object({
        paymentGateway: z.number().min(0),
        serverMaintenance: z.number().min(0),
        platformSupport: z.number().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const prev = await prisma.platformSetting.findUnique({
        where: { key: "fees" },
      });

      const setting = await prisma.platformSetting.upsert({
        where: { key: "fees" },
        create: {
          key: "fees",
          value: input as never,
        },
        update: {
          value: input as never,
        },
      });

      await logAdminAction(
        ctx.session?.user?.id,
        "PLATFORM_SETTING",
        "fees",
        "UPDATE_FEES",
        prev?.value,
        input
      );

      return setting;
    }),

  getGstRate: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    await requireAdmin(ctx.session?.user?.id);

    const gstRate = await prisma.platformSetting.findUnique({
      where: { key: "gstRate" },
    });

    return gstRate?.value || 0.18;
  }),

  setGstRate: publicProcedure
    .input(
      z.object({
        gstRate: z.number().min(0).max(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const prev = await prisma.platformSetting.findUnique({
        where: { key: "gstRate" },
      });

      const setting = await prisma.platformSetting.upsert({
        where: { key: "gstRate" },
        create: {
          key: "gstRate",
          value: input.gstRate as never,
        },
        update: {
          value: input.gstRate as never,
        },
      });

      await logAdminAction(
        ctx.session?.user?.id,
        "PLATFORM_SETTING",
        "gstRate",
        "UPDATE_GST_RATE",
        prev?.value,
        input.gstRate
      );

      return setting;
    }),

  getCancellationDefaults: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    await requireAdmin(ctx.session?.user?.id);

    const defaults = await prisma.platformSetting.findUnique({
      where: { key: "cancellationDefaults" },
    });

    return (
      defaults?.value || {
        cancellationFeeFlat: 50,
        cancellationDeadlineHours: 24,
      }
    );
  }),

  setCancellationDefaults: publicProcedure
    .input(
      z.object({
        cancellationFeeFlat: z.number().min(0),
        cancellationDeadlineHours: z.number().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const prev = await prisma.platformSetting.findUnique({
        where: { key: "cancellationDefaults" },
      });

      const setting = await prisma.platformSetting.upsert({
        where: { key: "cancellationDefaults" },
        create: {
          key: "cancellationDefaults",
          value: input as never,
        },
        update: {
          value: input as never,
        },
      });

      await logAdminAction(
        ctx.session?.user?.id,
        "PLATFORM_SETTING",
        "cancellationDefaults",
        "UPDATE_CANCELLATION_DEFAULTS",
        prev?.value,
        input
      );

      return setting;
    }),

  getFeatureFlags: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    await requireAdmin(ctx.session?.user?.id);

    const flags = await prisma.platformSetting.findUnique({
      where: { key: "featureFlags" },
    });

    return flags?.value || {};
  }),

  setFeatureFlag: publicProcedure
    .input(
      z.object({
        flag: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const current = await prisma.platformSetting.findUnique({
        where: { key: "featureFlags" },
      });

      const currentFlags = (current?.value as Record<string, boolean>) || {};
      const newFlags = {
        ...currentFlags,
        [input.flag]: input.enabled,
      };

      const setting = await prisma.platformSetting.upsert({
        where: { key: "featureFlags" },
        create: {
          key: "featureFlags",
          value: newFlags as never,
        },
        update: {
          value: newFlags as never,
        },
      });

      await logAdminAction(
        ctx.session?.user?.id,
        "PLATFORM_SETTING",
        "featureFlags",
        "UPDATE_FEATURE_FLAG",
        currentFlags,
        newFlags
      );

      return setting;
    }),
});
