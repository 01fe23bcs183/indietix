import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";

export const inboxRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const limit = input?.limit ?? 50;
      const cursor = input?.cursor;

      const notifications = await prisma.notification.findMany({
        where: {
          userId: ctx.session.user.id,
          status: "SENT",
        },
        orderBy: { sentAt: "desc" },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        select: {
          id: true,
          type: true,
          channel: true,
          category: true,
          payload: true,
          sentAt: true,
          readAt: true,
          campaignId: true,
        },
      });

      let nextCursor: string | undefined;
      if (notifications.length > limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: notifications,
        nextCursor,
      };
    }),

  read: publicProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const notification = await prisma.notification.findUnique({
        where: { id: input.notificationId },
      });

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      if (notification.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await prisma.notification.update({
        where: { id: input.notificationId },
        data: { readAt: new Date() },
      });

      return { success: true };
    }),

  unread: publicProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const notification = await prisma.notification.findUnique({
        where: { id: input.notificationId },
      });

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      if (notification.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await prisma.notification.update({
        where: { id: input.notificationId },
        data: { readAt: null },
      });

      return { success: true };
    }),

  markAllRead: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId: ctx.session.user.id,
        status: "SENT",
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { success: true, count: result.count };
  }),

  unreadCount: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const count = await prisma.notification.count({
      where: {
        userId: ctx.session.user.id,
        status: "SENT",
        readAt: null,
      },
    });

    return { count };
  }),

  detail: publicProcedure
    .input(z.object({ notificationId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const notification = await prisma.notification.findUnique({
        where: { id: input.notificationId },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      if (notification.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return notification;
    }),
});
