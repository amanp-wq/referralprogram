# Task: Create Full Backend for ElevateMe Referral Platform

## Summary
Created all backend infrastructure for the referral program platform at `/home/z/my-project/referralprogram`.

## Files Created/Modified

### Core Infrastructure
1. **src/lib/db.ts** - Prisma client singleton, exports `prisma` (not `db`)
2. **src/lib/auth.ts** - NextAuth configuration with CredentialsProvider, JWT strategy, custom callbacks for role/affiliateId/affiliateSlug
3. **src/types/next-auth.d.ts** - TypeScript type augmentation for NextAuth (User, Session, JWT interfaces)
4. **src/lib/session.ts** - Session helper functions (getSessionUser, requireAdmin, requireAffiliate)
5. **src/lib/types.ts** - Shared TypeScript types matching Prisma enums and API response shapes

### Auth Routes
6. **src/app/api/auth/[...nextauth]/route.ts** - NextAuth handler
7. **src/app/api/auth/register/route.ts** - POST: Affiliate registration (auto-generates slug from email, hashes password, creates User + AffiliateProfile)

### Middleware
8. **src/middleware.ts** - Route protection (admin/affiliate role-based access, public routes for auth/public/ref)

### Admin API Routes (all use getServerSession + authOptions)
9. **src/app/api/admin/dashboard/route.ts** - GET: Admin KPIs, top affiliates, program stats, recent activities
10. **src/app/api/admin/programs/route.ts** - GET (list), POST (create), PATCH (update)
11. **src/app/api/admin/affiliates/route.ts** - GET (list with filters), PATCH (approve/reject/deactivate)
12. **src/app/api/admin/commissions/route.ts** - GET (list with filters), PATCH (update status: APPROVED/PAID/REFUNDED)
13. **src/app/api/admin/payouts/route.ts** - GET (list), PATCH (approve/reject/complete with invoice generation)
14. **src/app/api/admin/links/route.ts** - GET (list), POST (create with nanoid-like code generation)
15. **src/app/api/admin/referrals/route.ts** - GET (list with affiliate/program info)
16. **src/app/api/admin/settings/route.ts** - GET, PUT (JSON string in Settings.value field)
17. **src/app/api/admin/reports/route.ts** - GET (revenue/affiliate/payout reports with date filters)

### Affiliate API Routes (all use getServerSession + authOptions)
18. **src/app/api/affiliate/dashboard/route.ts** - GET: KPIs, balances, recent conversions, top programs, referral link
19. **src/app/api/affiliate/links/route.ts** - GET (list), POST (create with unique code)
20. **src/app/api/affiliate/conversions/route.ts** - GET (list through referrals)
21. **src/app/api/affiliate/referrals/route.ts** - GET (list with program/conversion info)
22. **src/app/api/affiliate/earnings/route.ts** - GET (earnings history, balances)
23. **src/app/api/affiliate/payouts/route.ts** - GET (list), POST (request payout with balance check)
24. **src/app/api/affiliate/invoices/route.ts** - GET (list with summary)
25. **src/app/api/affiliate/settings/route.ts** - GET (profile/payout method), PUT (update settings)

### Public Routes
26. **src/app/api/public/track/route.ts** - GET: Track referral click, increment clicks, create referral record
27. **src/app/api/public/convert/route.ts** - POST: Record conversion, create commission, update balances

### Seed Route
28. **src/app/api/seed/route.ts** - POST: Create demo data (admin, 5 affiliates, 3 programs, links, referrals, conversions, commissions, payouts, invoices, settings, activity logs)

### API Root
29. **src/app/api/route.ts** - GET: API documentation endpoint

### Pages
30. **src/app/login/page.tsx** - Beautiful login page with admin/affiliate role selector, demo quick-fill buttons
31. **src/app/register/page.tsx** - Registration page with confirm password, auto sign-in after registration
32. **src/app/ref/[code]/page.tsx** - Referral redirect page (tracks click, sets cookie, redirects)

### Prisma Schema
- Modified from PostgreSQL to SQLite for sandbox compatibility
- Removed `@db.Decimal` annotations (not supported in SQLite)
- Removed `directUrl` from datasource
- Added `@unique` to `conversionId` on Commission model
- Removed `conversions Conversion[]` from Program model (no direct relation)

### Database
- Seeded with demo data: 6 users, 5 affiliate profiles, 3 programs, 3 tracking links, 6 referrals, 5 conversions, 5 commissions, 2 payouts, 2 invoices, 1 settings record, 5 activity logs, 9 program enrollments

## Key Design Decisions
- All API routes use `prisma` (not `db`) from `@/lib/db`
- All protected routes use `getServerSession(authOptions)` instead of `requireAdmin`/`requireAffiliate`
- Settings stored as JSON string in `value` field (not `data` JSON field)
- Commission statuses: PENDING → APPROVED → PAID or REFUNDED
- Payout statuses: PENDING → APPROVED → PROCESSING → COMPLETED (or REJECTED/FAILED)
- Payout completion auto-generates Invoice and marks commissions as PAID
- Payout rejection returns funds to affiliate's available balance
- Affiliate slug auto-generated from email (e.g., "sarah.j@email.com" → "sarah-j")

## Demo Credentials
- Admin: admin@elevateme.pro / admin123
- Affiliate: sarah.j@email.com / affiliate123
