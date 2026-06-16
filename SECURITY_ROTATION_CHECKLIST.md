# Security Rotation Checklist — Action Required

> The code-level fixes have been applied in branch `fix/qa-security-and-functional`.
> The actions below **cannot** be done from code — they require dashboard access
> that only you have. Do them in order; the project is not safe until all are done.

## Phase 1 — Critical (do in the next 30 minutes)

### 1. Rotate the Supabase Service Role Key
**Why:** Your current `SUPABASE_SERVICE_ROLE_KEY` is in the public GitHub history
and grants full admin access to your database, bypassing all RLS.

1. Go to: https://supabase.com/dashboard/project/oaabkdlxswvnlhlhirut/settings/api
2. Scroll to **"Project API keys"**
3. Click **"Rotate service_role key"**
4. Copy the new key — you'll paste it into Vercel in step 4.

### 2. Rotate the Supabase DB password
**Why:** The plaintext password `elevatemereferrals` is in the public git history.

1. Go to: https://supabase.com/dashboard/project/oaabkdlxswvnlhlhirut/settings/database
2. Click **"Reset database password"**
3. Generate a strong password (use `openssl rand -base64 24`)
4. Copy it — you'll need it for the new `DATABASE_URL` in step 4.
5. Reconstruct your connection strings:
   ```
   DATABASE_URL=postgresql://postgres.oaabkdlxswvnlhlhirut:<NEW_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres.oaabkdlxswvnlhlhirut:<NEW_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
   ```

### 3. Generate a new NEXTAUTH_SECRET
**Why:** The current one is human-readable and committed to the repo.

```bash
openssl rand -base64 32
```

Save the output — you'll paste it into Vercel in step 4.

### 4. Generate a BANK_ENCRYPTION_KEY
**Why:** Bank account numbers and IFSC codes will now be encrypted at rest.
Without this key, encryption silently falls back to plaintext (with warnings).

```bash
openssl rand -base64 32
```

### 5. Generate a CRON_SECRET
**Why:** Used by Vercel Cron to authenticate calls to `/api/cron/cleanup-sessions`.

```bash
openssl rand -base64 32
```

### 6. Set ALL environment variables in Vercel
1. Go to: https://vercel.com/amanp-wq/referralprogram/settings/environment-variables
2. Add/update each of these (for Production, Preview, and Development environments):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://oaabkdlxswvnlhlhirut.supabase.co` (unchanged) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (current value — anon key is safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | (new key from step 1) |
| `DATABASE_URL` | (new connection string from step 2) |
| `DIRECT_URL` | (new direct connection string from step 2) |
| `NEXTAUTH_URL` | `https://referralprogram-kohl.vercel.app` (your actual deployment URL) |
| `NEXTAUTH_SECRET` | (new secret from step 3) |
| `BANK_ENCRYPTION_KEY` | (new key from step 4) |
| `CRON_SECRET` | (new secret from step 5) |
| `ALLOWED_ORIGINS` | `https://referralprogram-kohl.vercel.app` (and any partner domains) |
| `EMAIL_SERVICE` | `log` (or `resend` if you have a Resend API key) |
| `RESEND_API_KEY` | (optional — only if you set EMAIL_SERVICE=resend) |

3. Click **Save** for each.

### 7. Revoke the GitHub Personal Access Token
**Why:** You pasted `ghp_UNZCK...` into chat earlier. It's now in chat logs and must
be considered compromised.

1. Go to: https://github.com/settings/tokens
2. Find the token starting with `ghp_UNZCK`
3. Click **Delete**

### 8. Redeploy on Vercel
1. Go to: https://vercel.com/amanp-wq/referralprogram
2. Click **Redeploy** (or push a new commit to trigger auto-deploy)
3. Verify the deployment succeeds with the new env vars.

---

## Phase 2 — Critical Database (after merging the PR)

### 9. Run the SQL migration in Supabase
1. Go to: https://supabase.com/dashboard/project/oaabkdlxswvnlhlhirut/sql/new
2. Open the file `supabase-migration.sql` from the `fix/qa-security-and-functional` branch
   (or download it from the PR)
3. Paste the entire contents into the SQL editor
4. Click **Run**
5. Verify by running the verification queries at the bottom of the file.

This migration will:
- Add `visitorPhone` column to Referral
- Migrate old status values (`clicked`→`opened`, `registered`→`submitted`, `converted`→`enrolled`)
- Make `programId` nullable on Referral
- Replace `USING(true)` RLS policies with proper deny-by-default
- Delete the seed admin/affiliate users (`admin@elevateme.pro`, `affiliate@elevateme.pro`)
- Add email verification columns to User

### 10. Create your new admin account
After running the migration, the old seed admin is deleted. Create a new one:

```bash
bun install
bun run scripts/create-admin.ts admin@yourdomain.com "YourStrongPassword123!"
```

Use a unique, strong password — at least 12 characters.

### 11. Force-push the rewritten git history
The PR branch contains the `.env` removal from history (via `git filter-repo`).
After merging the PR to `main`, you MUST force-push to overwrite the public history:

```bash
git checkout main
git pull origin main
git push --force origin main
```

⚠️ **Warning:** This rewrites commit hashes. Anyone with a local clone will need to
re-clone. Communicate this to any collaborators.

---

## Phase 3 — Verify Everything Works

### 12. Test the auth flow
- [ ] Visit your deployed URL
- [ ] Click "Sign Up" — fill in a real email you control
- [ ] Check your inbox — you should receive a welcome email with a "Verify Email" button
- [ ] Click the verify link — should redirect to login with `?verified=success`
- [ ] Try logging in with the new admin credentials

### 13. Test rate limiting
```bash
# Should succeed 30 times, then return 429:
for i in {1..35}; do
  curl -sI "https://your-vercel-url/api/track?code=TEST" | head -1
done
```

### 14. Test RLS
```bash
# Try to read the User table directly with the anon key:
curl -s "https://oaabkdlxswvnlhlhirut.supabase.co/rest/v1/User?select=*" \
  -H "apikey: <your-anon-key>" \
  -H "Authorization: Bearer <your-anon-key>"

# Expected: an empty array [] (or a 401/permission error)
# If you see actual user data, the RLS policies are wrong.
```

### 15. Verify bank encryption
- [ ] Log in as an affiliate
- [ ] Go to Settings → enter bank details → Save
- [ ] Check the Supabase table directly — `bankAccount` should now start with `enc:v1:`
- [ ] Refresh the settings page — should display the decrypted value

### 16. Verify cron job
- [ ] Wait until 3:00 AM UTC (or temporarily change the schedule to test sooner)
- [ ] Or manually trigger: `curl -X POST https://your-vercel-url/api/cron/cleanup-sessions -H "Authorization: Bearer $CRON_SECRET"`
- [ ] Should return `{"success":true,"deleted":N,...}`

---

## Summary

| # | Action | Where |
|---|--------|-------|
| 1-6 | Rotate all secrets + set in Vercel | Supabase + Vercel dashboards |
| 7 | Revoke GitHub PAT | https://github.com/settings/tokens |
| 8 | Redeploy | Vercel |
| 9 | Run SQL migration | Supabase SQL Editor |
| 10 | Create new admin | Local terminal with `bun run scripts/create-admin.ts` |
| 11 | Force-push history rewrite | Local git |
| 12-16 | Verify each fix works | Browser + curl |

Once all 16 steps are done, your project is no longer actively exploitable.
