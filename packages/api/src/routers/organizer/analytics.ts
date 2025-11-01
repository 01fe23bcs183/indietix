import { router, publicProcedure } from "../../trpc";
import { z } from "zod";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";

const requireAuth = (ctx: {
  session?: { user?: { id: string; email: string; role: string } };
}) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }
  return ctx.session.user;
};

const requireOrganizer = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organizer: true },
  });

  if (!user?.organizer) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User is not an organizer",
    });
  }

  return user.organizer;
};

export const organizerAnalyticsRouter = router({
  summary: publicProcedure
    .input(
      z.object({
        from: z.string().datetime(),
        to: z.string().datetime(),
        organizerId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      const targetOrganizerId = input.organizerId || organizer.id;

      if (user.role !== "ADMIN" && targetOrganizerId !== organizer.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot access other organizer's analytics",
        });
      }

      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);

      const confirmedBookings = await prisma.booking.findMany({
        where: {
          event: {
            organizerId: targetOrganizerId,
          },
          status: "CONFIRMED",
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        select: {
          finalAmount: true,
          seats: true,
        },
      });

      const revenue = confirmedBookings.reduce(
        (sum: number, booking: { finalAmount: number; seats: number }) => sum + booking.finalAmount,
        0
      );
      const bookings = confirmedBookings.length;
      const seatsSold = confirmedBookings.reduce(
        (sum: number, booking: { finalAmount: number; seats: number }) => sum + booking.seats,
        0
      );
      const avgTicket = bookings > 0 ? Math.round(revenue / bookings) : 0;

      const eventsLive = await prisma.event.count({
        where: {
          organizerId: targetOrganizerId,
          status: "PUBLISHED",
          date: {
            gte: new Date(),
          },
        },
      });

      return {
        revenue,
        bookings,
        avgTicket,
        seatsSold,
        eventsLive,
      };
    }),

  timeseries: publicProcedure
    .input(
      z.object({
        from: z.string().datetime(),
        to: z.string().datetime(),
        interval: z.enum(["day", "week"]),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);

      const bookings = await prisma.booking.findMany({
        where: {
          event: {
            organizerId: organizer.id,
          },
          status: "CONFIRMED",
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        select: {
          createdAt: true,
          finalAmount: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const buckets = new Map<
        string,
        { t: string; revenue: number; bookings: number }
      >();

      const getBucketKey = (date: Date): string => {
        if (input.interval === "day") {
          return date.toISOString().split("T")[0] || "";
        } else {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return weekStart.toISOString().split("T")[0] || "";
        }
      };

      let currentDate = new Date(fromDate);
      while (currentDate <= toDate) {
        const key = getBucketKey(currentDate);
        if (!buckets.has(key)) {
          buckets.set(key, { t: key, revenue: 0, bookings: 0 });
        }
        if (input.interval === "day") {
          currentDate.setDate(currentDate.getDate() + 1);
        } else {
          currentDate.setDate(currentDate.getDate() + 7);
        }
      }

      bookings.forEach((booking: { createdAt: Date; finalAmount: number }) => {
        const key = getBucketKey(booking.createdAt);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.revenue += booking.finalAmount;
          bucket.bookings += 1;
        }
      });

      return Array.from(buckets.values()).sort((a, b) =>
        a.t.localeCompare(b.t)
      );
    }),

  topEvents: publicProcedure
    .input(
      z.object({
        from: z.string().datetime(),
        to: z.string().datetime(),
        by: z.enum(["revenue", "attendance"]),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);

      const bookingsByEvent = await prisma.booking.groupBy({
        by: ["eventId"],
        where: {
          event: {
            organizerId: organizer.id,
          },
          status: "CONFIRMED",
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        _sum: {
          finalAmount: true,
          seats: true,
        },
        _count: {
          id: true,
        },
      });

      const eventIds = bookingsByEvent.map((b: { eventId: string }) => b.eventId);
      const events = await prisma.event.findMany({
        where: {
          id: {
            in: eventIds,
          },
        },
        select: {
          id: true,
          title: true,
          date: true,
          city: true,
          category: true,
        },
      });

      type EventData = {
        id: string;
        title: string;
        date: Date;
        city: string;
        category: string;
      };

      const eventMap = new Map<string, EventData>(
        events.map((e: EventData) => [e.id, e])
      );

      const topEvents = bookingsByEvent
        .map((booking: {
          eventId: string;
          _sum: { finalAmount: number | null; seats: number | null };
          _count: { id: number };
        }) => {
          const event = eventMap.get(booking.eventId);
          return {
            eventId: booking.eventId,
            eventTitle: event?.title || "Unknown",
            eventDate: event?.date?.toISOString() || "",
            city: event?.city || "",
            category: event?.category || "",
            revenue: booking._sum.finalAmount || 0,
            attendance: booking._sum.seats || 0,
            bookings: booking._count.id,
          };
        })
        .sort((a: { revenue: number; attendance: number }, b: { revenue: number; attendance: number }) => {
          if (input.by === "revenue") {
            return b.revenue - a.revenue;
          } else {
            return b.attendance - a.attendance;
          }
        })
        .slice(0, input.limit);

      return topEvents;
    }),

  funnel: publicProcedure
    .input(
      z.object({
        from: z.string().datetime(),
        to: z.string().datetime(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);

      const organizerEventIds = await prisma.event.findMany({
        where: {
          organizerId: organizer.id,
        },
        select: {
          id: true,
        },
      });

      const eventIds = organizerEventIds.map((e: { id: string }) => e.id);

      const [views, bookings] = await Promise.all([
        prisma.eventView.count({
          where: {
            eventId: {
              in: eventIds,
            },
            createdAt: {
              gte: fromDate,
              lte: toDate,
            },
          },
        }),
        prisma.booking.count({
          where: {
            eventId: {
              in: eventIds,
            },
            createdAt: {
              gte: fromDate,
              lte: toDate,
            },
          },
        }),
      ]);

      return {
        views,
        detailViews: views,
        addToCart: bookings,
        bookings,
      };
    }),

  exportCsv: publicProcedure
    .input(
      z.object({
        from: z.string().datetime(),
        to: z.string().datetime(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);

      const bookings = await prisma.booking.findMany({
        where: {
          event: {
            organizerId: organizer.id,
          },
          status: "CONFIRMED",
          createdAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        select: {
          createdAt: true,
          finalAmount: true,
          seats: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const buckets = new Map<
        string,
        { date: string; revenue: number; bookings: number; seats: number }
      >();

      const getBucketKey = (date: Date): string => {
        return date.toISOString().split("T")[0] || "";
      };

      let currentDate = new Date(fromDate);
      while (currentDate <= toDate) {
        const key = getBucketKey(currentDate);
        if (!buckets.has(key)) {
          buckets.set(key, { date: key, revenue: 0, bookings: 0, seats: 0 });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      bookings.forEach((booking: { createdAt: Date; finalAmount: number; seats: number }) => {
        const key = getBucketKey(booking.createdAt);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.revenue += booking.finalAmount;
          bucket.bookings += 1;
          bucket.seats += booking.seats;
        }
      });

      const timeseries = Array.from(buckets.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      const totalRevenue = timeseries.reduce((sum, row) => sum + row.revenue, 0);
      const totalBookings = timeseries.reduce(
        (sum, row) => sum + row.bookings,
        0
      );
      const totalSeats = timeseries.reduce((sum, row) => sum + row.seats, 0);

      const headers = ["date", "revenue", "bookings", "seats"];
      const rows = timeseries.map((row) => [
        row.date,
        row.revenue.toString(),
        row.bookings.toString(),
        row.seats.toString(),
      ]);

      const summaryRows = [
        [""],
        ["Summary"],
        ["Total Revenue", totalRevenue.toString()],
        ["Total Bookings", totalBookings.toString()],
        ["Total Seats Sold", totalSeats.toString()],
        [
          "Average Ticket",
          totalBookings > 0
            ? Math.round(totalRevenue / totalBookings).toString()
            : "0",
        ],
      ];

      const csvContent = [
        headers.join(","),
        ...rows.map((row: string[]) =>
          row
            .map((cell: string) => {
              const cellStr = String(cell);
              if (
                cellStr.includes(",") ||
                cellStr.includes('"') ||
                cellStr.includes("\n")
              ) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(",")
        ),
        ...summaryRows.map((row: string[]) =>
          row
            .map((cell: string) => {
              const cellStr = String(cell);
              if (
                cellStr.includes(",") ||
                cellStr.includes('"') ||
                cellStr.includes("\n")
              ) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(",")
        ),
      ].join("\n");

      return csvContent;
    }),
});
