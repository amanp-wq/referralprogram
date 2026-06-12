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

    // Period-based chart data
    const period = (request.nextUrl.searchParams.get('period') || '30D') as '7D' | '30D' | '90D'
    const submittedReferrals = referrals.filter((r: any) => r.status !== 'clicked' && r.status !== 'opened')
    const enrolledReferrals = referrals.filter((r: any) => r.status === 'enrolled' || r.status === 'converted' || r.status === 'completed')

    let totalReferralsChart: { label: string; value: number }[] = []
    let enrolledReferralsChart: { label: string; value: number }[] = []

    if (period === '7D') {
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
        const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999)
        const dayName = day.toLocaleString('default', { weekday: 'short' })
        const dayNum = day.getDate()
        const label = `${dayName} ${dayNum}`
        const total = submittedReferrals.filter((r: any) => {
          const d = new Date(r.createdAt)
          return d >= dayStart && d <= dayEnd
        }).length
        const enrolled = enrolledReferrals.filter((r: any) => {
          const d = new Date(r.createdAt)
          return d >= dayStart && d <= dayEnd
        }).length
        totalReferralsChart.push({ label, value: total })
        enrolledReferralsChart.push({ label, value: enrolled })
      }
    } else if (period === '30D') {
      for (let i = 29; i >= 0; i--) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
        const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999)
        const monthName = day.toLocaleString('default', { month: 'short' })
        const dayNum = day.getDate()
        const label = `${monthName} ${dayNum}`
        const total = submittedReferrals.filter((r: any) => {
          const d = new Date(r.createdAt)
          return d >= dayStart && d <= dayEnd
        }).length
        const enrolled = enrolledReferrals.filter((r: any) => {
          const d = new Date(r.createdAt)
          return d >= dayStart && d <= dayEnd
        }).length
        totalReferralsChart.push({ label, value: total })
        enrolledReferralsChart.push({ label, value: enrolled })
      }
    } else {
      for (let i = 2; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        const monthName = monthStart.toLocaleString('default', { month: 'short' })
        const total = submittedReferrals.filter((r: any) => {
          const d = new Date(r.createdAt)
          return d >= monthStart && d <= monthEnd
        }).length
        const enrolled = enrolledReferrals.filter((r: any) => {
          const d = new Date(r.createdAt)
          return d >= monthStart && d <= monthEnd
        }).length
        totalReferralsChart.push({ label: monthName, value: total })
        enrolledReferralsChart.push({ label: monthName, value: enrolled })
      }
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
      totalReferralsChart,
      enrolledReferralsChart,
      sources,
    })
  } catch (error: any) {
    console.error('Affiliate dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
