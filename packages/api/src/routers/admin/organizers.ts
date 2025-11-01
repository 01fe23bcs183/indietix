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

export const adminOrganizersRouter = router({
  verificationQueue: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const [organizers, total] = await Promise.all([
        prisma.organizer.findMany({
          where: { verified: false },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                phone: true,
              },
            },
            _count: {
              select: {
                events: true,
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "asc" },
        }),
        prisma.organizer.count({ where: { verified: false } }),
      ]);

      return {
        organizers,
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  list: publicProcedure
    .input(
      z.object({
        verified: z.boolean().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const where: {
        verified?: boolean;
        OR?: Array<{
          businessName?: { contains: string; mode: "insensitive" };
          user?: {
            email?: { contains: string; mode: "insensitive" };
            name?: { contains: string; mode: "insensitive" };
          };
        }>;
      } = {};

      if (input.verified !== undefined) {
        where.verified = input.verified;
      }

      if (input.search) {
        where.OR = [
          { businessName: { contains: input.search, mode: "insensitive" } },
          {
            user: {
              email: { contains: input.search, mode: "insensitive" },
            },
          },
          {
            user: {
              name: { contains: input.search, mode: "insensitive" },
            },
          },
        ];
      }

      const [organizers, total] = await Promise.all([
        prisma.organizer.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                phone: true,
              },
            },
            _count: {
              select: {
                events: true,
                payouts: true,
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.organizer.count({ where }),
      ]);

      return {
        organizers,
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const organizer = await prisma.organizer.findUnique({
        where: { id: input.id },
        include: {
          user: true,
          events: {
            select: {
              id: true,
              title: true,
              status: true,
              date: true,
              price: true,
              bookedSeats: true,
              totalSeats: true,
            },
            orderBy: { date: "desc" },
            take: 10,
          },
          payouts: {
            select: {
              id: true,
              amount: true,
              status: true,
              periodStart: true,
              periodEnd: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!organizer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organizer not found",
        });
      }

      const revenue = await prisma.booking.aggregate({
        where: {
          event: {
            organizerId: input.id,
          },
          status: "CONFIRMED",
        },
        _sum: {
          finalAmount: true,
        },
      });

      return {
        ...organizer,
        totalRevenue: revenue._sum.finalAmount || 0,
      };
    }),

  approve: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const prev = await prisma.organizer.findUnique({
        where: { id: input.id },
        select: { verified: true },
      });

      const organizer = await prisma.organizer.update({
        where: { id: input.id },
        data: { verified: true },
      });

      await logAdminAction(
        ctx.session?.user?.id,
        "ORGANIZER",
        input.id,
        "APPROVE",
        prev,
        { verified: true }
      );

      return organizer;
    }),

  reject: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const prev = await prisma.organizer.findUnique({
        where: { id: input.id },
        select: { verified: true },
      });

      const organizer = await prisma.organizer.update({
        where: { id: input.id },
        data: { verified: false },
      });

      await logAdminAction(
        ctx.session?.user?.id,
        "ORGANIZER",
        input.id,
        "REJECT",
        prev,
        { verified: false }
      );

      return organizer;
    }),

  setCommissionOverride: publicProcedure
    .input(
      z.object({
        id: z.string(),
        commissionOverride: z.number().min(0).max(100).nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const prev = await prisma.organizer.findUnique({
        where: { id: input.id },
        select: { commissionOverride: true },
      });

      const organizer = await prisma.organizer.update({
        where: { id: input.id },
        data: { commissionOverride: input.commissionOverride },
      });

      await logAdminAction(
        ctx.session?.user?.id,
        "ORGANIZER",
        input.id,
        "SET_COMMISSION_OVERRIDE",
        prev,
        { commissionOverride: input.commissionOverride }
      );

      return organizer;
    }),
});
