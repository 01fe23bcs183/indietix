import { NextRequest, NextResponse } from "next/server";
import { recomputeLeaderboard, getCurrentMonth } from "@indietix/loyalty";

export const runtime = "nodejs";

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
    const month = getCurrentMonth();
    const result = await recomputeLeaderboard(month);

    return NextResponse.json({
      success: true,
      month,
      citiesProcessed: result.citiesProcessed,
      entriesCreated: result.entriesCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error recomputing leaderboard:", error);
    return NextResponse.json(
      {
        error: "Failed to recompute leaderboard",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
