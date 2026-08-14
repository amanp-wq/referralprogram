import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

const ALLOWED_LIMITS = [25, 50, 100, 200]

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = (searchParams.get('search') || '').trim()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limitRaw = parseInt(searchParams.get('limit') || '25')
    const limit = ALLOWED_LIMITS.includes(limitRaw) ? limitRaw : 25

    // Shared filter logic for both the list query and its total count
    const applyFilters = (q: any) => {
      if (status) {
        q = q.eq('status', status)
      } else {
        // Default: exclude pure "opened" (link clicks that never submitted a form)
        q = q.neq('status', 'opened')
      }
      if (search) {
        // Sanitize PostgREST or() special chars, then match reference fields
        const s = search.replace(/[%,()]/g, ' ')
        q = q.or(
          `visitorName.ilike.%${s}%,visitorEmail.ilike.%${s}%,visitorPhone.ilike.%${s}%,referralCode.ilike.%${s}%`
        )
      }
      return q
    }

    const query = applyFilters(
      supabase
        .from('Referral')
        .select(
          '*, Affiliate!Referral_affiliateId_fkey(id, referralCode, userId, User!Affiliate_userId_fkey(name, email)), Program!Referral_programId_fkey(id, name, slug)',
          { count: 'exact' }
        )
    )
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    const { data: referrals, error: dbError, count } = await query
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // Aggregate status counts across the WHOLE dataset (independent of the
    // current page / search) so the KPI tiles show real totals, not just
    // whatever is on the current page.
    const countFor = async (st: string | null) => {
      let q = supabase.from('Referral').select('*', { count: 'exact', head: true })
      if (st) q = q.eq('status', st)
      else q = q.neq('status', 'opened')
      const { count: c } = await q
      return c || 0
    }
    const [all, opened, submitted, pending, enrolled, notEnrolled, cancelled] = await Promise.all([
      countFor(null),
      countFor('opened'),
      countFor('submitted'),
      countFor('pending'),
      countFor('enrolled'),
      countFor('not_enrolled'),
      countFor('cancelled'),
    ])

    return NextResponse.json({
      referrals: referrals || [],
      total: count || 0, // total matching the current status/search filter (for pagination)
      page,
      limit,
      counts: { all, opened, submitted, pending, enrolled, notEnrolled, cancelled },
    })
  } catch (error: any) {
    console.error('Referrals list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
