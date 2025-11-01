import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@indietix/db";
import { computePayoutAmount } from "@indietix/utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token || token !== process.env.CRON_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizers = await prisma.organizer.findMany({
      where: { verified: true },
      select: { id: true, businessName: true },
    });

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 7);

    const results = [];

    for (const organizer of organizers) {
      try {
        const existingPayout = await prisma.payout.findFirst({
          where: {
            organizerId: organizer.id,
            periodStart,
            periodEnd,
          },
        });

        if (existingPayout) {
          results.push({
            organizerId: organizer.id,
            status: "skipped",
            reason: "Payout already exists for this period",
          });
          continue;
        }

        const breakdown = await computePayoutAmount(
          {
            organizerId: organizer.id,
            periodStart,
            periodEnd,
          },
          prisma
        );

        if (breakdown.netPayable > 0) {
          const payout = await prisma.payout.create({
            data: {
              organizerId: organizer.id,
              periodStart,
              periodEnd,
              amount: breakdown.netPayable,
              currency: "INR",
              status: "PENDING",
              beneficiaryName: organizer.businessName,
              breakdown: JSON.parse(JSON.stringify(breakdown)),
            },
          });

          results.push({
            organizerId: organizer.id,
            status: "created",
            payoutId: payout.id,
            amount: breakdown.netPayable,
          });
        } else {
          results.push({
            organizerId: organizer.id,
            status: "skipped",
            reason: "No payable amount for this period",
          });
        }
      } catch (error) {
        results.push({
          organizerId: organizer.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      periodStart,
      periodEnd,
      organizersProcessed: organizers.length,
      results,
    });
  } catch (error) {
    console.error("Error generating payouts:", error);
    return NextResponse.json(
      {
        error: "Failed to generate payouts",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
