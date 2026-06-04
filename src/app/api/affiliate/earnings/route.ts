import { NextRequest, NextResponse } from 'next/server'
import { requireAffiliate } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { data: commissions, error: dbError } = await supabase
      .from('Commission')
      .select('*, Program!Commission_programId_fkey(id, name)')
      .eq('affiliateId', affiliate.id)
      .order('createdAt', { ascending: false })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    const pending = commissions?.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + c.amount, 0) || 0
    const approved = commissions?.filter((c: any) => c.status === 'approved').reduce((s: number, c: any) => s + c.amount, 0) || 0
    const paid = commissions?.filter((c: any) => c.status === 'paid').reduce((s: number, c: any) => s + c.amount, 0) || 0

    return NextResponse.json({
      commissions: commissions || [],
      summary: { pending, approved, paid, total: pending + approved + paid },
    })
  } catch (error: any) {
    console.error('Affiliate earnings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
