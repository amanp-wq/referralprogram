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
      .from('Payout')
      .select('*, Affiliate!Payout_affiliateId_fkey(id, referralCode, payoutMethod, User!Affiliate_userId_fkey(name, email))')
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) query = query.eq('status', status)

    const { data: payouts, error: dbError, count } = await query

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({
      payouts: payouts || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error: any) {
    console.error('Payouts list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const { affiliateId, method } = body

    if (!affiliateId) return NextResponse.json({ error: 'Affiliate ID is required' }, { status: 400 })

    const supabase = getServerClient()

    // Get affiliate's balance and pending commissions
    const { data: affiliate } = await supabase.from('Affiliate').select('balance, payoutMethod').eq('id', affiliateId).single()
    if (!affiliate) return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })

    if (affiliate.balance <= 0) return NextResponse.json({ error: 'No balance to payout' }, { status: 400 })

    // Create payout
    const payoutId = `pay_${uuidv4().substring(0, 12)}`
    const { error: payoutError } = await supabase.from('Payout').insert({
      id: payoutId,
      affiliateId,
      amount: affiliate.balance,
      method: method || affiliate.payoutMethod,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (payoutError) return NextResponse.json({ error: payoutError.message }, { status: 500 })

    // Link pending commissions to this payout
    const { data: pendingComms } = await supabase
      .from('Commission')
      .select('id')
      .eq('affiliateId', affiliateId)
      .eq('status', 'approved')

    if (pendingComms && pendingComms.length > 0) {
      await supabase
        .from('Commission')
        .update({ payoutId, status: 'paid', updatedAt: new Date().toISOString() })
        .in('id', pendingComms.map((c: any) => c.id))
    }

    // Reset affiliate balance
    await supabase.from('Affiliate').update({
      balance: 0,
      updatedAt: new Date().toISOString(),
    }).eq('id', affiliateId)

    // Log activity
    await supabase.from('Activity').insert({
      id: `act_${uuidv4().substring(0, 12)}`,
      userId: user.id,
      action: 'created_payout',
      entity: 'payout',
      entityId: payoutId,
      details: `Created payout of $${affiliate.balance} for affiliate`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ id: payoutId, amount: affiliate.balance, message: 'Payout created successfully' }, { status: 201 })
  } catch (error: any) {
    console.error('Create payout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const { id, status, reference, notes } = body

    if (!id || !status) return NextResponse.json({ error: 'ID and status are required' }, { status: 400 })

    const supabase = getServerClient()
    const updates: any = { status, updatedAt: new Date().toISOString() }
    if (reference) updates.reference = reference
    if (notes) updates.notes = notes
    if (status === 'completed') updates.processedAt = new Date().toISOString()

    const { error: dbError } = await supabase.from('Payout').update(updates).eq('id', id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // If completed, create invoice
    if (status === 'completed') {
      const { data: payout } = await supabase.from('Payout').select('*').eq('id', id).single()
      if (payout) {
        const invoiceNo = `INV-${Date.now().toString(36).toUpperCase()}`
        await supabase.from('Invoice').insert({
          id: `inv_${uuidv4().substring(0, 12)}`,
          payoutId: id,
          affiliateId: payout.affiliateId,
          amount: payout.amount,
          invoiceNo,
          status: 'generated',
          issuedAt: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({ message: 'Payout updated successfully' })
  } catch (error: any) {
    console.error('Update payout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
