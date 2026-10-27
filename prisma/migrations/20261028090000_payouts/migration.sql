-- Organizer payout accounts (Paystack subaccounts) + when Pro was activated.
-- Additive and nullable: safe to run on a live database.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "payoutBankCode" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "payoutBankName" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "payoutAccountNumber" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "payoutAccountName" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "paystackSubaccountCode" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "payoutUpdatedAt" TIMESTAMP(3);
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "planActivatedAt" TIMESTAMP(3);
