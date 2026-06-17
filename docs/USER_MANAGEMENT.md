# User Management — How Users Get Added & Roles Assigned

This document explains the complete user lifecycle: how each type of user
enters the database, how their role (`admin` vs `affiliate`) is assigned,
and how access is managed.

## The Two User Types

| Type | Role | Where they live in DB | What they can do |
|------|------|----------------------|------------------|
| **Admin** | `role: "admin"` | `User` table only (no Affiliate row) | Full access — manage ambassadors, commissions, payouts, programs, settings |
| **Ambassador** (Affiliate) | `role: "affiliate"` | `User` table + `Affiliate` table (linked by `userId`) | Self-service — view own dashboard, links, referrals, earnings, request payouts |

Every user starts in the `User` table. The `role` column is what determines
which dashboard they see at `/app`. Ambassadors also get a row in the
`Affiliate` table (which holds their referral code, tier, earnings, bank
details, etc.).

---

## How Each User Type Is Created

### 1. Admin Users — Created Manually (Never via Signup Form)

Admins are **never** created through the public website. There is no admin
signup form by design — that would be a security hole. Instead, admins are
created in one of two ways:

#### Option A: CLI Script (Recommended)

From your local machine or Vercel terminal:

```bash
bun run scripts/create-admin.ts admin@yourdomain.com "YourStrongPassword123!"
```

This script:
- Connects to Supabase using the service role key (bypasses RLS)
- Hashes the password with bcrypt (12 rounds)
- Inserts a row in `User` with `role: "admin"`, `emailVerified: true`
- Returns the new user ID

You can run this as many times as you need — each call creates a separate
admin account. Use distinct emails for each admin (email is unique).

#### Option B: Direct SQL (Emergency Only)

If the script isn't available (e.g., you're locked out), run this in
Supabase SQL Editor:

```sql
-- Step 1: Generate the bcrypt hash locally first:
--   bun -e 'import bcrypt from "bcryptjs"; console.log(await bcrypt.hash("YourPassword123!", 12))'
-- Step 2: Insert with the hash:
INSERT INTO "User" (id, email, name, passwordHash, role, status, emailVerified, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@yourdomain.com',
  'Administrator',
  '$2b$12$...your-bcrypt-hash-here...',
  'admin',
  'active',
  true,
  NOW(),
  NOW()
);
```

⚠️ **Never** insert admins via the seed file in `supabase-schema.sql` — that
file is in the public repo and would expose the credentials.

### 2. Ambassador Users — Self-Registration via `/`

Anyone can become an ambassador by visiting the root URL (`/`), which is the
signup form. The flow:

1. **Visitor fills the form** at `/` (name, email, phone, password)
2. **Frontend POSTs to** `/api/auth/register` with the form data
3. **API validates** input with Zod (email format, password ≥ 8 chars, etc.)
4. **API checks** the email isn't already registered (returns 409 if it is)
5. **API hashes** the password with bcrypt (12 rounds)
6. **API generates** an email verification token (UUID, 24-hour expiry)
7. **API inserts** a row in `User`:
   ```sql
   INSERT INTO "User" (
     id, email, name, passwordHash,
     role,                    -- 'affiliate'
     status,                  -- 'active' (can log in immediately)
     emailVerified,           -- false (until they click the email link)
     emailVerificationToken,  -- UUID
     emailVerificationExpiry, -- NOW() + 24h
     ...
   )
   ```
8. **API inserts** a row in `Affiliate`:
   ```sql
   INSERT INTO "Affiliate" (
     id, userId,
     referralCode,           -- auto-generated from name (e.g. "john-smith-a1b2")
     tier,                   -- 'standard'
     commissionRate,         -- 10 (default)
     status,                 -- 'pending' (admin must approve before payouts)
     ...
   )
   ```
9. **API creates** a default `Link` row so the ambassador has a tracking URL
   ready to share immediately
10. **API creates** a session token and returns it → frontend auto-logs-in
11. **API sends** a welcome email with a "Verify Email" button (24h expiry)
12. **API logs** an `affiliate_registered` activity entry

The new ambassador can immediately log in and see their dashboard at `/app`,
but their `Affiliate.status` is `'pending'` — admins see this in the
Ambassadors page and must manually flip to `'active'` before payouts unlock.

### 3. Ambassadors — Bulk Import via CSV (Admin Tool)

Admins can import many ambassadors at once via the Admin UI:

1. Admin logs in, goes to **Ambassadors** page
2. Clicks **Import** → uploads a CSV with columns:
   `name, email, phone, referralCode, commissionRate, tier`
3. Frontend POSTs to `/api/admin/affiliates/import`
4. For each row, the API:
   - Generates a random password (`ChangeMe123!`) — ambassadors must reset
   - Hashes it with bcrypt
   - Inserts `User` (role=affiliate, emailVerified=false)
   - Inserts `Affiliate` with the provided `referralCode` (or auto-generated)
   - Sends each new ambassador a welcome email
