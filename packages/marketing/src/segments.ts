/**
 * Segment query engine for IndieTix marketing campaigns
 * 
 * Translates JSON DSL queries into Prisma where clauses for user targeting
 * 
 * Example queries:
 * - { city: "Bengaluru" }
 * - { categories: ["COMEDY", "MUSIC"] }
 * - { attended_in_last_days: 180 }
 * - { price_ceiling: 600 }
 */

import { Prisma } from "@indietix/db";

export interface SegmentQuery {
  city?: string;
  categories?: string[];
  attended_in_last_days?: number;
  price_ceiling?: number;
  has_booked?: boolean;
  min_bookings?: number;
}

/**
 * Execute a segment query and return matching user IDs
 */
export async function executeSegmentQuery(
  prisma: any,
  query: SegmentQuery
): Promise<Array<{ id: string; email: string; phone: string | null }>> {
  const where: Prisma.UserWhereInput = {};

  const bookingConditions: Prisma.BookingWhereInput[] = [];

  if (query.city) {
    bookingConditions.push({
      event: {
        city: query.city,
      },
    });
  }

  if (query.categories && query.categories.length > 0) {
    bookingConditions.push({
      event: {
        category: {
          in: query.categories as any[],
        },
      },
    });
  }

  if (query.attended_in_last_days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - query.attended_in_last_days);
    
    bookingConditions.push({
      attendedAt: {
        gte: cutoffDate,
      },
    });
  }

  if (query.price_ceiling) {
    bookingConditions.push({
      event: {
        price: {
          lte: query.price_ceiling * 100, // Convert to paise
        },
      },
    });
  }

  if (query.has_booked !== undefined) {
    if (query.has_booked) {
      where.bookings = {
        some: {
          status: "CONFIRMED",
        },
      };
    } else {
      where.bookings = {
        none: {
          status: "CONFIRMED",
        },
      };
    }
  }

  if (bookingConditions.length > 0) {
    where.bookings = {
      some: {
        AND: bookingConditions,
        status: "CONFIRMED",
      },
    };
  }

  if (query.min_bookings !== undefined && query.min_bookings > 0) {
    const userBookingCounts = await prisma.booking.groupBy({
      by: ["userId"],
      where: {
        status: "CONFIRMED",
      },
      _count: true,
      having: {
        _count: {
          gte: query.min_bookings,
        },
      },
    });

    const userIds = userBookingCounts.map((u) => u.userId);
    
    if (userIds.length === 0) {
      return [];
    }

    where.id = {
      in: userIds,
    };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      phone: true,
    },
  });

  return users;
}

/**
 * Preview segment query results (count only)
 */
export async function previewSegmentQuery(
  prisma: any,
  query: SegmentQuery
): Promise<number> {
  const where: Prisma.UserWhereInput = {};

  const bookingConditions: Prisma.BookingWhereInput[] = [];

  if (query.city) {
    bookingConditions.push({
      event: {
        city: query.city,
      },
    });
  }

  if (query.categories && query.categories.length > 0) {
    bookingConditions.push({
      event: {
        category: {
          in: query.categories as any[],
        },
      },
    });
  }

  if (query.attended_in_last_days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - query.attended_in_last_days);
    
    bookingConditions.push({
      attendedAt: {
        gte: cutoffDate,
      },
    });
  }

  if (query.price_ceiling) {
    bookingConditions.push({
      event: {
        price: {
          lte: query.price_ceiling * 100,
        },
      },
    });
  }

  if (query.has_booked !== undefined) {
    if (query.has_booked) {
      where.bookings = {
        some: {
          status: "CONFIRMED",
        },
      };
    } else {
      where.bookings = {
        none: {
          status: "CONFIRMED",
        },
      };
    }
  }

  if (bookingConditions.length > 0) {
    where.bookings = {
      some: {
        AND: bookingConditions,
        status: "CONFIRMED",
      },
    };
  }

  if (query.min_bookings !== undefined && query.min_bookings > 0) {
    const userBookingCounts = await prisma.booking.groupBy({
      by: ["userId"],
      where: {
        status: "CONFIRMED",
      },
      _count: true,
      having: {
        _count: {
          gte: query.min_bookings,
        },
      },
    });

    const userIds = userBookingCounts.map((u) => u.userId);
    
    if (userIds.length === 0) {
      return 0;
    }

    where.id = {
      in: userIds,
    };
  }

  return await prisma.user.count({ where });
}

/**
 * Validate segment query structure
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
    if (typeof q.attended_in_last_days !== "number" || q.attended_in_last_days < 0) {
      errors.push("attended_in_last_days must be a positive number");
    }
  }

  if (q.price_ceiling !== undefined) {
    if (typeof q.price_ceiling !== "number" || q.price_ceiling < 0) {
      errors.push("price_ceiling must be a positive number");
    }
  }

  if (q.has_booked !== undefined && typeof q.has_booked !== "boolean") {
    errors.push("has_booked must be a boolean");
  }

  if (q.min_bookings !== undefined) {
    if (typeof q.min_bookings !== "number" || q.min_bookings < 0) {
      errors.push("min_bookings must be a positive number");
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
