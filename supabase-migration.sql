-- =====================================================================
-- Referral Program — Schema Alignment Migration
-- ---------------------------------------------------------------------
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- to bring your live database in sync with the updated Prisma/TS schema.
--
-- Safe to run multiple times (uses IF NOT EXISTS / idempotent updates).
-- Date: 2026-06-17
-- =====================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- FIX 1: Add visitorPhone column to Referral table
-- Was missing entirely → phone numbers were silently dropped on every
-- referral insert/update from the Admin UI and /api/referral route.
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "visitorPhone" TEXT;


-- ────────────────────────────────────────────────────────────────────
-- FIX 2: Migrate Referral.status values to the new vocabulary
--   clicked   → opened
--   registered → submitted
--   converted → enrolled
--   cancelled → cancelled (unchanged)
-- Then change the column default to 'submitted' so new referrals that
-- don't specify a status land in the correct funnel state.
-- ────────────────────────────────────────────────────────────────────
UPDATE "Referral" SET "status" = 'opened'     WHERE "status" = 'clicked';
UPDATE "Referral" SET "status" = 'submitted'  WHERE "status" = 'registered';
UPDATE "Referral" SET "status" = 'enrolled'   WHERE "status" = 'converted';
-- 'cancelled' stays as-is (already part of the new enum)
-- Any other legacy values map to 'submitted' (safe default for in-progress)
UPDATE "Referral" SET "status" = 'submitted'
  WHERE "status" NOT IN ('opened','submitted','pending','enrolled','not_enrolled','cancelled');

ALTER TABLE "Referral" ALTER COLUMN "status" SET DEFAULT 'submitted';


-- ────────────────────────────────────────────────────────────────────
-- FIX 5: Make Referral.programId nullable
-- track/route.ts can reach a state where no link/program is resolvable
-- for an affiliate. With NOT NULL, this throws a Postgres error at
-- runtime. Making it nullable (with ON DELETE SET NULL) lets the
-- referral survive even if the program is later deleted.
-- ────────────────────────────────────────────────────────────────────

-- Drop the old CASCADE foreign key and recreate as SET NULL.
-- The constraint name comes from Prisma's naming convention.
ALTER TABLE "Referral" DROP CONSTRAINT IF EXISTS "Referral_programId_fkey";
ALTER TABLE "Referral" ALTER COLUMN "programId" DROP NOT NULL;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "Program"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;


-- ────────────────────────────────────────────────────────────────────
-- FIX 3 (Documentation only — no SQL action needed)
-- Commission.status: added 'released' and 'failed' to the TS union.
-- The DB column is TEXT (not an enum), so existing rows are unaffected.
-- No migration needed — this only constrains the TypeScript layer.
-- ────────────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────────────
-- FIX 4 (Code-level only — no SQL action needed)
-- Commission type filter changed from .in('type', ['commission','bonus'])
-- to .in('type', ['referral','bonus']) in referrals/[id]/route.ts.
-- No DB impact — 'commission' was a dead value that never matched anything.
-- ────────────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────────────
-- FIX 6: Replace USING(true) RLS policies with proper deny-by-default
--   The old "Service role full access" policies used USING(true) which
--   evaluates to true for EVERY role, not just service_role. This meant
--   anyone with the anon key could read/write every table.
--   New design: deny all direct browser access except public reads on
--   active programs and a small set of public settings.
-- ────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Drop legacy blanket policies
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
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy cleanup: %', SQLERRM;
END $$;

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

-- Public read on active programs only (landing page)
DROP POLICY IF EXISTS "Public read active programs" ON "Program";
CREATE POLICY "Public read active programs"
  ON "Program" FOR SELECT
  USING ("isActive" = true);

-- Public read on a small whitelist of settings
DROP POLICY IF EXISTS "Public read settings" ON "Setting";
CREATE POLICY "Public read settings"
  ON "Setting" FOR SELECT
  USING (key IN ('platform_name', 'platform_url', 'default_commission_rate', 'min_payout_amount', 'currency'));


-- ────────────────────────────────────────────────────────────────────
-- FIX 7: Remove seed admin/affiliate credentials from live DB
--   These were inserted from the old supabase-schema.sql seed block.
--   Delete them so the known-password accounts stop working.
--   The admin must create fresh credentials via scripts/create-admin.ts
-- ────────────────────────────────────────────────────────────────────
DELETE FROM "Affiliate" WHERE id = 'clx_aff_rec_001';
DELETE FROM "User"      WHERE id IN ('clx_admin_001', 'clx_affiliate_001');


-- ────────────────────────────────────────────────────────────────────
-- FIX 8: Add email verification columns to User table
--   emailVerificationToken  — UUID sent in welcome email link
--   emailVerificationExpiry — 24-hour expiry timestamp
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationExpiry" TIMESTAMP(3);


COMMIT;

-- ────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES (run separately to confirm)
-- ────────────────────────────────────────────────────────────────────
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'Referral' ORDER BY ordinal_position;
--
-- Expected:
--   visitorPhone | text | YES | NULL
--   programId    | text | YES | NULL
--   status       | text | NO  | 'submitted'::text
--
-- SELECT DISTINCT status FROM "Referral";
-- Expected values: opened, submitted, pending, enrolled, not_enrolled, cancelled
--
-- SELECT tablename, policyname, cmd, qual FROM pg_policies ORDER BY tablename;
-- Expected:
--   Program | Public read active programs | SELECT | ("isActive" = true)
--   Setting | Public read settings        | SELECT | (key IN ('platform_name', ...))
--   (no other policies — all other tables deny by default)
--
-- SELECT id, email FROM "User" WHERE id LIKE 'clx_%';
-- Expected: 0 rows (seed users deleted)

