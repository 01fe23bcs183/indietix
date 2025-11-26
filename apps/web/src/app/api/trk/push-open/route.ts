import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@indietix/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rid = searchParams.get("rid");

    if (!rid) {
      return NextResponse.json(
        { error: "Missing notification ID" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.findUnique({
      where: { id: rid },
      select: {
        id: true,
        campaignId: true,
        userId: true,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    await prisma.notification.update({
      where: { id: rid },
      data: {
        readAt: new Date(),
      },
    });

    if (notification.campaignId && notification.userId) {
      await prisma.campaignRecipient.updateMany({
        where: {
          campaignId: notification.campaignId,
          userId: notification.userId,
        },
        data: {
          status: "OPENED",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking push open:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
