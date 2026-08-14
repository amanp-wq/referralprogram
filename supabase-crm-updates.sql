-- ============================================================
-- ElevateMe Referral CRM — Batch Update Migration
-- Run ONCE in the Supabase SQL editor (Project oaabkdlxswvnlhlhirut).
-- Idempotent: safe to re-run. No existing data is modified.
-- Covers: dynamic dropdowns (Admission Advisors), advisor assignment
-- columns, and Import/Export history.
-- ============================================================

-- 1) Generic dropdown options — Admission Advisors + any future dropdowns.
--    Advisors are stored as category = 'admission_advisor'.
CREATE TABLE IF NOT EXISTS "DropdownOption" (
  "id"        text PRIMARY KEY,
  "category"  text    NOT NULL,           -- e.g. 'admission_advisor'
  "label"     text    NOT NULL,           -- shown in the dropdown
  "isActive"  boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX  IF NOT EXISTS "DropdownOption_category_idx"       ON "DropdownOption" ("category");
CREATE UNIQUE INDEX IF NOT EXISTS "DropdownOption_category_label_key" ON "DropdownOption" ("category", "label");

-- 2) Admission Advisor assignment columns (store the DropdownOption id).
ALTER TABLE "Affiliate" ADD COLUMN IF NOT EXISTS "admissionAdvisorId" text;
ALTER TABLE "Referral"  ADD COLUMN IF NOT EXISTS "admissionAdvisorId" text;
CREATE INDEX IF NOT EXISTS "Affiliate_admissionAdvisorId_idx" ON "Affiliate" ("admissionAdvisorId");
CREATE INDEX IF NOT EXISTS "Referral_admissionAdvisorId_idx"  ON "Referral"  ("admissionAdvisorId");

-- 3) Import / Export history log.
CREATE TABLE IF NOT EXISTS "ImportExportLog" (
  "id"        text PRIMARY KEY,
  "type"      text NOT NULL,              -- 'import' | 'export'
  "entity"    text NOT NULL,              -- 'referral' | 'affiliate'
  "userId"    text,                       -- who ran it
  "userName"  text,
  "fileName"  text,
  "mode"      text,                       -- 'update' | 'fresh' (imports)
  "matchBy"   text,                       -- 'email' | 'phone' | 'email_phone'
  "total"     integer NOT NULL DEFAULT 0,
  "created"   integer NOT NULL DEFAULT 0,
  "updated"   integer NOT NULL DEFAULT 0,
  "skipped"   integer NOT NULL DEFAULT 0,
  "failed"    integer NOT NULL DEFAULT 0,
  "details"   jsonb,                       -- { skippedRows: [...], errors: [...] } for re-download
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ImportExportLog_createdAt_idx" ON "ImportExportLog" ("createdAt");
CREATE INDEX IF NOT EXISTS "ImportExportLog_type_idx"      ON "ImportExportLog" ("type");

-- 4) Row-Level Security — deny by default (server uses the service-role key
--    which bypasses RLS; the anon/browser key gets zero rows). Matches the
--    project's existing RLS posture.
ALTER TABLE "DropdownOption"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DropdownOption"  FORCE  ROW LEVEL SECURITY;
ALTER TABLE "ImportExportLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportExportLog" FORCE  ROW LEVEL SECURITY;

-- 5) OPTIONAL seed — starter advisors (you can add/edit/remove later in Settings).
-- INSERT INTO "DropdownOption" ("id","category","label") VALUES
--   (gen_random_uuid()::text, 'admission_advisor', 'Advisor One'),
--   (gen_random_uuid()::text, 'admission_advisor', 'Advisor Two')
-- ON CONFLICT DO NOTHING;

-- ---------- Verify ----------
SELECT 'DropdownOption'  AS table, count(*) FROM "DropdownOption"
UNION ALL
SELECT 'ImportExportLog' AS table, count(*) FROM "ImportExportLog";
-- Confirm the new columns exist:
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name IN ('Affiliate','Referral') AND column_name = 'admissionAdvisorId';
