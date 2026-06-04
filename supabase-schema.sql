-- =====================================================
-- ElevateMe Referral - Database Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- Users & Auth
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT,
  "role" TEXT NOT NULL DEFAULT 'affiliate',
  "avatarUrl" TEXT,
  "phone" TEXT,
  "company" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Sessions
CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- Affiliates
CREATE TABLE IF NOT EXISTS "Affiliate" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "referralCode" TEXT NOT NULL,
  "tier" TEXT NOT NULL DEFAULT 'standard',
  "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalReferrals" INTEGER NOT NULL DEFAULT 0,
  "totalConversions" INTEGER NOT NULL DEFAULT 0,
  "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bankName" TEXT,
  "bankAccount" TEXT,
  "bankIfsc" TEXT,
  "upiId" TEXT,
  "payoutMethod" TEXT NOT NULL DEFAULT 'bank',
  "payoutEmail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Affiliate_userId_key" ON "Affiliate"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Affiliate_referralCode_key" ON "Affiliate"("referralCode");
CREATE INDEX IF NOT EXISTS "Affiliate_userId_idx" ON "Affiliate"("userId");
CREATE INDEX IF NOT EXISTS "Affiliate_referralCode_idx" ON "Affiliate"("referralCode");
CREATE INDEX IF NOT EXISTS "Affiliate_status_idx" ON "Affiliate"("status");

-- Programs
CREATE TABLE IF NOT EXISTS "Program" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "commissionType" TEXT NOT NULL DEFAULT 'percentage',
  "commissionValue" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "minPayout" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "cookieDuration" INTEGER NOT NULL DEFAULT 30,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "imageUrl" TEXT,
  "landingPageUrl" TEXT,
  "terms" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Program_slug_key" ON "Program"("slug");
CREATE INDEX IF NOT EXISTS "Program_slug_idx" ON "Program"("slug");
CREATE INDEX IF NOT EXISTS "Program_isActive_idx" ON "Program"("isActive");

