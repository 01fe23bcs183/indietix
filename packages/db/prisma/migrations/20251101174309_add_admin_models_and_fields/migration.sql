ALTER TABLE "User" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Organizer" ADD COLUMN "verificationDocs" JSONB,
ADD COLUMN "bankAccountMasked" TEXT,
ADD COLUMN "commissionOverride" DOUBLE PRECISION,
ADD COLUMN "meta" JSONB;

ALTER TABLE "Event" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "cancelReason" TEXT;

CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "AdminAction" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "prev" JSONB,
    "next" JSONB,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Event_featured_idx" ON "Event"("featured");

CREATE INDEX "AdminAction_entityType_entityId_idx" ON "AdminAction"("entityType", "entityId");

CREATE INDEX "AdminAction_adminId_idx" ON "AdminAction"("adminId");

CREATE INDEX "AdminAction_ts_idx" ON "AdminAction"("ts");

ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
