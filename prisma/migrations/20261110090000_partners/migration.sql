-- Partner packages (sponsorship, exhibition stands, ads, vendor stalls) and
-- the applications/bookings businesses make for them. Additive only.

ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'PARTNER_PAYMENT';

CREATE TABLE IF NOT EXISTS "partner_packages" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'SPONSORSHIP',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pricingModel" TEXT NOT NULL DEFAULT 'FIXED',
    "priceKobo" INTEGER NOT NULL DEFAULT 0,
    "unitLabel" TEXT,
    "minUnits" INTEGER NOT NULL DEFAULT 1,
    "maxUnits" INTEGER,
    "quantity" INTEGER,
    "quantityTaken" INTEGER NOT NULL DEFAULT 0,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "logoOnTicket" BOOLEAN NOT NULL DEFAULT false,
    "showOnEventPage" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_packages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "partner_packages_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "partner_packages_eventId_idx" ON "partner_packages"("eventId");

CREATE TABLE IF NOT EXISTS "partner_applications" (
    "id" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "notes" TEXT,
    "units" INTEGER NOT NULL DEFAULT 1,
    "amountKobo" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "organizerNote" TEXT,
    "reservedUnits" INTEGER NOT NULL DEFAULT 0,
    "transactionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_applications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "partner_applications_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "partner_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "partner_applications_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "partner_applications_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "partner_applications_eventId_idx" ON "partner_applications"("eventId");
CREATE INDEX IF NOT EXISTS "partner_applications_packageId_idx" ON "partner_applications"("packageId");
