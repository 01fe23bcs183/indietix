import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";

export const eventsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        city: z.string().optional(),
        category: z
          .enum(["MUSIC", "COMEDY", "SPORTS", "TECH", "FOOD", "ART", "OTHER"])
          .optional(),
        priceLte: z.number().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        orderBy: z
          .enum(["date_asc", "date_desc", "price_asc", "price_desc"])
          .optional()
          .default("date_asc"),
      })
    )
    .query(async ({ input }) => {
      const where: {
        city?: string;
        category?:
          | "MUSIC"
          | "COMEDY"
          | "SPORTS"
          | "TECH"
          | "FOOD"
          | "ART"
          | "OTHER";
        price?: { lte: number };
        date?: { gte?: Date; lte?: Date };
        status: "PUBLISHED";
      } = {
        status: "PUBLISHED",
      };

      if (input.city) {
        where.city = input.city;
      }

      if (input.category) {
        where.category = input.category;
      }

      if (input.priceLte) {
        where.price = { lte: input.priceLte };
      }

      if (input.dateFrom || input.dateTo) {
        where.date = {};
        if (input.dateFrom) {
          where.date.gte = input.dateFrom;
        }
        if (input.dateTo) {
          where.date.lte = input.dateTo;
        }
      }

      let orderBy: { date?: "asc" | "desc"; price?: "asc" | "desc" } = {};

      switch (input.orderBy) {
        case "date_asc":
          orderBy = { date: "asc" };
          break;
        case "date_desc":
          orderBy = { date: "desc" };
          break;
        case "price_asc":
          orderBy = { price: "asc" };
          break;
        case "price_desc":
          orderBy = { price: "desc" };
          break;
        default:
          orderBy = { date: "asc" };
      }

      const events = await prisma.event.findMany({
        where,
        orderBy,
        include: {
          organizer: {
            select: {
              businessName: true,
            },
          },
        },
      });

      return events;
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const event = await prisma.event.findUnique({
        where: { slug: input.slug },
        include: {
          organizer: {
            select: {
              businessName: true,
              description: true,
              verified: true,
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      return event;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const event = await prisma.event.findUnique({
        where: { id: input.id },
        include: {
          organizer: {
            select: {
              businessName: true,
              description: true,
              verified: true,
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      return event;
    }),
});
