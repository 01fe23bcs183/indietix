ALTER TABLE "Event" ADD COLUMN "bookedSeats" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Booking" DROP COLUMN "quantity",
DROP COLUMN "totalAmount",
ADD COLUMN "ticketNumber" TEXT NOT NULL,
ADD COLUMN "seats" INTEGER NOT NULL,
ADD COLUMN "ticketPrice" INTEGER NOT NULL,
ADD COLUMN "convenienceFee" INTEGER NOT NULL,
ADD COLUMN "platformFee" INTEGER NOT NULL,
ADD COLUMN "finalAmount" INTEGER NOT NULL,
ADD COLUMN "razorpayOrderId" TEXT,
ADD COLUMN "razorpayPaymentId" TEXT,
ADD COLUMN "holdExpiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Booking_ticketNumber_key" ON "Booking"("ticketNumber");

CREATE INDEX "Booking_holdExpiresAt_idx" ON "Booking"("holdExpiresAt");

CREATE INDEX "Booking_ticketNumber_idx" ON "Booking"("ticketNumber");

CREATE UNIQUE INDEX "PaymentEvent_eventId_key" ON "PaymentEvent"("eventId");

CREATE INDEX "PaymentEvent_bookingId_idx" ON "PaymentEvent"("bookingId");

CREATE INDEX "PaymentEvent_eventId_idx" ON "PaymentEvent"("eventId");

ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
