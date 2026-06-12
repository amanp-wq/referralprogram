import { NextRequest, NextResponse } from 'next/server'
import { requireAffiliate } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()

    // Get period from query
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30D'

    // Only fetch commission summaries - do NOT expose individual commission records to affiliates
    // Commissions are admin-only; affiliates only see their balance/total numbers
    const { data: commissions, error: dbError } = await supabase
      .from('Commission')
      .select('amount, status, type, createdAt')
      .eq('affiliateId', affiliate.id)
      .order('createdAt', { ascending: false })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // Calculate KPIs from commission data
    const pending = commissions?.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + c.amount, 0) || 0
    const approved = commissions?.filter((c: any) => c.status === 'approved').reduce((s: number, c: any) => s + c.amount, 0) || 0
    const released = commissions?.filter((c: any) => c.status === 'released').reduce((s: number, c: any) => s + c.amount, 0) || 0
    const paid = commissions?.filter((c: any) => c.status === 'paid').reduce((s: number, c: any) => s + c.amount, 0) || 0
    const totalEarnings = pending + approved + released + paid
    const balance = affiliate.balance || 0

    // Calculate monthly earnings for chart (only from approved/released/paid)
    const monthlyMap: Record<string, number> = {}
    const now = new Date()

    // Generate last N months based on period
    const numMonths = period === '7D' ? 1 : period === '30D' ? 6 : 12
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      monthlyMap[key] = 0
    }

    // Fill in actual data (only confirmed earnings: approved, released, paid)
    for (const c of (commissions || [])) {
      if (c.status === 'approved' || c.status === 'released' || c.status === 'paid') {
        const date = new Date(c.createdAt)
        const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        if (key in monthlyMap) {
          monthlyMap[key] += c.amount
        }
      }
    }

    const monthlyEarnings = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount }))

    // Count commission types for the affiliate
    const referralCommissions = commissions?.filter((c: any) => c.type === 'commission' || c.type === 'referral').length || 0
    const bonusCommissions = commissions?.filter((c: any) => c.type === 'bonus').length || 0

    return NextResponse.json({
      // Do NOT return individual commission records - admin only
      kpis: {
        totalEarnings,
        pendingEarnings: pending,
        approvedEarnings: approved + released + paid,
        balance,
      },
      monthlyEarnings,
      summary: {
        totalCommissions: commissions?.length || 0,
        referralCommissions,
        bonusCommissions,
      },
    })
  } catch (error: any) {
    console.error('Affiliate earnings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
