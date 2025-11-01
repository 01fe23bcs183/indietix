import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@indietix/db";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) {
      console.error("RAZORPAY_KEY_SECRET not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(body)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

    if (!isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    if (!event || !paymentEntity) {
      return NextResponse.json(
        { error: "Invalid payload structure" },
        { status: 400 }
      );
    }

    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    const booking = await prisma.booking.findFirst({
      where: { razorpayOrderId: orderId },
    });

    if (!booking) {
      console.error(`Booking not found for order ${orderId}`);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const existingEvent = await prisma.paymentEvent.findUnique({
      where: { eventId: event },
    });

    if (existingEvent) {
      console.log(`Webhook event ${event} already processed`);
      return NextResponse.json({ status: "already_processed" });
    }

    await prisma.paymentEvent.create({
      data: {
        provider: "razorpay",
        eventId: event,
        bookingId: booking.id,
        payload: payload,
      },
    });

    if (event === "payment.captured") {
      await prisma.$transaction(async (tx) => {
        const currentBooking = await tx.booking.findUnique({
          where: { id: booking.id },
        });

        if (!currentBooking) {
          throw new Error("Booking not found");
        }

        if (
          currentBooking.status === "CONFIRMED" &&
          currentBooking.paymentStatus === "COMPLETED"
        ) {
          return;
        }

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "CONFIRMED",
            paymentStatus: "COMPLETED",
            razorpayPaymentId: paymentId,
          },
        });

        await tx.event.update({
          where: { id: currentBooking.eventId },
          data: {
            bookedSeats: {
              increment: currentBooking.seats,
            },
          },
        });
      });

      console.log(`Booking ${booking.id} confirmed successfully`);
    } else if (event === "payment.failed") {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: "FAILED",
        },
      });

      console.log(`Booking ${booking.id} marked as failed`);
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
