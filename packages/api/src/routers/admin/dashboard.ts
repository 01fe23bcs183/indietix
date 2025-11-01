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

export const adminDashboardRouter = router({
  kpis: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    await requireAdmin(ctx.session?.user?.id);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [gmvToday, revenueToday, activeUsers, bookingsLastHour] =
      await Promise.all([
        prisma.booking.aggregate({
          where: {
            status: "CONFIRMED",
            createdAt: { gte: todayStart },
          },
          _sum: {
            finalAmount: true,
          },
        }),
        prisma.booking.aggregate({
          where: {
            status: "CONFIRMED",
            createdAt: { gte: todayStart },
          },
          _sum: {
            platformFee: true,
          },
        }),
        prisma.user.count({
          where: {
            updatedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.booking.count({
          where: {
            createdAt: { gte: hourAgo },
          },
        }),
      ]);

    return {
      gmvToday: gmvToday._sum.finalAmount || 0,
      revenueToday: revenueToday._sum.platformFee || 0,
      activeUsers,
      bookingsLastHour,
      uptime: "99.9%", // Static placeholder
    };
  }),

  revenueLast30Days: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    await requireAdmin(ctx.session?.user?.id);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        platformFee: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const revenueByDate: Record<string, number> = {};
    bookings.forEach((booking) => {
      const date = booking.createdAt.toISOString().split("T")[0];
      if (!date) return;
      revenueByDate[date] = (revenueByDate[date] || 0) + booking.platformFee;
    });

    return Object.entries(revenueByDate).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }),

  bookingsByCategory: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    await requireAdmin(ctx.session?.user?.id);

    const bookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
      },
      include: {
        event: {
          select: {
            category: true,
          },
        },
      },
    });

    const byCategory: Record<string, number> = {};
    bookings.forEach((booking) => {
      const category = booking.event.category;
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    return Object.entries(byCategory).map(([category, count]) => ({
      category,
      count,
    }));
  }),

  topCities: publicProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const bookings = await prisma.booking.findMany({
        where: {
          status: "CONFIRMED",
        },
        include: {
          event: {
            select: {
              city: true,
            },
          },
        },
      });

      const byCity: Record<string, number> = {};
      bookings.forEach((booking) => {
        const city = booking.event.city;
        byCity[city] = (byCity[city] || 0) + 1;
      });

      return Object.entries(byCity)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, input.limit);
    }),

  recentActivity: publicProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      await requireAdmin(ctx.session?.user?.id);

      const [recentBookings, recentEvents] = await Promise.all([
        prisma.booking.findMany({
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            event: {
              select: {
                title: true,
              },
            },
          },
        }),
        prisma.event.findMany({
          take: input.limit,
          orderBy: { updatedAt: "desc" },
          include: {
            organizer: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      const activities = [
        ...recentBookings.map((b) => ({
          type: "BOOKING" as const,
          id: b.id,
          description: `${b.user.name} booked ${b.event.title}`,
          timestamp: b.createdAt,
          status: b.status,
        })),
        ...recentEvents.map((e) => ({
          type: "EVENT" as const,
          id: e.id,
          description: `${e.organizer.user.name} updated ${e.title}`,
          timestamp: e.updatedAt,
          status: e.status,
        })),
      ];

      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, input.limit);
    }),
});
