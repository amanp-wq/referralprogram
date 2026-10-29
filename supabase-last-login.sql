-- Ambassador "Last Login" tracking.
-- Run once in the Supabase SQL Editor (referralprogram project).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- Backfill from sessions that still exist (logged-out/expired sessions are
-- deleted, so older logins can't be recovered — those users show "Never"
-- until they next sign in).
UPDATE "User" u
SET "lastLoginAt" = s.last_login
FROM (SELECT "userId", MAX("createdAt") AS last_login FROM "Session" GROUP BY "userId") s
WHERE s."userId" = u."id" AND u."lastLoginAt" IS NULL;
