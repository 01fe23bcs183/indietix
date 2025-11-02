import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma as db } from "@indietix/db";
import { sendNotification, scheduleNotification } from "@indietix/notify";
import { TRPCError } from "@trpc/server";

export const notifyRouter = router({
  getPreferences: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in",
      });
    }

    let preferences = await db.notificationPreference.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!preferences) {
      preferences = await db.notificationPreference.create({
        data: {
          userId: ctx.session.user.id,
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true,
          transactional: true,
          reminders: true,
          marketing: false,
        },
      });
    }

    return preferences;
  }),

  updatePreferences: publicProcedure
    .input(
      z.object({
        emailEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
        transactional: z.boolean().optional(),
        reminders: z.boolean().optional(),
        marketing: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in",
        });
      }

      const preferences = await db.notificationPreference.upsert({
        where: { userId: ctx.session.user.id },
        update: input,
        create: {
          userId: ctx.session.user.id,
          emailEnabled: input.emailEnabled ?? true,
          smsEnabled: input.smsEnabled ?? false,
          pushEnabled: input.pushEnabled ?? true,
          transactional: input.transactional ?? true,
          reminders: input.reminders ?? true,
          marketing: input.marketing ?? false,
        },
      });

      return preferences;
    }),

  schedule: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        type: z.string(),
        channel: z.enum(["EMAIL", "SMS", "PUSH"]),
        category: z.enum(["TRANSACTIONAL", "REMINDERS", "MARKETING"]),
        to: z.string(),
        payload: z.record(z.unknown()),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const notificationId = await scheduleNotification({
        userId: input.userId,
        type: input.type,
        channel: input.channel,
        category: input.category,
        to: input.to,
        payload: input.payload,
        scheduledAt: input.scheduledAt,
      });

      return { notificationId };
    }),

  send: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        type: z.string(),
        channel: z.enum(["EMAIL", "SMS", "PUSH"]),
        category: z.enum(["TRANSACTIONAL", "REMINDERS", "MARKETING"]),
        to: z.string(),
        payload: z.record(z.unknown()),
      })
    )
    .mutation(async ({ input }) => {
      const result = await sendNotification({
        userId: input.userId,
        type: input.type,
        channel: input.channel,
        category: input.category,
        to: input.to,
        payload: input.payload,
      });

      return result;
    }),

  getHistory: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in",
        });
      }

      const notifications = await db.notification.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        skip: input.offset,
      });

      const total = await db.notification.count({
        where: { userId: ctx.session.user.id },
      });

      return {
        notifications,
        total,
      };
    }),

  preview: publicProcedure
    .input(
      z.object({
        type: z.string(),
        channel: z.enum(["EMAIL", "SMS", "PUSH"]),
        payload: z.record(z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in",
        });
      }

      const user = await db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (user?.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can preview notifications",
        });
      }

      const { renderEmailTemplate } = await import("@indietix/notify");
      const { renderSmsTemplate } = await import("@indietix/notify");
      const { renderPushTemplate } = await import("@indietix/notify");

      let preview;

      if (input.channel === "EMAIL") {
        preview = renderEmailTemplate(input.type, input.payload);
      } else if (input.channel === "SMS") {
        preview = renderSmsTemplate(input.type, input.payload);
      } else if (input.channel === "PUSH") {
        preview = renderPushTemplate(input.type, input.payload);
      }

      return preview;
    }),
});
