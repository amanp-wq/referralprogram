import { NextRequest, NextResponse } from 'next/server'
import { requireAffiliate } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()

    // Get affiliate's links, referrals, commissions, payouts
    const [linksRes, referralsRes, commissionsRes, payoutsRes, recentActivitiesRes] = await Promise.all([
      supabase.from('Link').select('*').eq('affiliateId', affiliate.id),
      supabase.from('Referral').select('*').eq('affiliateId', affiliate.id).order('createdAt', { ascending: false }).limit(50),
      supabase.from('Commission').select('*').eq('affiliateId', affiliate.id).order('createdAt', { ascending: false }),
      supabase.from('Payout').select('*').eq('affiliateId', affiliate.id).order('createdAt', { ascending: false }).limit(10),
      supabase.from('Activity').select('*').order('createdAt', { ascending: false }).limit(5),
    ])

    const links = linksRes.data || []
    const referrals = referralsRes.data || []
    const commissions = commissionsRes.data || []
    const payouts = payoutsRes.data || []

    // Calculate stats
    const totalClicks = links.reduce((s: number, l: any) => s + l.clicks, 0)
    const totalConversions = links.reduce((s: number, l: any) => s + l.conversions, 0)
    const pendingEarnings = commissions.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + c.amount, 0)
    const approvedEarnings = commissions.filter((c: any) => c.status === 'approved' || c.status === 'paid').reduce((s: number, c: any) => s + c.amount, 0)
    const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0'

    // Monthly earnings chart
    const monthlyEarnings: { month: string; amount: number }[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthName = monthStart.toLocaleString('default', { month: 'short' })
      const monthAmount = commissions
        .filter((c: any) => {
          const d = new Date(c.createdAt)
          return d >= monthStart && d <= monthEnd
        })
        .reduce((s: number, c: any) => s + c.amount, 0)
      monthlyEarnings.push({ month: monthName, amount: monthAmount })
    }

    // Referral source breakdown
    const sources = referrals.reduce((acc: any, r: any) => {
      const src = r.source || 'direct'
      acc[src] = (acc[src] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      affiliate,
      kpis: {
        totalEarnings: affiliate.totalEarnings,
        pendingEarnings,
        approvedEarnings,
        balance: affiliate.balance,
        totalClicks,
        totalConversions,
        conversionRate,
        totalReferrals: affiliate.totalReferrals,
      },
      links,
      recentReferrals: referrals.slice(0, 10),
      recentPayouts: payouts,
      monthlyEarnings,
      sources,
    })
  } catch (error: any) {
    console.error('Affiliate dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
