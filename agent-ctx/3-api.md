# Task 3-api: Fix Admin Dashboard API Route

## Summary
Fixed the admin dashboard API route (`/api/admin/dashboard/route.ts`) with the following changes:

### 1. Fixed KPIs - totalReferrals now only counts "submitted" referrals
- **Before**: `totalReferrals = referrals.length` (counted ALL referrals including clicks/opens)
- **After**: `totalReferrals = submittedReferrals.length` where `submittedReferrals` filters out 'clicked' and 'opened' statuses

### 2. Fixed conversion rate calculation
- **Before**: `(conversions / totalReferrals) * 100` where totalReferrals included clicks/opens
- **After**: `(conversions / submittedReferrals.length) * 100` where conversions are enrolled/converted/completed from submitted referrals only

### 3. Fixed 90D chart to show weekly data points
- **Before**: 3 monthly data points ("Mar", "Apr", "May")
- **After**: 12-13 weekly data points with date range labels like "Jun 1-7", "Jun 8-14", "Jun 29-Jul 5"
- Starts from 89 days ago, groups into 7-day weeks, doesn't go past today
- Labels show month abbreviation + day range, handling month boundaries

### 4. Added recentReferralActivities to API response
- Added a new Supabase query filtering Activity table for `action IN ['referral_submitted', 'referral_click', 'status_changed']` AND `entity = 'referral'`
- Returns last 10 such activities with same structure as existing `activities` array
- Added `referralActivitiesRes` to the Promise.all batch for parallel execution
- Response includes new field `recentReferralActivities`

### Additional Fix
- Removed duplicate `submittedReferrals` variable declaration (was declared both in KPIs section and chart section, causing a TypeScript error)

## Files Modified
- `/home/z/my-project/referralprogram/src/app/api/admin/dashboard/route.ts`
