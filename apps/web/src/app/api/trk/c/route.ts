import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@indietix/db";

/**
 * Click tracking redirect endpoint
 * GET /api/trk/c?rid=<recipientId>&url=<targetUrl>
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const recipientId = searchParams.get("rid");
  const targetUrl = searchParams.get("url");

  if (recipientId) {
    try {
      await prisma.campaignRecipient.updateMany({
        where: {
          id: recipientId,
          status: { in: ["SENT", "OPENED", "PENDING"] },
        },
        data: {
          status: "CLICKED",
          clickedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error tracking click:", error);
    }
  }

  if (targetUrl) {
    try {
      const url = new URL(targetUrl);
      return NextResponse.redirect(url.toString());
    } catch (error) {
      console.error("Invalid target URL:", error);
    }
  }

  return NextResponse.redirect(new URL("/", request.url));
}
