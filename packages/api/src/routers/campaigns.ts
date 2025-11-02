import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import { executeSegmentQuery, type SegmentQuery } from "@indietix/marketing";
import { TRPCError } from "@trpc/server";

function requireAuth(ctx: {
  session?: { user?: { id: string; role: string } };
}) {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }
  return ctx.session.user;
}

function requireOrganizerOrAdmin(user: { role: string }) {
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organizers and admins can manage campaigns",
    });
  }
}

export const campaignsRouter = router({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        channel: z.enum(["EMAIL", "SMS"]),
        templateKey: z.string(),
        segmentId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      if (input.segmentId) {
        const segment = await prisma.segment.findUnique({
          where: { id: input.segmentId },
        });

        if (!segment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Segment not found",
          });
        }

        if (segment.createdBy !== user.id && user.role !== "ADMIN") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only use your own segments",
          });
        }
      }

      const campaign = await prisma.campaign.create({
        data: {
          name: input.name,
          channel: input.channel,
          templateKey: input.templateKey,
          segmentId: input.segmentId ?? null,
          createdBy: user.id,
          status: "DRAFT",
        },
      });

      return campaign;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        templateKey: z.string().optional(),
        segmentId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      const campaign = await prisma.campaign.findUnique({
        where: { id: input.id },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (campaign.createdBy !== user.id && user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own campaigns",
        });
      }

      if (campaign.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only update draft campaigns",
        });
      }

      const updated = await prisma.campaign.update({
        where: { id: input.id },
        data: {
          name: input.name,
          templateKey: input.templateKey,
          segmentId: input.segmentId,
        },
      });

      return updated;
    }),

  schedule: publicProcedure
    .input(
      z.object({
        id: z.string(),
        scheduledAt: z.string().datetime(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      const campaign = await prisma.campaign.findUnique({
        where: { id: input.id },
        include: {
          segment: true,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (campaign.createdBy !== user.id && user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only schedule your own campaigns",
        });
      }

      if (campaign.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only schedule draft campaigns",
        });
      }

      const scheduledAt = new Date(input.scheduledAt);
      if (scheduledAt <= new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Scheduled time must be in the future",
        });
      }

      let recipients: Array<{
        email: string;
        phone: string | null;
        userId: string;
      }> = [];

      if (campaign.segment) {
        const users = await executeSegmentQuery(
          prisma,
          campaign.segment.query as SegmentQuery
        );
        recipients = users.map(
          (u: { id: string; email: string; phone: string | null }) => ({
            email: u.email,
            phone: u.phone,
            userId: u.id,
          })
        );
      } else {
        const users = await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            phone: true,
          },
        });
        recipients = users.map((u) => ({
          email: u.email,
          phone: u.phone,
          userId: u.id,
        }));
      }

      if (recipients.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No recipients found for this campaign",
        });
      }

      await prisma.campaignRecipient.createMany({
        data: recipients.map((r) => ({
          campaignId: campaign.id,
          userId: r.userId,
          email: r.email,
          phone: r.phone,
          status: "PENDING",
        })),
      });

      const updated = await prisma.campaign.update({
        where: { id: input.id },
        data: {
          status: "SCHEDULED",
          scheduledAt,
        },
      });

      return {
        campaign: updated,
        recipientCount: recipients.length,
      };
    }),

  cancel: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      const campaign = await prisma.campaign.findUnique({
        where: { id: input.id },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      if (campaign.createdBy !== user.id && user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only cancel your own campaigns",
        });
      }

      if (campaign.status !== "SCHEDULED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only cancel scheduled campaigns",
        });
      }

      const updated = await prisma.campaign.update({
        where: { id: input.id },
        data: {
          status: "DRAFT",
          scheduledAt: null,
        },
      });

      await prisma.campaignRecipient.deleteMany({
        where: {
          campaignId: input.id,
          status: "PENDING",
        },
      });

      return updated;
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    const user = requireAuth(ctx);
    requireOrganizerOrAdmin(user);

    const where = user.role === "ADMIN" ? {} : { createdBy: user.id };

    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        segment: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            recipients: true,
            bookings: true,
          },
        },
      },
    });

    return campaigns;
  }),

  detail: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      const campaign = await prisma.campaign.findUnique({
        where: { id: input.id },
        include: {
          segment: {
            select: {
              id: true,
              name: true,
              query: true,
            },
          },
          recipients: {
            select: {
              id: true,
              email: true,
              status: true,
              openedAt: true,
              clickedAt: true,
            },
          },
          _count: {
            select: {
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

      if (campaign.createdBy !== user.id && user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view your own campaigns",
        });
      }

      const totalRecipients = campaign.recipients.length;
      const sentCount = campaign.recipients.filter(
        (r) => r.status === "SENT"
      ).length;
      const openedCount = campaign.recipients.filter(
        (r) => r.openedAt !== null
      ).length;
      const clickedCount = campaign.recipients.filter(
        (r) => r.clickedAt !== null
      ).length;
      const conversions = campaign._count.bookings;

      const openRate =
        totalRecipients > 0 ? (openedCount / totalRecipients) * 100 : 0;
      const clickRate =
        totalRecipients > 0 ? (clickedCount / totalRecipients) * 100 : 0;
      const conversionRate =
        totalRecipients > 0 ? (conversions / totalRecipients) * 100 : 0;

      return {
        campaign,
        metrics: {
          totalRecipients,
          sent: sentCount,
          opened: openedCount,
          clicked: clickedCount,
          conversions,
          openRate: Math.round(openRate * 100) / 100,
          clickRate: Math.round(clickRate * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
        },
      };
    }),

  preview: publicProcedure
    .input(
      z.object({
        segmentId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      let count = 0;

      if (input.segmentId) {
        const segment = await prisma.segment.findUnique({
          where: { id: input.segmentId },
        });

        if (!segment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Segment not found",
          });
        }

        if (segment.createdBy !== user.id && user.role !== "ADMIN") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only preview your own segments",
          });
        }

        const users = await executeSegmentQuery(
          prisma,
          segment.query as SegmentQuery
        );
        count = users.length;
      } else {
        count = await prisma.user.count();
      }

      return {
        recipientCount: count,
      };
    }),
});
