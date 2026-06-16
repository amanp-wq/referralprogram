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
  "emailVerificationToken" TEXT,
  "emailVerificationExpiry" TIMESTAMP(3),
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
  "programId" TEXT,
  "linkId" TEXT,
  "referralCode" TEXT NOT NULL,
  "visitorEmail" TEXT,
  "visitorName" TEXT,
  "visitorPhone" TEXT,
  "visitorIp" TEXT,
  "source" TEXT,
  "status" TEXT NOT NULL DEFAULT 'submitted',
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
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
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

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================
-- Design:
--   - The Next.js API uses SUPABASE_SERVICE_ROLE_KEY, which bypasses
--     RLS entirely. All browser interactions go through /api/* routes.
--   - The browser Supabase client (NEXT_PUBLIC_SUPABASE_ANON_KEY)
--     therefore needs almost NO direct access.
--   - Default DENY for sensitive tables (User, Session, Commission,
--     Payout, Invoice, Activity, Setting, Affiliate, Link, Referral).
--   - Only "Public read active programs" is allowed for the landing page.
-- =====================================================

-- Drop legacy "Service role full access" policies (they were USING(true)
-- which evaluated to true for EVERY role, not just service_role).
DROP POLICY IF EXISTS "Service role full access" ON "User";
DROP POLICY IF EXISTS "Service role full access" ON "Session";
DROP POLICY IF EXISTS "Service role full access" ON "Affiliate";
DROP POLICY IF EXISTS "Service role full access" ON "Program";
DROP POLICY IF EXISTS "Service role full access" ON "Link";
DROP POLICY IF EXISTS "Service role full access" ON "Referral";
DROP POLICY IF EXISTS "Service role full access" ON "Commission";
DROP POLICY IF EXISTS "Service role full access" ON "Payout";
DROP POLICY IF EXISTS "Service role full access" ON "Invoice";
DROP POLICY IF EXISTS "Service role full access" ON "Activity";
DROP POLICY IF EXISTS "Service role full access" ON "Setting";

-- Force RLS on every table (no bypass via role)
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Session" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Affiliate" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Program" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Link" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Referral" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Commission" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Payout" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Activity" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Setting" FORCE ROW LEVEL SECURITY;

-- Public read on active programs (for the landing page referral directory).
-- This is the ONLY direct browser access allowed.
CREATE POLICY "Public read active programs"
  ON "Program" FOR SELECT
  USING ("isActive" = true);

-- Public read on public settings (platform name, currency, etc.)
CREATE POLICY "Public read settings"
  ON "Setting" FOR SELECT
  USING (key IN ('platform_name', 'platform_url', 'default_commission_rate', 'min_payout_amount', 'currency'));

-- NOTE: All other tables have NO policies. This means the anon/authenticated
-- roles get ZERO rows. All access must go through the API routes which use
-- the service role key (bypasses RLS).
--
-- If you later need browser-side realtime subscriptions (e.g. affiliate
-- watching their own commission updates), add scoped policies like:
--   CREATE POLICY "Affiliate reads own commissions"
--     ON "Commission" FOR SELECT
--     USING (affiliateId IN (
--       SELECT id FROM "Affiliate" WHERE userId = <current_session_user_id>
--     ));
-- But this requires a custom auth function (auth.fn_current_user_id()) that
-- reads the session cookie — out of scope for this pass.

-- =====================================================
-- SEED DATA
-- =====================================================
-- NOTE: Do NOT seed admin or affiliate user accounts here.
-- Create the first admin account via the secure setup script:
--   bun run scripts/create-admin.ts <email> <password>
-- or via the /signup page with the first admin invite code.
-- Seeding credentials in schema SQL is a security anti-pattern.

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
