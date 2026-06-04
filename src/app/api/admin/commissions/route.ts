import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

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
      .from('Commission')
      .select('*, Affiliate!Commission_affiliateId_fkey(id, referralCode, User!Affiliate_userId_fkey(name, email)), Program!Commission_programId_fkey(id, name, commissionType, commissionValue)', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) query = query.eq('status', status)

    const { data: commissions, error: dbError, count } = await query

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({
      commissions: commissions || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error: any) {
    console.error('Commissions list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) return NextResponse.json({ error: 'ID and status are required' }, { status: 400 })

    const supabase = getServerClient()
    const { error: dbError } = await supabase
      .from('Commission')
      .update({ status, updatedAt: new Date().toISOString() })
      .eq('id', id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // If approved, update affiliate's totalEarnings
    if (status === 'approved') {
      const { data: commission } = await supabase.from('Commission').select('affiliateId, amount').eq('id', id).single()
      if (commission) {
        const { data: affiliate } = await supabase.from('Affiliate').select('totalEarnings, balance').eq('id', commission.affiliateId).single()
        if (affiliate) {
          await supabase.from('Affiliate').update({
            totalEarnings: affiliate.totalEarnings + commission.amount,
            balance: affiliate.balance + commission.amount,
            updatedAt: new Date().toISOString(),
          }).eq('id', commission.affiliateId)
        }
      }
    }

    return NextResponse.json({ message: 'Commission updated successfully' })
  } catch (error: any) {
    console.error('Update commission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
