import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@indietix/db";
import { auth } from "@/lib/auth";
import { verifyTicketSignature } from "@indietix/utils";
import type { TicketPayload } from "@indietix/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      session.user.role !== "ORGANIZER" &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizer = await prisma.organizer.findUnique({
      where: { userId: session.user.id },
    });

    if (!organizer && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Organizer profile not found" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { payload, signature, deviceInfo } = body as {
      payload: TicketPayload;
      signature: string;
      deviceInfo?: string;
    };

    if (!payload || !signature) {
      return NextResponse.json(
        { error: "Missing payload or signature" },
        { status: 400 }
      );
    }

    const isValidSignature = verifyTicketSignature(payload, signature);

    if (!isValidSignature) {
      if (organizer) {
        await prisma.scanLog.create({
          data: {
            bookingId: payload.bookingId || "unknown",
            organizerId: organizer.id,
            status: "REJECTED",
            reason: "Invalid signature",
            deviceInfo,
          },
        });
      }

      return NextResponse.json(
        { ok: false, error: "Invalid ticket signature" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: payload.bookingId },
      include: {
        event: {
          select: {
            title: true,
            organizerId: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      if (organizer) {
        await prisma.scanLog.create({
          data: {
            bookingId: payload.bookingId,
            organizerId: organizer.id,
            status: "REJECTED",
            reason: "Booking not found",
            deviceInfo,
          },
        });
      }

      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    if (
      organizer &&
      booking.event.organizerId !== organizer.id &&
      session.user.role !== "ADMIN"
    ) {
      await prisma.scanLog.create({
        data: {
          bookingId: booking.id,
          organizerId: organizer.id,
          status: "REJECTED",
          reason: "Event does not belong to organizer",
          deviceInfo,
        },
      });

      return NextResponse.json(
        { ok: false, error: "Event does not belong to you" },
        { status: 403 }
      );
    }

    if (booking.status !== "CONFIRMED") {
      if (organizer) {
        await prisma.scanLog.create({
          data: {
            bookingId: booking.id,
            organizerId: organizer.id,
            status: "REJECTED",
            reason: `Booking status is ${booking.status}`,
            deviceInfo,
          },
        });
      }

      return NextResponse.json(
        { ok: false, error: `Booking is ${booking.status}` },
        { status: 400 }
      );
    }

    if (booking.attendedAt) {
      if (organizer) {
        await prisma.scanLog.create({
          data: {
            bookingId: booking.id,
            organizerId: organizer.id,
            status: "REJECTED",
            reason: "Already attended",
            deviceInfo,
          },
        });
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Ticket already used",
          attendedAt: booking.attendedAt,
        },
        { status: 400 }
      );
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        attendedAt: new Date(),
      },
    });

    if (organizer) {
      await prisma.scanLog.create({
        data: {
          bookingId: booking.id,
          organizerId: organizer.id,
          status: "OK",
          deviceInfo,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      name: booking.user.name,
      email: booking.user.email,
      seats: booking.seats,
      ticketNumber: booking.ticketNumber,
      eventTitle: booking.event.title,
    });
  } catch (error) {
    console.error("Error scanning ticket:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
