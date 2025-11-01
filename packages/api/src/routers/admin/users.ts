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

export const adminUsersRouter = router({
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        role: z.enum(["CUSTOMER", "ORGANIZER", "ADMIN"]).optional(),
        createdFrom: z.string().optional(),
        createdTo: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};

      if (input.search) {
        where.OR = [
          { email: { contains: input.search, mode: "insensitive" } },
          { name: { contains: input.search, mode: "insensitive" } },
          { phone: { contains: input.search, mode: "insensitive" } },
        ];
      }

      if (input.role) {
        where.role = input.role;
      }

      if (input.createdFrom || input.createdTo) {
        where.createdAt = {};
        if (input.createdFrom) {
          where.createdAt.gte = new Date(input.createdFrom);
        }
        if (input.createdTo) {
          where.createdAt.lte = new Date(input.createdTo);
        }
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            banned: true,
            createdAt: true,
            _count: {
              select: {
                bookings: true,
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users,
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
      await requireAdmin(ctx.session.user.id);

      const user = await prisma.user.findUnique({
        where: { id: input.id },
        include: {
          bookings: {
            include: {
              event: {
                select: {
                  title: true,
                  date: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          organizer: true,
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return user;
    }),

  updateRole: publicProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.enum(["CUSTOMER", "ORGANIZER", "ADMIN"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const prev = await prisma.user.findUnique({
        where: { id: input.id },
        select: { role: true },
      });

      const user = await prisma.user.update({
        where: { id: input.id },
        data: { role: input.role },
      });

      await logAdminAction(
        ctx.session.user.id,
        "USER",
        input.id,
        "UPDATE_ROLE",
        prev,
        { role: input.role }
      );

      return user;
    }),

  ban: publicProcedure
    .input(
      z.object({
        id: z.string(),
        banned: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session.user.id);

      const prev = await prisma.user.findUnique({
        where: { id: input.id },
        select: { banned: true },
      });

      const user = await prisma.user.update({
        where: { id: input.id },
        data: { banned: input.banned },
      });

      await logAdminAction(
        ctx.session.user.id,
        "USER",
        input.id,
        input.banned ? "BAN" : "UNBAN",
        prev,
        { banned: input.banned }
      );

      return user;
    }),
});
