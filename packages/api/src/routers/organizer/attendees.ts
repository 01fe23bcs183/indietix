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

const checkEventOwnership = async (
  eventId: string,
  organizerId: string,
  userRole: string
) => {
  if (userRole === "ADMIN") {
    return;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });

  if (!event) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Event not found",
    });
  }

  if (event.organizerId !== organizerId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this event's attendees",
    });
  }
};

export const organizerAttendeesRouter = router({
  list: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        page: z.number().min(1).default(1),
        q: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      await checkEventOwnership(input.eventId, organizer.id, user.role);

      const limit = 20;
      const offset = (input.page - 1) * limit;

      const where: {
        eventId: string;
        user?: {
          OR: Array<{
            name?: { contains: string; mode: "insensitive" };
            email?: { contains: string; mode: "insensitive" };
            phone?: { contains: string; mode: "insensitive" };
          }>;
        };
      } = {
        eventId: input.eventId,
      };

      if (input.q) {
        where.user = {
          OR: [
            { name: { contains: input.q, mode: "insensitive" } },
            { email: { contains: input.q, mode: "insensitive" } },
            { phone: { contains: input.q, mode: "insensitive" } },
          ],
        };
      }

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        }),
        prisma.booking.count({ where }),
      ]);

      return {
        attendees: bookings.map(
          (booking: {
            id: string;
            user: { name: string; email: string; phone: string | null };
            quantity: number;
            status: string;
            paymentStatus: string;
            updatedAt: Date;
            createdAt: Date;
          }) => ({
            ticketNumber: booking.id,
            userName: booking.user.name,
            userEmail: booking.user.email,
            userPhone: booking.user.phone,
            seats: booking.quantity,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            paidAt:
              booking.paymentStatus === "COMPLETED" ? booking.updatedAt : null,
            createdAt: booking.createdAt,
          })
        ),
        total,
        page: input.page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  exportCsv: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      await checkEventOwnership(input.eventId, organizer.id, user.role);

      const bookings = await prisma.booking.findMany({
        where: { eventId: input.eventId },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      const headers = [
        "ticketNumber",
        "userName",
        "userEmail",
        "userPhone",
        "seats",
        "status",
        "paidAt",
        "createdAt",
      ];

      const rows = bookings.map(
        (booking: {
          id: string;
          user: { name: string; email: string; phone: string | null };
          quantity: number;
          status: string;
          paymentStatus: string;
          updatedAt: Date;
          createdAt: Date;
        }) => [
          booking.id,
          booking.user.name,
          booking.user.email,
          booking.user.phone || "",
          booking.quantity.toString(),
          booking.status,
          booking.paymentStatus === "COMPLETED"
            ? booking.updatedAt.toISOString()
            : "",
          booking.createdAt.toISOString(),
        ]
      );

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
      ].join("\n");

      return csvContent;
    }),
});
