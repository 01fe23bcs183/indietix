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

export const adminEventsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        status: z
          .enum(["DRAFT", "PUBLISHED", "CANCELLED", "SOLD_OUT", "COMPLETED"])
          .optional(),
        category: z
          .enum(["MUSIC", "COMEDY", "SPORTS", "TECH", "FOOD", "ART", "OTHER"])
          .optional(),
        city: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
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

      const where: any = {};

      if (input.status) {
        where.status = input.status;
      }

      if (input.category) {
        where.category = input.category;
      }

      if (input.city) {
        where.city = { contains: input.city, mode: "insensitive" };
      }

      if (input.dateFrom || input.dateTo) {
        where.date = {};
        if (input.dateFrom) {
          where.date.gte = new Date(input.dateFrom);
        }
        if (input.dateTo) {
          where.date.lte = new Date(input.dateTo);
        }
      }

      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          include: {
            organizer: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            _count: {
              select: {
                bookings: true,
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { date: "desc" },
        }),
        prisma.event.count({ where }),
      ]);

      return {
        events,
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

      const event = await prisma.event.findUnique({
        where: { id: input.id },
        include: {
          organizer: {
            include: {
              user: true,
            },
          },
          bookings: {
            where: {
              status: "CONFIRMED",
            },
            select: {
              id: true,
              finalAmount: true,
              seats: true,
              createdAt: true,
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      return event;
    }),

  feature: publicProcedure
    .input(
      z.object({
        id: z.string(),
        featured: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const prev = await prisma.event.findUnique({
        where: { id: input.id },
        select: { featured: true },
      });

      const event = await prisma.event.update({
        where: { id: input.id },
        data: { featured: input.featured },
      });

      await logAdminAction(
        ctx.session?.user?.id,
        "EVENT",
        input.id,
        input.featured ? "FEATURE" : "UNFEATURE",
        prev,
        { featured: input.featured }
      );

      return event;
    }),

  hide: publicProcedure
    .input(
      z.object({
        id: z.string(),
        hidden: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const prev = await prisma.event.findUnique({
        where: { id: input.id },
        select: { hidden: true },
      });

      const event = await prisma.event.update({
        where: { id: input.id },
        data: { hidden: input.hidden },
      });

      await logAdminAction(
        ctx.session?.user?.id,
        "EVENT",
        input.id,
        input.hidden ? "HIDE" : "UNHIDE",
        prev,
        { hidden: input.hidden }
      );

      return event;
    }),

  cancel: publicProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const prev = await prisma.event.findUnique({
        where: { id: input.id },
        select: { status: true, cancelReason: true },
      });

      const event = await prisma.event.update({
        where: { id: input.id },
        data: {
          status: "CANCELLED",
          cancelReason: input.reason,
        },
      });

      await logAdminAction(ctx.session?.user?.id, "EVENT", input.id, "CANCEL", prev, {
        status: "CANCELLED",
        cancelReason: input.reason,
      });

      return event;
    }),
});
