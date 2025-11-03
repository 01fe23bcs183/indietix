import { NextRequest, NextResponse } from "next/server";
import { processPendingNotifications } from "@indietix/notify";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token !== process.env.CRON_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processPendingNotifications();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error processing notifications:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
