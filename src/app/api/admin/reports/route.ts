import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    switch (period) {
      case '7d': startDate.setDate(now.getDate() - 7); break
      case '90d': startDate.setDate(now.getDate() - 90); break
      case '1y': startDate.setFullYear(now.getFullYear() - 1); break
      default: startDate.setDate(now.getDate() - 30)
    }

    const [affiliatesRes, referralsRes, commissionsRes, payoutsRes] = await Promise.all([
      supabase.from('Affiliate').select('id, totalEarnings, totalReferrals, totalConversions, tier, status, joinedAt'),
      supabase.from('Referral').select('id, status, source, createdAt').gte('createdAt', startDate.toISOString()),
      supabase.from('Commission').select('id, amount, status, type, createdAt').gte('createdAt', startDate.toISOString()),
      supabase.from('Payout').select('id, amount, status, createdAt').gte('createdAt', startDate.toISOString()),
    ])

    const affiliates = affiliatesRes.data || []
    const referrals = referralsRes.data || []
    const commissions = commissionsRes.data || []
    const payouts = payoutsRes.data || []

    // Stats
    const totalCommissions = commissions.reduce((s: number, c: any) => s + c.amount, 0)
    const approvedCommissions = commissions.filter((c: any) => c.status === 'approved' || c.status === 'paid')
    const totalApproved = approvedCommissions.reduce((s: number, c: any) => s + c.amount, 0)
    const totalPayouts = payouts.filter((p: any) => p.status === 'completed').reduce((s: number, p: any) => s + p.amount, 0)
    const newReferrals = referrals.length
    const conversions = referrals.filter((r: any) => r.status === 'converted').length

    // Tier breakdown
    const byTier = affiliates.reduce((acc: any, a: any) => {
      acc[a.tier] = (acc[a.tier] || 0) + 1
      return acc
    }, {})

    // Source breakdown
    const bySource = referrals.reduce((acc: any, r: any) => {
      const src = r.source || 'direct'
      acc[src] = (acc[src] || 0) + 1
      return acc
    }, {})

    // Daily commissions for chart
    const dailyCommissions: { date: string; amount: number }[] = []
    const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    for (let i = daysDiff; i >= 0; i--) {
      const day = new Date(now)
      day.setDate(day.getDate() - i)
      const dayStr = day.toISOString().split('T')[0]
      const dayTotal = commissions
        .filter((c: any) => c.createdAt.startsWith(dayStr))
        .reduce((s: number, c: any) => s + c.amount, 0)
      dailyCommissions.push({ date: dayStr, amount: dayTotal })
    }

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      stats: {
        totalCommissions,
        totalApproved,
        totalPayouts,
        newReferrals,
        conversions,
        conversionRate: newReferrals > 0 ? ((conversions / newReferrals) * 100).toFixed(1) : '0',
        activeAffiliates: affiliates.filter((a: any) => a.status === 'active').length,
      },
      byTier,
      bySource,
      dailyCommissions,
    })
  } catch (error: any) {
    console.error('Reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
