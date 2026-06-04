import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('Referral')
      .select('*, Affiliate!Referral_affiliateId_fkey(id, referralCode, userId, User!Affiliate_userId_fkey(name, email)), Program!Referral_programId_fkey(id, name, slug)')
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) query = query.eq('status', status)

    const { data: referrals, error: dbError, count } = await query

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({
      referrals: referrals || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error: any) {
    console.error('Referrals list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
