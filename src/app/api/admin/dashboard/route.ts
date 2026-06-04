import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) {
      return NextResponse.json({ error }, { status: 401 })
    }

    const supabase = getServerClient()

    // Get counts
    const [affiliatesRes, referralsRes, commissionsRes, payoutsRes, programsRes, pendingPayoutsRes, activitiesRes] = await Promise.all([
      supabase.from('Affiliate').select('id, referralCode, totalEarnings, totalReferrals, totalConversions, status, tier, userId, User!Affiliate_userId_fkey(id, name, email, avatarUrl)', { count: 'exact' }),
      supabase.from('Referral').select('id, status, createdAt', { count: 'exact' }),
      supabase.from('Commission').select('id, amount, status, createdAt'),
      supabase.from('Payout').select('id, amount, status, createdAt'),
      supabase.from('Program').select('id, name, commissionType, commissionValue, isActive'),
      supabase.from('Payout').select('id, amount').eq('status', 'pending'),
      supabase.from('Activity').select('*').order('createdAt', { ascending: false }).limit(10),
    ])

    const affiliates = affiliatesRes.data || []
    const referrals = referralsRes.data || []
    const commissions = commissionsRes.data || []
    const payouts = payoutsRes.data || []
    const programs = programsRes.data || []
    const pendingPayouts = pendingPayoutsRes.data || []
    const activities = activitiesRes.data || []

    // Calculate KPIs
    const totalRevenue = commissions.reduce((sum: number, c: any) => sum + (c.status === 'approved' || c.status === 'paid' ? c.amount : 0), 0)
    const activeAffiliates = affiliates.filter((a: any) => a.status === 'active').length
    const totalReferrals = referrals.length
    const conversions = referrals.filter((r: any) => r.status === 'converted').length
    const conversionRate = totalReferrals > 0 ? ((conversions / totalReferrals) * 100).toFixed(1) : '0'
    const pendingPayoutAmount = pendingPayouts.reduce((sum: number, p: any) => sum + p.amount, 0)

    // Top affiliates by earnings (include user name/email)
    const topAffiliates = [...affiliates]
      .sort((a: any, b: any) => b.totalEarnings - a.totalEarnings)
      .slice(0, 5)
      .map((a: any) => ({
        id: a.id,
        referralCode: a.referralCode || '',
        tier: a.tier,
        totalEarnings: a.totalEarnings || 0,
        totalReferrals: a.totalReferrals || 0,
        totalConversions: a.totalConversions || 0,
        status: a.status,
        name: (a as any).User?.name || a.referralCode || 'Unknown',
        email: (a as any).User?.email || '',
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
          .in('status', ['approved', 'paid'])
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

    return NextResponse.json({
      kpis: {
        totalRevenue,
        activeAffiliates,
        totalReferrals,
        conversionRate,
        pendingPayoutAmount,
      },
      topAffiliates,
      programs: programsWithStats,
      activities,
      sources,
      monthlyRevenue,
    })
  } catch (error: any) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
