import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Segment Query DSL
 *
 * Examples:
 * - { city: "Bengaluru" }
 * - { categories: ["COMEDY", "MUSIC"] }
 * - { attended_in_last_days: 180 }
 * - { price_ceiling: 600 }
 */

export interface SegmentQuery {
  city?: string;
  categories?: string[];
  attended_in_last_days?: number;
  price_ceiling?: number;
}

export interface SegmentExecutorContext {
  now?: Date;
}

/**
 * Converts a segment query DSL to Prisma where clause
 * Returns a where clause that can be used to query users
 */
export function buildSegmentWhereClause(
  query: SegmentQuery,
  context: SegmentExecutorContext = {}
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  const now = context.now || new Date();

  if (query.city) {
    where.bookings = {
      some: {
        event: {
          city: query.city,
        },
      },
    };
  }

  if (query.categories && query.categories.length > 0) {
    where.bookings = {
      some: {
        event: {
          category: {
            in: query.categories as Prisma.EnumCategoryFilter["in"],
          },
        },
      },
    };
  }

  if (query.attended_in_last_days) {
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - query.attended_in_last_days);

    where.bookings = {
      some: {
        status: "CONFIRMED",
        event: {
          date: {
            gte: cutoffDate,
            lte: now,
          },
        },
      },
    };
  }

  if (query.price_ceiling) {
    where.bookings = {
      some: {
        event: {
          price: {
            lte: query.price_ceiling,
          },
        },
      },
    };
  }

  return where;
}

/**
 * Validates a segment query
 */
export function validateSegmentQuery(query: unknown): {
  valid: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  if (typeof query !== "object" || query === null) {
    return { valid: false, errors: ["Query must be an object"] };
  }

  const q = query as Record<string, unknown>;

  if (q.city !== undefined && typeof q.city !== "string") {
    errors.push("city must be a string");
  }

  if (q.categories !== undefined) {
    if (!Array.isArray(q.categories)) {
      errors.push("categories must be an array");
    } else if (!q.categories.every((c) => typeof c === "string")) {
      errors.push("categories must be an array of strings");
    }
  }

  if (q.attended_in_last_days !== undefined) {
    if (typeof q.attended_in_last_days !== "number") {
      errors.push("attended_in_last_days must be a number");
    } else if (q.attended_in_last_days <= 0) {
      errors.push("attended_in_last_days must be positive");
    }
  }

  if (q.price_ceiling !== undefined) {
    if (typeof q.price_ceiling !== "number") {
      errors.push("price_ceiling must be a number");
    } else if (q.price_ceiling <= 0) {
      errors.push("price_ceiling must be positive");
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Estimates the size of a segment
 */
export async function estimateSegmentSize(
  prisma: Pick<PrismaClient, "user">,
  query: SegmentQuery,
  context: SegmentExecutorContext = {}
): Promise<number> {
  const where = buildSegmentWhereClause(query, context);
  return await prisma.user.count({ where });
}