-- Links
CREATE TABLE IF NOT EXISTS "Link" (
  "id" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Link_code_key" ON "Link"("code");
CREATE INDEX IF NOT EXISTS "Link_affiliateId_idx" ON "Link"("affiliateId");
CREATE INDEX IF NOT EXISTS "Link_programId_idx" ON "Link"("programId");
CREATE INDEX IF NOT EXISTS "Link_code_idx" ON "Link"("code");

-- Referrals
CREATE TABLE IF NOT EXISTS "Referral" (
  "id" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "linkId" TEXT,
  "referralCode" TEXT NOT NULL,
  "visitorEmail" TEXT,
  "visitorName" TEXT,
  "visitorIp" TEXT,
  "source" TEXT,
  "status" TEXT NOT NULL DEFAULT 'clicked',
  "convertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Referral_affiliateId_idx" ON "Referral"("affiliateId");
CREATE INDEX IF NOT EXISTS "Referral_programId_idx" ON "Referral"("programId");
CREATE INDEX IF NOT EXISTS "Referral_status_idx" ON "Referral"("status");
CREATE INDEX IF NOT EXISTS "Referral_createdAt_idx" ON "Referral"("createdAt");

-- Commissions
CREATE TABLE IF NOT EXISTS "Commission" (
  "id" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "referralId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'referral',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "payoutId" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Commission_affiliateId_idx" ON "Commission"("affiliateId");
CREATE INDEX IF NOT EXISTS "Commission_programId_idx" ON "Commission"("programId");
CREATE INDEX IF NOT EXISTS "Commission_status_idx" ON "Commission"("status");
CREATE INDEX IF NOT EXISTS "Commission_createdAt_idx" ON "Commission"("createdAt");

-- Payouts
CREATE TABLE IF NOT EXISTS "Payout" (
  "id" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'bank',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reference" TEXT,
  "notes" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Payout_affiliateId_idx" ON "Payout"("affiliateId");
CREATE INDEX IF NOT EXISTS "Payout_status_idx" ON "Payout"("status");
CREATE INDEX IF NOT EXISTS "Payout_createdAt_idx" ON "Payout"("createdAt");

-- Invoices
CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT NOT NULL,
  "payoutId" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "invoiceNo" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'generated',
  "pdfUrl" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_payoutId_key" ON "Invoice"("payoutId");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");
CREATE INDEX IF NOT EXISTS "Invoice_affiliateId_idx" ON "Invoice"("affiliateId");
CREATE INDEX IF NOT EXISTS "Invoice_invoiceNo_idx" ON "Invoice"("invoiceNo");

-- Activity Log
CREATE TABLE IF NOT EXISTS "Activity" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT,
  "entityId" TEXT,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Activity_userId_idx" ON "Activity"("userId");
CREATE INDEX IF NOT EXISTS "Activity_createdAt_idx" ON "Activity"("createdAt");

-- Settings
CREATE TABLE IF NOT EXISTS "Setting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"("key");
CREATE INDEX IF NOT EXISTS "Setting_key_idx" ON "Setting"("key");

-- Foreign Keys
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Affiliate" ADD CONSTRAINT "Affiliate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Link" ADD CONSTRAINT "Link_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Link" ADD CONSTRAINT "Link_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Row Level Security
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Affiliate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Program" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Link" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Referral" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by our backend API)
CREATE POLICY "Service role full access" ON "User" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "Session" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "Affiliate" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "Program" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "Link" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "Referral" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "Commission" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "Payout" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "Invoice" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "Activity" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON "Setting" FOR ALL USING (true) WITH CHECK (true);

-- Anon users can read active programs (for landing page)
CREATE POLICY "Public read active programs" ON "Program" FOR SELECT USING ("isActive" = true);

-- =====================================================
-- SEED DATA
-- =====================================================

-- Seed admin user (email: admin@elevateme.pro, password: admin123)
INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "status", "emailVerified", "createdAt", "updatedAt")
VALUES ('clx_admin_001', 'admin@elevateme.pro', 'Admin User', '$2b$10$iz4O5KL.TswOtIfzNkiFtO.ojf0RJqLFUWCCfSGTa9HtWbjw7Fh5K', 'admin', 'active', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Seed affiliate user (email: affiliate@elevateme.pro, password: affiliate123)
INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "status", "emailVerified", "createdAt", "updatedAt")
VALUES ('clx_affiliate_001', 'affiliate@elevateme.pro', 'Demo Affiliate', '$2b$10$2IEfcySIlUWvl7OZ2rpp1OCZ2IxTzaWb0ttLqe6A1JMcQ3AHplGnO', 'affiliate', 'active', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Seed affiliate record
INSERT INTO "Affiliate" ("id", "userId", "referralCode", "tier", "commissionRate", "totalEarnings", "totalReferrals", "totalConversions", "balance", "status", "joinedAt", "updatedAt")
VALUES ('clx_aff_rec_001', 'clx_affiliate_001', 'ELEVATE10', 'pro', 15, 0, 0, 0, 0, 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Seed demo programs
INSERT INTO "Program" ("id", "name", "slug", "description", "commissionType", "commissionValue", "minPayout", "cookieDuration", "isActive", "createdAt", "updatedAt")
VALUES
  ('clx_prog_001', 'ElevateMe Premium Plan', 'elevateme-premium', 'Earn commissions by referring users to ElevateMe Premium', 'percentage', 20, 50, 30, true, NOW(), NOW()),
  ('clx_prog_002', 'Pro Toolkit Bundle', 'pro-toolkit', 'Fixed commission for every Pro Toolkit referral', 'fixed', 15, 50, 30, true, NOW(), NOW()),
  ('clx_prog_003', 'Design Masterclass', 'design-masterclass', 'Percentage commission on Design Masterclass course sales', 'percentage', 15, 25, 60, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Seed default settings
INSERT INTO "Setting" ("id", "key", "value", "updatedAt") VALUES ('set_001', 'platform_name', 'ElevateMe Referral', NOW()) ON CONFLICT DO NOTHING;
INSERT INTO "Setting" ("id", "key", "value", "updatedAt") VALUES ('set_002', 'platform_url', 'https://referral.elevateme.pro', NOW()) ON CONFLICT DO NOTHING;
INSERT INTO "Setting" ("id", "key", "value", "updatedAt") VALUES ('set_003', 'default_commission_rate', '10', NOW()) ON CONFLICT DO NOTHING;
INSERT INTO "Setting" ("id", "key", "value", "updatedAt") VALUES ('set_004', 'min_payout_amount', '50', NOW()) ON CONFLICT DO NOTHING;
INSERT INTO "Setting" ("id", "key", "value", "updatedAt") VALUES ('set_005', 'currency', 'USD', NOW()) ON CONFLICT DO NOTHING;
