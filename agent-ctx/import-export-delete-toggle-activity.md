# Task: Add Import/Export, Delete, Active/Inactive Toggle, Activity Tracker

## Summary

All 4 features have been implemented successfully. Build compiles with no errors.

## Files Created

### API Routes
1. **`/src/app/api/admin/affiliates/import/route.ts`** - POST endpoint for importing affiliates from CSV
   - Accepts `{ affiliates: [{ name, email, phone, referralCode, commissionRate, tier }] }`
   - Auto-generates referral codes if not provided
   - Hashes default password "ChangeMe123!"
   - Returns `{ created: N, failed: M, errors: [...] }`
   - Logs activity: `Admin {name} imported {N} ambassadors`

2. **`/src/app/api/admin/affiliates/[id]/route.ts`** - DELETE endpoint for deleting affiliate + user
   - Cascading delete: removes Affiliate, then User
   - Logs activity: `Admin {name} deleted ambassador {name}`

3. **`/src/app/api/admin/referrals/import/route.ts`** - POST endpoint for importing referrals from CSV
   - Accepts `{ referrals: [{ ambassadorEmail, visitorName, visitorEmail, visitorPhone, source, status }] }`
   - Looks up affiliate by ambassadorEmail
   - Gets first active program for programId
   - Returns `{ created: N, failed: M, errors: [...] }`
   - Logs activity: `Admin {name} imported {N} referrals`

## Files Modified

### API Routes
4. **`/src/app/api/admin/affiliates/route.ts`** - Added PATCH handler for status toggle
   - PATCH accepts `{ id, status: 'active'|'inactive'|'pending'|'suspended' }`
   - Updates both Affiliate and User status
   - Logs activity: `Admin {name} changed ambassador {name} status to {status}`

5. **`/src/app/api/admin/referrals/[id]/route.ts`** - Added DELETE + PATCH handlers with activity logging
   - PATCH accepts `{ status: 'submitted'|'pending'|'enrolled'|'not_enrolled' }`
   - DELETE removes referral
   - Both log activities with admin name

### Frontend Components
6. **`/src/components/referralx/admin/AdminAffiliates.tsx`** - Major enhancements:
   - Import button + modal with CSV upload, template download, progress/results display
   - Status badge is now clickable (toggles active/inactive)
   - Delete (trash icon) button per row with confirmation dialog
   - Added CSV parsing utility function

7. **`/src/components/referralx/admin/AdminReferrals.tsx`** - Major enhancements:
   - Import button + modal with CSV upload, template download, progress/results display
   - Status badge is now a dropdown (submitted/pending/enrolled/not_enrolled)
   - Delete (trash icon) button per row with confirmation dialog
   - Added CSV parsing utility function

## Activity Logging
All API routes now log to the Activity table with:
- Admin name included in details
- Proper action types: `status_changed`, `deleted`, `imported`
- Entity types: `affiliate`, `referral`
- Entity ID where applicable
