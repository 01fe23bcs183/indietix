import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@indietix/db";

/**
 * Campaign tracking: Click redirect
 * 
 * Usage: <a href="/api/trk/c?rid={recipientId}&url={encodedUrl}">Click here</a>
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const recipientId = searchParams.get("rid");
  const targetUrl = searchParams.get("url");

  if (!recipientId || !targetUrl) {
    return new NextResponse("Missing recipient ID or target URL", { status: 400 });
  }

  try {
    let redirectUrl: URL;
    try {
      redirectUrl = new URL(targetUrl);
    } catch {
      return new NextResponse("Invalid target URL", { status: 400 });
    }

    const recipient = await prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
    });

    if (recipient) {
      const updates: {
        status?: "CLICKED";
        clickedAt?: Date;
        openedAt?: Date;
      } = {};

      if (!recipient.clickedAt) {
        updates.clickedAt = new Date();
        updates.status = "CLICKED";
      }

      if (!recipient.openedAt) {
        updates.openedAt = new Date();
      }

      if (Object.keys(updates).length > 0) {
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: updates,
        });
      }
    }

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Error tracking click:", error);
    
    try {
      const redirectUrl = new URL(targetUrl);
      return NextResponse.redirect(redirectUrl.toString());
    } catch {
      return new NextResponse("Error processing redirect", { status: 500 });
    }
  }
}
