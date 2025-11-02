import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@indietix/db";

/**
 * Campaign tracking: Open pixel
 * 
 * Usage: <img src="/api/trk/open?rid={recipientId}" width="1" height="1" />
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const recipientId = searchParams.get("rid");

  if (!recipientId) {
    return new NextResponse("Missing recipient ID", { status: 400 });
  }

  try {
    const recipient = await prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
    });

    if (recipient && !recipient.openedAt) {
      await prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: {
          status: recipient.status === "PENDING" ? "OPENED" : recipient.status,
          openedAt: new Date(),
        },
      });
    }

    const transparentGif = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );

    return new NextResponse(transparentGif, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("Error tracking email open:", error);
    
    const transparentGif = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );

    return new NextResponse(transparentGif, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}
