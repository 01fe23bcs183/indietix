import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@indietix/db";
import { runBatchCompute, getConfig } from "@indietix/reco";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for batch processing

/**
 * Nightly cron job to compute recommendations for all users
 * Called by GitHub Actions workflow: .github/workflows/cron-reco.yml
 *
 * Authorization: Bearer token from CRON_TOKEN environment variable
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token !== process.env.CRON_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting recommendation batch compute...");
    const startTime = Date.now();

    const config = getConfig();
    const result = await runBatchCompute(prisma, config);

    const durationSec = Math.round((Date.now() - startTime) / 1000);

    console.log(`Recommendation batch complete in ${durationSec}s:`, {
      usersProcessed: result.usersProcessed,
      recosGenerated: result.recosGenerated,
      coldStartUsers: result.coldStartUsers,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      usersProcessed: result.usersProcessed,
      recosGenerated: result.recosGenerated,
      coldStartUsers: result.coldStartUsers,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 10), // Only return first 10 errors
      durationMs: result.durationMs,
      durationSec,
    });
  } catch (error) {
    console.error("Error running recommendation batch:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual trigger with optional configuration
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token !== process.env.CRON_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const config = getConfig(body.config);

    console.log("Starting manual recommendation batch compute...", {
      mfProvider: config.mfProvider,
      maxRecosPerUser: config.maxRecosPerUser,
    });

    const result = await runBatchCompute(prisma, config);

    return NextResponse.json({
      success: true,
      usersProcessed: result.usersProcessed,
      recosGenerated: result.recosGenerated,
      coldStartUsers: result.coldStartUsers,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, 10),
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error("Error running manual recommendation batch:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
