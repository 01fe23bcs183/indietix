-- CreateEnum
CREATE TYPE "FlashSaleStatus" AS ENUM ('PENDING', 'ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF', 'SCANNER');

-- CreateEnum
CREATE TYPE "OrgInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "FlashSale" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "maxSeats" INTEGER NOT NULL,
    "soldSeats" INTEGER NOT NULL DEFAULT 0,
    "status" "FlashSaleStatus" NOT NULL DEFAULT 'PENDING',
    "minFlashPrice" INTEGER,
    "cityRadius" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMember" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgInvite" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "OrgInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgAction" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "prev" JSONB,
    "next" JSONB,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannerPass" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "eventId" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScannerPass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlashSale_eventId_startsAt_idx" ON "FlashSale"("eventId", "startsAt");

-- CreateIndex
CREATE INDEX "FlashSale_status_idx" ON "FlashSale"("status");

-- CreateIndex
CREATE INDEX "FlashSale_endsAt_idx" ON "FlashSale"("endsAt");

-- CreateIndex
CREATE INDEX "OrgMember_organizerId_idx" ON "OrgMember"("organizerId");

-- CreateIndex
CREATE INDEX "OrgMember_userId_idx" ON "OrgMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMember_organizerId_userId_key" ON "OrgMember"("organizerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgInvite_token_key" ON "OrgInvite"("token");

-- CreateIndex
CREATE INDEX "OrgInvite_organizerId_idx" ON "OrgInvite"("organizerId");

-- CreateIndex
CREATE INDEX "OrgInvite_email_idx" ON "OrgInvite"("email");

-- CreateIndex
CREATE INDEX "OrgInvite_token_idx" ON "OrgInvite"("token");

-- CreateIndex
CREATE INDEX "OrgInvite_status_idx" ON "OrgInvite"("status");

-- CreateIndex
CREATE INDEX "OrgAction_organizerId_idx" ON "OrgAction"("organizerId");

-- CreateIndex
CREATE INDEX "OrgAction_actorUserId_idx" ON "OrgAction"("actorUserId");

-- CreateIndex
CREATE INDEX "OrgAction_ts_idx" ON "OrgAction"("ts");

-- CreateIndex
CREATE INDEX "OrgAction_entityType_entityId_idx" ON "OrgAction"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ScannerPass_token_key" ON "ScannerPass"("token");

-- CreateIndex
CREATE INDEX "ScannerPass_organizerId_idx" ON "ScannerPass"("organizerId");

-- CreateIndex
CREATE INDEX "ScannerPass_token_idx" ON "ScannerPass"("token");

-- CreateIndex
CREATE INDEX "ScannerPass_expiresAt_idx" ON "ScannerPass"("expiresAt");

-- AddForeignKey
ALTER TABLE "FlashSale" ADD CONSTRAINT "FlashSale_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgInvite" ADD CONSTRAINT "OrgInvite_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgAction" ADD CONSTRAINT "OrgAction_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerPass" ADD CONSTRAINT "ScannerPass_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
