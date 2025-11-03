import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { prisma } from "@indietix/db";

export const searchRouter = router({
  query: publicProcedure
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
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
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

      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          orderBy,
          take: input.limit,
          skip: input.offset,
          include: {
            organizer: {
              select: {
                businessName: true,
              },
            },
            _count: {
              select: {
                bookings: true,
              },
            },
          },
        }),
        prisma.event.count({ where }),
      ]);

      return {
        events,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),
});
