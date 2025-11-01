import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@indietix/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronToken = process.env.CRON_TOKEN;

    if (cronToken && authHeader !== `Bearer ${cronToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: "PENDING",
        holdExpiresAt: {
          lt: now,
        },
      },
    });

    console.log(`Found ${expiredBookings.length} expired bookings to clean up`);

    const results = await Promise.all(
      expiredBookings.map(async (booking: (typeof expiredBookings)[0]) => {
        try {
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: "CANCELLED",
              cancelledAt: now,
            },
          });
          return { id: booking.id, success: true };
        } catch (error) {
          console.error(`Failed to cancel booking ${booking.id}:`, error);
          return { id: booking.id, success: false, error };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${successCount} expired bookings`,
      details: {
        total: expiredBookings.length,
        success: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
