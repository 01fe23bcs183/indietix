import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

import { expireWaitlistOffers } from "@indietix/api";

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
    const expiredCount = await expireWaitlistOffers();

    return NextResponse.json({
      success: true,
      expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error expiring waitlist offers:", error);
    return NextResponse.json(
      {
        error: "Failed to expire waitlist offers",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
