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
