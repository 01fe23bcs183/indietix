CREATE TYPE "PromoCodeType" AS ENUM ('PERCENT', 'FLAT');

CREATE TYPE "CampaignChannel" AS ENUM ('EMAIL', 'SMS');

CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');

CREATE TYPE "CampaignRecipientStatus" AS ENUM ('PENDING', 'SENT', 'OPENED', 'CLICKED', 'BOUNCED');

ALTER TABLE "Booking" ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "promoCodeId" TEXT;

CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PromoCodeType" NOT NULL,
    "value" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "perUserLimit" INTEGER,
    "minPrice" INTEGER,
    "organizerId" TEXT,
    "applicableEvents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicableCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicableCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventPricePhase" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxSeats" INTEGER,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPricePhase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "templateKey" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" "CampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

CREATE INDEX "PromoCode_code_idx" ON "PromoCode"("code");

CREATE INDEX "PromoCode_organizerId_idx" ON "PromoCode"("organizerId");

CREATE INDEX "PromoCode_active_idx" ON "PromoCode"("active");

CREATE INDEX "PromoCode_startAt_endAt_idx" ON "PromoCode"("startAt", "endAt");

CREATE INDEX "EventPricePhase_eventId_idx" ON "EventPricePhase"("eventId");

CREATE INDEX "EventPricePhase_startsAt_endsAt_idx" ON "EventPricePhase"("startsAt", "endsAt");

CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

CREATE INDEX "Campaign_createdBy_idx" ON "Campaign"("createdBy");

CREATE INDEX "Campaign_scheduledAt_idx" ON "Campaign"("scheduledAt");

CREATE INDEX "Segment_name_idx" ON "Segment"("name");

CREATE INDEX "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId");

CREATE INDEX "CampaignRecipient_userId_idx" ON "CampaignRecipient"("userId");

CREATE INDEX "CampaignRecipient_status_idx" ON "CampaignRecipient"("status");

CREATE INDEX "CampaignRecipient_email_idx" ON "CampaignRecipient"("email");

CREATE INDEX "Booking_promoCodeId_idx" ON "Booking"("promoCodeId");

CREATE INDEX "Booking_campaignId_idx" ON "Booking"("campaignId");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventPricePhase" ADD CONSTRAINT "EventPricePhase_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