5. Returns `{ created: N, failed: M, errors: [...] }`

---

## How Access Is Managed

### Authentication (Who Are You?)

The app uses **cookie-based session auth** (custom implementation, not
NextAuth despite the env var name):

1. On login (`/api/auth/login`), the API:
   - Looks up the user by email in `User`
   - Verifies the bcrypt hash
   - Inserts a row in `Session` with a UUID token + 24h expiry
   - Sets the token in an `HttpOnly` cookie (`elevateme_session`)
   - Returns the token to the frontend (frontend stores in `localStorage`
     for SPA use, but the cookie is the canonical auth method)

2. On every API request, the `requireAuth()` helper in `src/lib/auth.ts`:
   - Reads the token from `Authorization: Bearer <token>` header OR the cookie
   - Looks up the session in `Session`, checks expiry
   - Returns the `User` row, or `{ user: null, error: 'Not authenticated' }`

3. On logout (`/api/auth/logout`), the API deletes the `Session` row and
   clears the cookie.

### Authorization (What Can You Do?)

Authorization is enforced in two layers:

#### Layer 1: Route Guards (Frontend)

- `/` (root) — Public. Anyone can visit. This is the signup form.
- `/login` — Public. Anyone can visit.
- `/app` — **Protected**. The `useEffect` in `src/app/app/page.tsx` checks
  `useAuth().user` — if null, redirects to `/login`. If logged in, renders
  either the admin dashboard (if `role === "admin"`) or the affiliate
  dashboard (if `role === "affiliate"`).
- `/enroll` — Public. The referral enrollment form for referred visitors.
- `/ref/[code]` — Public. Redirects to `/api/track?code=...` which logs the
  click and redirects to `/enroll`.

#### Layer 2: API Endpoint Guards (Backend — the real security)

Every API route uses one of three guards from `src/lib/auth.ts`:

```typescript
import { requireAuth, requireAdmin, requireAffiliate } from '@/lib/auth'

// Public endpoint (e.g., /api/track, /api/referral, /api/auth/register)
// — no guard, anyone can call

// Any logged-in user (e.g., /api/auth/me)
const { user, error } = await requireAuth(request)
if (!user) return 401

// Admin only (e.g., /api/admin/* routes)
const { user, error } = await requireAdmin(request)
if (!user) return 401

// Affiliate only (e.g., /api/affiliate/* routes)
const { user, affiliate, error } = await requireAffiliate(request)
if (!user) return 401
```

#### Layer 3: Row Level Security (Database — defense in depth)

Even if an attacker somehow gets the anon key and tries to query Supabase
directly, the RLS policies block them. The only tables that allow public
reads are:
- `Program` — but only rows where `isActive = true`
- `Setting` — but only keys in the whitelist (`platform_name`, `currency`, etc.)

All other tables (`User`, `Session`, `Affiliate`, `Commission`, `Payout`,
`Referral`, `Link`, `Activity`, `Invoice`) have **no public policies** —
the anon role gets zero rows. All access must go through the API routes,
which use the service role key (bypasses RLS but is never exposed to the
browser).

---

## Workflow Summary

| Scenario | Path |
|----------|------|
| **First admin setup** | `bun run scripts/create-admin.ts admin@x.com "pass"` |
| **New ambassador self-signup** | Visit `/` → fill form → verify email → log in at `/login` → see dashboard at `/app` |
| **Admin bulk-adds ambassadors** | Admin logs in → Ambassadors page → Import CSV |
| **Existing user logs in** | Visit `/login` → enter credentials → redirect to `/app` |
| **User forgets password** | (Not yet implemented — see "TODO" below) |
| **Admin deactivates ambassador** | Admin → Ambassadors page → click status badge → set to `inactive` or `suspended` |
| **Admin promotes affiliate to admin** | (Not yet implemented — see "TODO" below) |
| **Admin deletes a user** | Admin → Ambassadors page → trash icon (cascades to Affiliate + User rows) |

---

## TODO — Gaps in Current Implementation

These are known limitations of the current user management system:

1. **No password reset flow** — if a user forgets their password, there's no
   "Forgot password?" link. Would need a `/api/auth/forgot-password` endpoint
   that emails a reset token, and a `/reset-password` page.

2. **No admin UI to create other admins** — currently admins can only be
   created via the CLI script. Could add an Admin → Admins page with a
   "Create Admin" form.

3. **No role promotion** — there's no way to promote an existing affiliate
   to admin (or demote an admin to affiliate) via the UI. Would need a
   PATCH endpoint that updates `User.role`.

4. **Email verification not enforced** — the `emailVerified` flag is set
   but currently nothing blocks unverified users from logging in or
   requesting payouts. Should add a check in the payout request endpoint.

5. **No 2FA** — admin accounts have no two-factor authentication. Recommended
   for any production deployment handling real money.

6. **No audit log for admin actions** — the `Activity` table logs affiliate
   actions but not all admin actions (e.g., changing another admin's role).
   Should add explicit admin activity logging.
