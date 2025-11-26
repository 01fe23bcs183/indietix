import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@indietix/db";
import {
  evaluateFlashRules,
  DEFAULT_FLASH_CONFIG,
  type EventMetrics,
} from "@indietix/flash";

export const runtime = "nodejs";

/**
 * Flash Sales Cron Job
 *
 * Runs every 10 minutes to:
 * 1. Evaluate rules for events within the flash window
 * 2. Open/close flash sales based on time windows
 * 3. Mark expired flash sales as ENDED
 *
 * Endpoint: GET /api/cron/flash
 * Authorization: Bearer {CRON_TOKEN}
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_TOKEN;

  if (!expectedToken) {
    return NextResponse.json(
      { error: "CRON_TOKEN not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const results = {
      endedSales: 0,
      activatedSales: 0,
      suggestions: [] as Array<{
        eventId: string;
        eventTitle: string;
        suggestedDiscount: number;
        reason: string;
      }>,
    };

    // 1. End expired flash sales
    const expiredSales = await prisma.flashSale.updateMany({
      where: {
        status: "ACTIVE",
        endsAt: { lte: now },
      },
      data: {
        status: "ENDED",
      },
    });
    results.endedSales = expiredSales.count;

    // 2. Activate pending flash sales that should start
    const pendingSales = await prisma.flashSale.updateMany({
      where: {
        status: "PENDING",
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      data: {
        status: "ACTIVE",
      },
    });
    results.activatedSales = pendingSales.count;

    // 3. Evaluate rules for events within the flash window (next 6 hours)
    const windowEnd = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    const eligibleEvents = await prisma.event.findMany({
      where: {
        date: {
          gte: now,
          lte: windowEnd,
        },
        status: "PUBLISHED",
        // Exclude events that already have active/pending flash sales
        flashSales: {
          none: {
            status: { in: ["ACTIVE", "PENDING"] },
          },
        },
      },
      include: {
        flashSales: {
          where: {
            status: "ENDED",
          },
          orderBy: { endsAt: "desc" },
          take: 1,
        },
        bookings: {
          where: {
            createdAt: {
              gte: new Date(now.getTime() - 6 * 60 * 60 * 1000),
            },
            status: { in: ["PENDING", "CONFIRMED"] },
          },
        },
      },
    });

    // Evaluate flash rules for each eligible event
    for (const event of eligibleEvents) {
      const metrics: EventMetrics = {
        eventId: event.id,
        totalSeats: event.totalSeats,
        bookedSeats: event.bookedSeats,
        eventDate: event.date,
        basePrice: event.price,
        city: event.city,
        venue: event.venue,
        lastFlashSaleEndedAt: event.flashSales[0]?.endsAt,
        recentBookings: event.bookings.length,
      };

      const suggestion = evaluateFlashRules(metrics, now, DEFAULT_FLASH_CONFIG);

      if (suggestion.shouldTrigger) {
        results.suggestions.push({
          eventId: event.id,
          eventTitle: event.title,
          suggestedDiscount: suggestion.suggestedDiscount,
          reason: suggestion.reason,
        });

        // Note: We don't auto-create flash sales here.
        // Organizers should review suggestions and manually trigger flash sales.
        // This could be enhanced to auto-create with organizer opt-in.
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error in flash sales cron:", error);
    return NextResponse.json(
      {
        error: "Failed to process flash sales",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
