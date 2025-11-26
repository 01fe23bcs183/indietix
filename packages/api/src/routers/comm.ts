import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";
import {
  executeSendPipeline,
  pauseCampaign,
  resumeCampaign,
  getOutboxList,
  getFailedNotifications,
  retryFailedNotification,
  retryAllFailedForCampaign,
  estimateRecipientCount,
  updateCampaignStats,
} from "@indietix/comm";

const segmentQuerySchema = z.object({
  city: z.string().optional(),
  categories: z.array(z.string()).optional(),
  attended_in_last_days: z.number().positive().optional(),
  price_ceiling: z.number().positive().optional(),
});

const createSendSchema = z.object({
  channel: z.enum(["EMAIL", "SMS", "PUSH"]),
  templateKey: z.string().min(1),
  segmentId: z.string().optional(),
  inlineFilter: segmentQuerySchema.optional(),
  payload: z.record(z.unknown()),
  schedule: z.date().optional(),
  rate: z.number().positive().optional(),
  utmEnabled: z.boolean().optional(),
});

export const commRouter = router({
  send: router({
    create: publicProcedure
      .input(createSendSchema)
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const user = await prisma.user.findUnique({
          where: { id: ctx.session.user.id },
        });

        if (!user || (user.role !== "ADMIN" && user.role !== "ORGANIZER")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        if (!input.segmentId && !input.inlineFilter) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Either segmentId or inlineFilter must be provided",
          });
        }

        try {
          const result = await executeSendPipeline(
            {
              channel: input.channel,
              templateKey: input.templateKey,
              segmentId: input.segmentId,
              inlineFilter: input.inlineFilter,
              payload: input.payload,
              schedule: input.schedule,
              rateLimit: input.rate,
              utmEnabled: input.utmEnabled,
            },
            user.id
          );

          return result;
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }),

    pause: publicProcedure
      .input(z.object({ campaignId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const campaign = await prisma.campaign.findUnique({
          where: { id: input.campaignId },
        });

        if (!campaign) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campaign not found",
          });
        }

        if (campaign.createdBy !== ctx.session.user.id) {
          const user = await prisma.user.findUnique({
            where: { id: ctx.session.user.id },
          });
          if (user?.role !== "ADMIN") {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }

        await pauseCampaign(input.campaignId);

        return { success: true };
      }),

    resume: publicProcedure
      .input(z.object({ campaignId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const campaign = await prisma.campaign.findUnique({
          where: { id: input.campaignId },
        });

        if (!campaign) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campaign not found",
          });
        }

        if (campaign.createdBy !== ctx.session.user.id) {
          const user = await prisma.user.findUnique({
            where: { id: ctx.session.user.id },
          });
          if (user?.role !== "ADMIN") {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }

        await resumeCampaign(input.campaignId);

        return { success: true };
      }),

    estimate: publicProcedure
      .input(
        z.object({
          segmentId: z.string().optional(),
          inlineFilter: segmentQuerySchema.optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const count = await estimateRecipientCount(
          input.segmentId,
          input.inlineFilter
        );

        return { count };
      }),
  }),

  outbox: router({
    list: publicProcedure
      .input(
        z.object({
          status: z.string().optional(),
        }).optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const user = await prisma.user.findUnique({
          where: { id: ctx.session.user.id },
        });

        if (!user || (user.role !== "ADMIN" && user.role !== "ORGANIZER")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const campaigns = await getOutboxList(input?.status);

        if (user.role !== "ADMIN") {
          const userCampaigns = await prisma.campaign.findMany({
            where: { createdBy: user.id },
            select: { id: true },
          });
          const userCampaignIds = new Set(userCampaigns.map((c) => c.id));
          return campaigns.filter((c) => userCampaignIds.has(c.id));
        }

        return campaigns;
      }),

    detail: publicProcedure
      .input(z.object({ campaignId: z.string() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const campaign = await prisma.campaign.findUnique({
          where: { id: input.campaignId },
          include: {
            _count: {
              select: {
                recipients: true,
                notifications: true,
              },
            },
          },
        });

        if (!campaign) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Campaign not found",
          });
        }

        await updateCampaignStats(input.campaignId);

        const updatedCampaign = await prisma.campaign.findUnique({
          where: { id: input.campaignId },
        });

        const notifications = await prisma.notification.findMany({
          where: { campaignId: input.campaignId },
          take: 100,
          orderBy: { createdAt: "desc" },
        });

        return {
          ...updatedCampaign,
          notifications,
          recipientCount: campaign._count.recipients || campaign._count.notifications,
        };
      }),

    refresh: publicProcedure
      .input(z.object({ campaignId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        await updateCampaignStats(input.campaignId);

        return { success: true };
      }),
  }),

  failed: router({
    list: publicProcedure
      .input(
        z.object({
          campaignId: z.string().optional(),
        }).optional()
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const user = await prisma.user.findUnique({
          where: { id: ctx.session.user.id },
        });

        if (!user || (user.role !== "ADMIN" && user.role !== "ORGANIZER")) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return getFailedNotifications(input?.campaignId);
      }),

    retry: publicProcedure
      .input(z.object({ notificationId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        await retryFailedNotification(input.notificationId);

        return { success: true };
      }),

    retryAll: publicProcedure
      .input(z.object({ campaignId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const count = await retryAllFailedForCampaign(input.campaignId);

        return { success: true, count };
      }),

    export: publicProcedure
      .input(z.object({ campaignId: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const failed = await getFailedNotifications(input.campaignId);

        const csvRows = [
          ["ID", "User ID", "To", "Type", "Channel", "Error", "Attempts", "Last Attempt"].join(","),
          ...failed.map((n) =>
            [
              n.id,
              n.userId || "",
              n.to,
              n.type,
              n.channel,
              `"${(n.errorMessage || "").replace(/"/g, '""')}"`,
              n.attempts,
              n.lastAttemptAt?.toISOString() || "",
            ].join(",")
          ),
        ];

        return { csv: csvRows.join("\n") };
      }),
  }),
});
