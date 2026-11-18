import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) {
      return NextResponse.json({ error }, { status: 401 })
    }

    const period = (request.nextUrl.searchParams.get('period') || '30D') as '7D' | '30D' | '90D'
    const supabase = getServerClient()

    // Supabase returns at most 1000 rows per request, so page through big tables.
    const fetchAll = async (table: string, columns: string) => {
      const rows: any[] = []
      for (let from = 0; ; from += 1000) {
        const { data } = await supabase.from(table).select(columns).range(from, from + 999)
        rows.push(...(data || []))
        if (!data || data.length < 1000) break
      }
      return rows
    }

    // Get counts
    const [affiliatesRes, referralsRes, commissionsRes, payoutsRes, programsRes, pendingPayoutsRes, activitiesRes, referralActivitiesRes] = await Promise.all([
      supabase.from('Affiliate').select('id, referralCode, totalEarnings, totalReferrals, totalConversions, status, tier, userId, User!Affiliate_userId_fkey(id, name, email, phone, avatarUrl)', { count: 'exact' }),
      fetchAll('Referral', 'id, affiliateId, status, source, createdAt').then((data) => ({ data })),
      fetchAll('Commission', 'id, affiliateId, amount, status, createdAt').then((data) => ({ data })),
      supabase.from('Payout').select('id, amount, status, createdAt'),
      supabase.from('Program').select('id, name, commissionType, commissionValue, isActive'),
      supabase.from('Payout').select('id, amount').eq('status', 'pending'),
      supabase.from('Activity').select('*').order('createdAt', { ascending: false }).limit(10),
      supabase.from('Activity').select('*').in('action', ['referral_submitted', 'referral_click', 'status_changed']).eq('entity', 'referral').order('createdAt', { ascending: false }).limit(10),
    ])

    const affiliates = affiliatesRes.data || []
    const referrals = referralsRes.data || []
    const commissions = commissionsRes.data || []
    const payouts = payoutsRes.data || []
    const programs = programsRes.data || []
    const pendingPayouts = pendingPayoutsRes.data || []
    const activities = activitiesRes.data || []
    const referralActivities = referralActivitiesRes.data || []

    // Calculate KPIs
    const isEarned = (st: string) => st === 'approved' || st === 'released' || st === 'paid'
    const totalRevenue = commissions.reduce((sum: number, c: any) => sum + (isEarned(c.status) ? c.amount : 0), 0)
    const activeAffiliates = affiliates.filter((a: any) => a.status === 'active').length
    const inactiveAffiliates = affiliates.filter((a: any) => a.status === 'inactive' || a.status === 'suspended').length
    const submittedReferrals = referrals.filter((r: any) => r.status !== 'opened')
    const totalReferrals = submittedReferrals.length
    const conversions = submittedReferrals.filter((r: any) => r.status === 'enrolled').length
    const conversionRate = totalReferrals > 0 ? ((conversions / totalReferrals) * 100).toFixed(1) : '0'
    const pendingPayoutAmount = pendingPayouts.reduce((sum: number, p: any) => sum + p.amount, 0)

    // Per-ambassador stats calculated from the actual referral and bonus
    // records (the counters stored on Affiliate drift and aren't trusted).
    const stats: Record<string, { earnings: number; referrals: number; conversions: number }> = {}
    const statFor = (id: string) => (stats[id] ||= { earnings: 0, referrals: 0, conversions: 0 })
    for (const c of commissions) if (c.affiliateId && isEarned(c.status)) statFor(c.affiliateId).earnings += c.amount || 0
    for (const r of submittedReferrals) {
      if (!r.affiliateId) continue
      statFor(r.affiliateId).referrals += 1
      if (r.status === 'enrolled') statFor(r.affiliateId).conversions += 1
    }

    // Top affiliates by earnings (include user name/email)
    const topAffiliates = [...affiliates]
      .map((a: any) => ({ a, st: stats[a.id] || { earnings: 0, referrals: 0, conversions: 0 } }))
      .sort((x, y) => y.st.earnings - x.st.earnings || y.st.conversions - x.st.conversions)
      .slice(0, 5)
      .map(({ a, st }: any) => ({
        id: a.id,
        referralCode: a.referralCode || '',
        tier: a.tier,
        totalEarnings: st.earnings,
        totalReferrals: st.referrals,
        totalConversions: st.conversions,
        status: a.status,
        name: (a as any).User?.name || a.referralCode || 'Unknown',
        email: (a as any).User?.email || '',
        phone: (a as any).User?.phone || '',
        avatarUrl: (a as any).User?.avatarUrl || null,
      }))

    // Programs with affiliate count
    const programsWithStats = await Promise.all(
      programs.map(async (p: any) => {
        const { count } = await supabase
          .from('Link')
          .select('id', { count: 'exact', head: true })
          .eq('programId', p.id)
        const { data: progCommissions } = await supabase
          .from('Commission')
          .select('amount')
          .eq('programId', p.id)
          .in('status', ['approved', 'released', 'paid'])
        const revenue = (progCommissions || []).reduce((s: number, c: any) => s + c.amount, 0)
        return {
          id: p.id,
          name: p.name,
          commissionType: p.commissionType,
          commissionValue: p.commissionValue,
          isActive: p.isActive,
          affiliateCount: count || 0,
          revenue,
        }
      })
    )

    // Referral sources breakdown
    const sources = referrals.reduce((acc: any, r: any) => {
      const source = r.source || 'direct'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})

    // Monthly revenue for chart (last 12 months)
    const monthlyRevenue: { month: string; revenue: number }[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthName = monthStart.toLocaleString('default', { month: 'short' })
      const monthCommissions = commissions.filter((c: any) => {
        const d = new Date(c.createdAt)
        return d >= monthStart && d <= monthEnd
      })
      const rev = monthCommissions.reduce((s: number, c: any) => s + c.amount, 0)
      monthlyRevenue.push({ month: monthName, revenue: rev })
    }

    // Chart data based on period
    const enrolledReferrals = referrals.filter((r: any) => r.status === 'enrolled')

    let totalReferralsChart: { label: string; value: number }[] = []
    let enrolledReferralsChart: { label: string; value: number }[] = []

    if (period === '7D') {
      // Last 7 days, label format: "Mon 9", "Tue 10"
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
      // Last 30 days, label format: "Jun 1", "Jun 2"
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
      // 90D - weekly data points (approximately 12-13 weeks)
      const ninetyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89)
      ninetyDaysAgo.setHours(0, 0, 0, 0)
      const totalDays = 90
      const weeksCount = Math.ceil(totalDays / 7)

      for (let w = 0; w < weeksCount; w++) {
        const weekStart = new Date(ninetyDaysAgo)
        weekStart.setDate(weekStart.getDate() + w * 7)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)

        // Don't go past today
        const effectiveEnd = weekEnd > now ? now : weekEnd

        const startMonth = weekStart.toLocaleString('default', { month: 'short' })
        const startDay = weekStart.getDate()
        const endMonth = effectiveEnd.toLocaleString('default', { month: 'short' })
        const endDay = effectiveEnd.getDate()

        let label: string
        if (startMonth === endMonth) {
          label = `${startMonth} ${startDay}-${endDay}`
        } else {
          label = `${startMonth} ${startDay}-${endMonth} ${endDay}`
        }

        const total = submittedReferrals.filter((r: any) => {
          const d = new Date(r.createdAt)
          return d >= weekStart && d <= effectiveEnd
        }).length
        const enrolled = enrolledReferrals.filter((r: any) => {
          const d = new Date(r.createdAt)
          return d >= weekStart && d <= effectiveEnd
        }).length
        totalReferralsChart.push({ label, value: total })
        enrolledReferralsChart.push({ label, value: enrolled })
      }
    }

    return NextResponse.json({
      kpis: {
        totalRevenue,
        activeAffiliates,
        inactiveAffiliates,
        totalReferrals,
        conversionRate,
        pendingPayoutAmount,
      },
      topAffiliates,
      programs: programsWithStats,
      activities,
      recentReferralActivities: referralActivities,
      sources,
      monthlyRevenue,
      totalReferralsChart,
      enrolledReferralsChart,
    })
  } catch (error: any) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
