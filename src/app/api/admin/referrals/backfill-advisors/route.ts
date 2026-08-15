import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

// Bulk-assign: set each existing referral's Admission Advisor from its
// ambassador's advisor. Only processes ambassadors that HAVE an advisor,
// so referrals of un-assigned ambassadors are left untouched.
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { data: affiliates, error: affErr } = await supabase
      .from('Affiliate')
      .select('id, admissionAdvisorId')
      .not('admissionAdvisorId', 'is', null)
    if (affErr) return NextResponse.json({ error: affErr.message }, { status: 500 })

    let affiliatesProcessed = 0
    let referralsUpdated = 0
    for (const aff of affiliates || []) {
      const { data: updated, error: upErr } = await supabase
        .from('Referral')
        .update({ admissionAdvisorId: (aff as any).admissionAdvisorId, updatedAt: new Date().toISOString() })
        .eq('affiliateId', (aff as any).id)
        .select('id')
      if (upErr) continue
      affiliatesProcessed++
      referralsUpdated += (updated || []).length
    }

    return NextResponse.json({ success: true, affiliatesProcessed, referralsUpdated })
  } catch (error: any) {
    console.error('Backfill advisors error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
