import { router, publicProcedure } from "../../trpc";
import { z } from "zod";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";
import { slugify } from "@indietix/utils";

const eventInputSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  category: z.enum([
    "MUSIC",
    "COMEDY",
    "SPORTS",
    "TECH",
    "FOOD",
    "ART",
    "OTHER",
  ]),
  city: z.string().min(2),
  venue: z.string().min(3),
  date: z.coerce.date(),
  price: z.number().min(0),
  totalSeats: z.number().min(1),
  imageUrl: z.string().url().optional(),
});

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
      message: "You do not have permission to modify this event",
    });
  }
};

const generateUniqueSlug = async (title: string): Promise<string> => {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.event.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

export const organizerEventsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        q: z.string().optional(),
        status: z
          .enum(["DRAFT", "PUBLISHED", "CANCELLED", "SOLD_OUT", "COMPLETED"])
          .optional(),
        city: z.string().optional(),
        category: z
          .enum(["MUSIC", "COMEDY", "SPORTS", "TECH", "FOOD", "ART", "OTHER"])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      const limit = 20;
      const offset = (input.page - 1) * limit;

      const where: {
        organizerId: string;
        title?: { contains: string; mode: "insensitive" };
        status?: "DRAFT" | "PUBLISHED" | "CANCELLED" | "SOLD_OUT" | "COMPLETED";
        city?: string;
        category?:
          | "MUSIC"
          | "COMEDY"
          | "SPORTS"
          | "TECH"
          | "FOOD"
          | "ART"
          | "OTHER";
      } = {
        organizerId: organizer.id,
      };

      if (input.q) {
        where.title = { contains: input.q, mode: "insensitive" };
      }

      if (input.status) {
        where.status = input.status;
      }

      if (input.city) {
        where.city = input.city;
      }

      if (input.category) {
        where.category = input.category;
      }

      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
          include: {
            _count: {
              select: { bookings: true },
            },
          },
        }),
        prisma.event.count({ where }),
      ]);

      return {
        events,
        total,
        page: input.page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      const event = await prisma.event.findUnique({
        where: { id: input.id },
        include: {
          organizer: {
            select: {
              businessName: true,
              description: true,
            },
          },
          _count: {
            select: { bookings: true },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (event.organizerId !== organizer.id && user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this event",
        });
      }

      return event;
    }),

  create: publicProcedure
    .input(eventInputSchema)
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      const slug = await generateUniqueSlug(input.title);

      const event = await prisma.event.create({
        data: {
          ...input,
          slug,
          organizerId: organizer.id,
        },
      });

      return event;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        data: eventInputSchema.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      await checkEventOwnership(input.id, organizer.id, user.role);

      let updateData: Record<string, unknown> = { ...input.data };

      if (input.data.title) {
        const slug = await generateUniqueSlug(input.data.title);
        updateData.slug = slug;
      }

      const event = await prisma.event.update({
        where: { id: input.id },
        data: updateData,
      });

      return event;
    }),

  setStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          "DRAFT",
          "PUBLISHED",
          "CANCELLED",
          "SOLD_OUT",
          "COMPLETED",
        ]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      await checkEventOwnership(input.id, organizer.id, user.role);

      const event = await prisma.event.update({
        where: { id: input.id },
        data: { status: input.status },
      });

      return event;
    }),

  duplicate: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);

      const originalEvent = await prisma.event.findUnique({
        where: { id: input.id },
      });

      if (!originalEvent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (originalEvent.organizerId !== organizer.id && user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to duplicate this event",
        });
      }

      const slug = await generateUniqueSlug(`${originalEvent.title} Copy`);

      const duplicatedEvent = await prisma.event.create({
        data: {
          title: `${originalEvent.title} Copy`,
          slug,
          description: originalEvent.description,
          category: originalEvent.category,
          city: originalEvent.city,
          venue: originalEvent.venue,
          date: originalEvent.date,
          price: originalEvent.price,
          totalSeats: originalEvent.totalSeats,
          status: "DRAFT",
          organizerId: organizer.id,
        },
      });

      return duplicatedEvent;
    }),
});
