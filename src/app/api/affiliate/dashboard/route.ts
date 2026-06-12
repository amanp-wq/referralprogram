import { NextRequest, NextResponse } from 'next/server'
import { requireAffiliate } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()

    // Get affiliate's links, referrals, commissions, payouts
    const [linksRes, referralsRes, commissionsRes, payoutsRes] = await Promise.all([
      supabase.from('Link').select('*').eq('affiliateId', affiliate.id),
      supabase.from('Referral').select('*').eq('affiliateId', affiliate.id).order('createdAt', { ascending: false }).limit(50),
      supabase.from('Commission').select('*').eq('affiliateId', affiliate.id).order('createdAt', { ascending: false }),
      supabase.from('Payout').select('*').eq('affiliateId', affiliate.id).order('createdAt', { ascending: false }).limit(10),
    ])

    const links = linksRes.data || []
    const referrals = referralsRes.data || []
    const commissions = commissionsRes.data || []
    const payouts = payoutsRes.data || []

    // Calculate stats - only count submitted referrals (not clicked/opened)
    const totalClicks = links.reduce((s: number, l: any) => s + l.clicks, 0)
    const totalConversions = links.reduce((s: number, l: any) => s + l.conversions, 0)
    const pendingEarnings = commissions.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + c.amount, 0)
    const approvedEarnings = commissions.filter((c: any) => c.status === 'approved' || c.status === 'released' || c.status === 'paid').reduce((s: number, c: any) => s + c.amount, 0)
    // Conversion rate = enrolled / submitted referrals (not clicks)
    const conversionRate = submittedReferrals.length > 0 ? ((enrolledReferrals.length / submittedReferrals.length) * 100).toFixed(1) : '0'

    const now = new Date()

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
      // 90D: weekly data points (~13 weeks)
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      // Find the most recent Saturday (end of week) or use today
      const dayOfWeek = today.getDay() // 0=Sun, 6=Sat
      const endOfCurrentWeek = new Date(today)
      endOfCurrentWeek.setDate(today.getDate() + (6 - dayOfWeek)) // move to Saturday

      for (let i = 12; i >= 0; i--) {
        const weekEnd = new Date(endOfCurrentWeek)
        weekEnd.setDate(endOfCurrentWeek.getDate() - i * 7)
        const weekStart = new Date(weekEnd)
        weekStart.setDate(weekEnd.getDate() - 6)

        const weekEndInclusive = new Date(weekEnd)
        weekEndInclusive.setHours(23, 59, 59, 999)

        const startMonth = weekStart.toLocaleString('default', { month: 'short' })
        const startDay = weekStart.getDate()
        const endDay = weekEnd.getDate()
        const label = `${startMonth} ${startDay}-${endDay}`

        const total = submittedReferrals.filter((r: any) => {
          const d = new Date(r.createdAt)
          return d >= weekStart && d <= weekEndInclusive
        }).length
        const enrolled = enrolledReferrals.filter((r: any) => {
          const d = new Date(r.createdAt)
          return d >= weekStart && d <= weekEndInclusive
        }).length
        totalReferralsChart.push({ label, value: total })
        enrolledReferralsChart.push({ label, value: enrolled })
      }
    }

    // Referral source breakdown
    const sources = referrals.reduce((acc: any, r: any) => {
      const src = r.source || 'direct'
      acc[src] = (acc[src] || 0) + 1
      return acc
    }, {})

    // Recent referral activities - query Activity table for referral-related actions
    const referralIds = referrals.map((r: any) => r.id)
    let recentReferralActivities: any[] = []
    if (referralIds.length > 0) {
      const { data: activities } = await supabase
        .from('Activity')
        .select('*')
        .eq('entity', 'referral')
        .in('action', ['referral_submitted', 'referral_click', 'status_changed'])
        .in('entityId', referralIds)
        .order('createdAt', { ascending: false })
        .limit(10)
      recentReferralActivities = activities || []
    }

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
        totalReferrals: submittedReferrals.length,
        enrolledReferrals: enrolledReferrals.length,
      },
      links,
      recentReferrals: referrals.slice(0, 10),
      recentPayouts: payouts,
      totalReferralsChart,
      enrolledReferralsChart,
      sources,
      recentReferralActivities,
    })
  } catch (error: any) {
    console.error('Affiliate dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
