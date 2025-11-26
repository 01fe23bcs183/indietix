import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";
import { buildSegmentWhereClause } from "@indietix/marketing";

const createCampaignSchema = z.object({
  name: z.string().min(1),
  channel: z.enum(["EMAIL", "SMS"]),
  templateKey: z.string(),
  segmentId: z.string(),
  scheduledAt: z.date().optional(),
});

export const campaignsRouter = router({
  create: publicProcedure
    .input(createCampaignSchema)
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

      const segment = await prisma.segment.findUnique({
        where: { id: input.segmentId },
      });

      if (!segment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Segment not found",
        });
      }

      const campaign = await prisma.campaign.create({
        data: {
          name: input.name,
          channel: input.channel,
          templateKey: input.templateKey,
          scheduledAt: input.scheduledAt,
          createdBy: user.id,
          status: input.scheduledAt ? "SCHEDULED" : "DRAFT",
        },
      });

      const segmentQuery = segment.query as Record<string, unknown>;
      const whereClause = buildSegmentWhereClause(segmentQuery);

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          phone: true,
        },
      });

      await prisma.campaignRecipient.createMany({
        data: users.map((u) => ({
          campaignId: campaign.id,
          userId: u.id,
          email: u.email,
          phone: u.phone || undefined,
        })),
      });

      return campaign;
    }),

  schedule: publicProcedure
    .input(
      z.object({
        id: z.string(),
        scheduledAt: z.date(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const campaign = await prisma.campaign.findUnique({
        where: { id: input.id },
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

      const updated = await prisma.campaign.update({
        where: { id: input.id },
        data: {
          scheduledAt: input.scheduledAt,
          status: "SCHEDULED",
        },
      });

      return updated;
    }),

  cancel: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const campaign = await prisma.campaign.findUnique({
        where: { id: input.id },
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

      if (campaign.status === "SENT" || campaign.status === "SENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel campaign that is already sent or sending",
        });
      }

      const updated = await prisma.campaign.update({
        where: { id: input.id },
        data: {
          status: "DRAFT",
          scheduledAt: null,
        },
      });

      return updated;
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "ORGANIZER")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const where = user.role === "ADMIN" ? {} : { createdBy: user.id };

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { recipients: true },
        },
      },
    });

    return campaigns;
  }),

  detail: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const campaign = await prisma.campaign.findUnique({
        where: { id: input.id },
        include: {
          recipients: {
            take: 100,
          },
          _count: {
            select: {
              recipients: true,
              bookings: true,
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

      const totalRecipients = campaign._count.recipients;
      const sentCount = await prisma.campaignRecipient.count({
        where: {
          campaignId: campaign.id,
          status: { in: ["SENT", "OPENED", "CLICKED"] },
        },
      });
      const openedCount = await prisma.campaignRecipient.count({
        where: {
          campaignId: campaign.id,
          status: { in: ["OPENED", "CLICKED"] },
        },
      });
      const clickedCount = await prisma.campaignRecipient.count({
        where: {
          campaignId: campaign.id,
          status: "CLICKED",
        },
      });

      return {
        ...campaign,
        metrics: {
          totalRecipients,
          sent: sentCount,
          opened: openedCount,
          clicked: clickedCount,
          openRate: sentCount > 0 ? (openedCount / sentCount) * 100 : 0,
          clickRate: sentCount > 0 ? (clickedCount / sentCount) * 100 : 0,
          conversions: campaign._count.bookings,
        },
      };
    }),
});
