import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@indietix/db";
import { auth } from "@/lib/auth";
import { decodeTicketFromQR } from "@indietix/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        event: {
          select: {
            title: true,
            date: true,
            venue: true,
            city: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (
      booking.userId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Booking is not confirmed" },
        { status: 400 }
      );
    }

    if (!booking.qrCode) {
      return NextResponse.json(
        { error: "Ticket not generated yet" },
        { status: 400 }
      );
    }

    const ticket = decodeTicketFromQR(booking.qrCode);

    if (!ticket) {
      return NextResponse.json(
        { error: "Invalid ticket data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      payload: ticket.payload,
      signature: ticket.signature,
      event: booking.event,
      ticketNumber: booking.ticketNumber,
      seats: booking.seats,
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
