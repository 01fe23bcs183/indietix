ALTER TABLE "Booking" ADD COLUMN "attendedAt" TIMESTAMP(3),
ADD COLUMN "qrCode" TEXT,
ADD COLUMN "ticketPayloadHash" TEXT;

CREATE TABLE "ScanLog" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "deviceInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScanLog_bookingId_createdAt_idx" ON "ScanLog"("bookingId", "createdAt");

CREATE INDEX "ScanLog_organizerId_idx" ON "ScanLog"("organizerId");

ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
