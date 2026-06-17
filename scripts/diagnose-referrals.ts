// ============================================================
// Diagnostic Script — Find Missing Referrals
// ============================================================
// Run this locally to find out WHY referrals aren't showing up
// for a specific affiliate.
//
// Usage:
//   1. Copy .env.example to .env and fill in real Supabase values
//   2. bun run scripts/diagnose-referrals.ts <referralCode>
//
// Example:
//   bun run scripts/diagnose-referrals.ts aman-Inri
// ============================================================

import { createClient } from '@supabase/supabase-js'

async function main() {
  const code = process.argv[2]
  if (!code) {
    console.error('Usage: bun run scripts/diagnose-referrals.ts <referralCode>')
    console.error('Example: bun run scripts/diagnose-referrals.ts aman-Inri')
    process.exit(1)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`\n🔍 Diagnosing referrals for code: "${code}"\n`)

  // Step 1: Find the affiliate (case-sensitive — this is what /api/referral does)
  console.log('1. Looking up Affiliate.referralCode (case-sensitive, exact match):')
  const { data: affExact, error: affExactErr } = await supabase
    .from('Affiliate')
    .select('id, referralCode, status, userId, User!Affiliate_userId_fkey(name, email)')
    .eq('referralCode', code)
    .single()

  if (affExactErr || !affExact) {
    console.log(`   ❌ No Affiliate found with referralCode = "${code}"`)
    console.log('   This is likely the problem. Trying case-insensitive search...')

    const { data: affIlike } = await supabase
      .from('Affiliate')
      .select('id, referralCode, status, userId, User!Affiliate_userId_fkey(name, email)')
      .ilike('referralCode', code)
      .limit(5)

    if (affIlike && affIlike.length > 0) {
      console.log('   Found case-insensitive matches:')
      for (const a of affIlike) {
        console.log(`     • DB code: "${a.referralCode}" (status: ${a.status})`)
      }
      console.log(`\n   ⚠️  CASE MISMATCH! The URL has "${code}" but the DB has "${affIlike[0].referralCode}".`)
      console.log('   The /api/referral lookup is case-sensitive and failed silently.')
      console.log('   Fix: update the affiliate.referralCode in DB to match the URL exactly,')
      console.log('        OR tell the affiliate to share the exact URL from their dashboard.')
    } else {
      console.log('   ❌ No case-insensitive matches either. The code does not exist in DB.')
    }

    // Also try Link table
    console.log('\n2. Looking up Link.code (case-sensitive):')
    const { data: linkRow } = await supabase
      .from('Link')
      .select('id, code, isActive, affiliateId, Affiliate!Link_affiliateId_fkey(referralCode, status)')
      .eq('code', code)
      .limit(5)
    if (linkRow && linkRow.length > 0) {
      console.log(`   ✅ Found Link: code="${linkRow[0].code}", isActive=${linkRow[0].isActive}`)
      console.log(`      Linked affiliate: ${(linkRow[0] as any).Affiliate?.referralCode} (status: ${(linkRow[0] as any).Affiliate?.status})`)
    } else {
      console.log(`   ❌ No Link found with code = "${code}"`)
    }
    process.exit(0)
  }

  console.log(`   ✅ Found: ${(affExact as any).User?.name} (email: ${(affExact as any).User?.email})`)
  console.log(`      Status: ${affExact.status}`)
  console.log(`      Affiliate ID: ${affExact.id}`)

  if (affExact.status === 'pending') {
    console.log('   ⚠️  Affiliate status is "pending".')
    console.log('   If the submissions happened BEFORE the recent fix (commit 2909c3d),')
    console.log('   they would have failed because the old code only allowed status="active".')
  }

  // Step 2: Count all referrals for this affiliate
  console.log('\n2. All Referrals for this affiliate (any status):')
  const { data: allReferrals, count } = await supabase
    .from('Referral')
    .select('id, status, visitorEmail, visitorName, createdAt, referralCode', { count: 'exact' })
    .eq('affiliateId', affExact.id)
    .order('createdAt', { ascending: false })
    .limit(50)

  console.log(`   Total count: ${count ?? 0}`)
  if (allReferrals && allReferrals.length > 0) {
    const byStatus: Record<string, number> = {}
    for (const r of allReferrals) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1
    }
    console.log('   Breakdown by status:')
    for (const [s, n] of Object.entries(byStatus)) {
      console.log(`     • ${s}: ${n}`)
    }
    console.log('\n   Latest 5 referrals:')
    for (const r of allReferrals.slice(0, 5)) {
      console.log(`     • ${r.createdAt} | ${r.status} | ${r.visitorEmail} | code="${r.referralCode}"`)
    }
  } else {
    console.log('   ❌ No referral records exist for this affiliate in the DB.')
    console.log('   This means the submissions never made it to the database.')
  }

  // Step 3: Check if referrals exist with the code but different affiliateId
  console.log('\n3. Any Referrals with this code (any affiliate):')
  const { data: codeReferrals } = await supabase
    .from('Referral')
    .select('id, affiliateId, status, visitorEmail, createdAt')
    .eq('referralCode', code)
    .order('createdAt', { ascending: false })
    .limit(10)
  if (codeReferrals && codeReferrals.length > 0) {
    console.log(`   Found ${codeReferrals.length} referral(s) with code "${code}":`)
    for (const r of codeReferrals) {
      const sameAff = r.affiliateId === affExact.id ? '✅' : '⚠️ DIFFERENT AFFILIATE'
      console.log(`     • ${r.createdAt} | ${r.status} | ${r.visitorEmail} | affId=${r.affiliateId} ${sameAff}`)
    }
  } else {
    console.log('   ❌ No referrals found with this code at all.')
  }

  // Step 4: Check Activity log for click/submission events
  console.log('\n4. Recent Activity entries for this affiliate:')
  const { data: activities } = await supabase
    .from('Activity')
    .select('action, entity, details, createdAt')
    .eq('userId', affExact.userId)
    .order('createdAt', { ascending: false })
    .limit(10)
  if (activities && activities.length > 0) {
    for (const a of activities) {
      console.log(`   • ${a.createdAt} | ${a.action} | ${a.details}`)
    }
  } else {
    console.log('   ❌ No activity entries for this user.')
  }

  console.log('\n📋 Diagnosis complete.\n')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
