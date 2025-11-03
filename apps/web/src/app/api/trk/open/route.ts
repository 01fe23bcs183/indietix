import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@indietix/db";

/**
 * Email open tracking pixel endpoint
 * GET /api/trk/open?rid=<recipientId>
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const recipientId = searchParams.get("rid");

  if (recipientId) {
    try {
      await prisma.campaignRecipient.updateMany({
        where: {
          id: recipientId,
          status: { in: ["SENT", "PENDING"] },
        },
        data: {
          status: "OPENED",
          openedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error tracking email open:", error);
    }
  }

  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  return new NextResponse(pixel, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
