import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@indietix/db";
import { auth } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "test") {
    return NextResponse.json({ success: true, tracked: false });
  }

  try {
    const body = await request.json();
    const { eventId } = body;

    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id || null;

    await prisma.eventView.create({
      data: {
        eventId,
        userId,
      },
    });

    return NextResponse.json({ success: true, tracked: true });
  } catch (error) {
    console.error("Error tracking event view:", error);
    return NextResponse.json(
      { error: "Failed to track event view" },
      { status: 500 }
    );
  }
}
