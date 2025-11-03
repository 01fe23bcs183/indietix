CREATE TYPE "FraudAction" AS ENUM ('FLAG', 'REJECT', 'REVIEW');

CREATE TYPE "FraudListType" AS ENUM ('EMAIL', 'PHONE', 'IP');

CREATE TYPE "FraudCaseStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED');

ALTER TABLE "Booking" ADD COLUMN "riskScore" INTEGER,
ADD COLUMN "riskTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "BookingAttempt" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "userId" TEXT,
    "eventId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "city" TEXT,
    "emailDomain" TEXT,
    "phonePrefix" TEXT,
    "qty" INTEGER NOT NULL,
    "paymentProvider" TEXT,
    "result" TEXT,
    "paidAt" TIMESTAMP(3),
    "razorpayOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FraudRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "definition" JSONB NOT NULL,
    "action" "FraudAction" NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FraudRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FraudList" (
    "id" TEXT NOT NULL,
    "type" "FraudListType" NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FraudCase" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "FraudCaseStatus" NOT NULL DEFAULT 'OPEN',
    "riskScore" INTEGER NOT NULL,
    "riskTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "FraudCase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Booking_riskScore_idx" ON "Booking"("riskScore");

CREATE INDEX "BookingAttempt_bookingId_idx" ON "BookingAttempt"("bookingId");

CREATE INDEX "BookingAttempt_userId_idx" ON "BookingAttempt"("userId");

CREATE INDEX "BookingAttempt_eventId_idx" ON "BookingAttempt"("eventId");

CREATE INDEX "BookingAttempt_ip_idx" ON "BookingAttempt"("ip");

CREATE INDEX "BookingAttempt_emailDomain_idx" ON "BookingAttempt"("emailDomain");

CREATE INDEX "BookingAttempt_phonePrefix_idx" ON "BookingAttempt"("phonePrefix");

CREATE INDEX "BookingAttempt_createdAt_idx" ON "BookingAttempt"("createdAt");

CREATE INDEX "FraudRule_enabled_priority_idx" ON "FraudRule"("enabled", "priority");

CREATE UNIQUE INDEX "FraudList_type_value_key" ON "FraudList"("type", "value");

CREATE INDEX "FraudList_type_value_idx" ON "FraudList"("type", "value");

CREATE INDEX "FraudCase_bookingId_idx" ON "FraudCase"("bookingId");

CREATE INDEX "FraudCase_status_idx" ON "FraudCase"("status");

CREATE INDEX "FraudCase_createdAt_idx" ON "FraudCase"("createdAt");

ALTER TABLE "BookingAttempt" ADD CONSTRAINT "BookingAttempt_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FraudCase" ADD CONSTRAINT "FraudCase_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
