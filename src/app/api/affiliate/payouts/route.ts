import { NextRequest, NextResponse } from 'next/server'
import { requireAffiliate } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()

    // Get payouts
    const { data: payouts, error: dbError } = await supabase
      .from('Payout')
      .select('*, Invoice!Invoice_payoutId_fkey(id, invoiceNo, status, pdfUrl)')
      .eq('affiliateId', affiliate.id)
      .order('createdAt', { ascending: false })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // Calculate pending amount from pending payouts
    const pendingAmount = (payouts || [])
      .filter((p: any) => p.status === 'pending' || p.status === 'processing')
      .reduce((sum: number, p: any) => sum + p.amount, 0)

    return NextResponse.json({
      payouts: payouts || [],
      balance: affiliate.balance || 0,
      pendingAmount,
    })
  } catch (error: any) {
    console.error('Affiliate payouts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const customAmount = body.amount ? parseFloat(body.amount) : null
    const customMethod = body.method || null

    const supabase = getServerClient()

    // Check minimum balance
    const minPayout = 50
    if (affiliate.balance < minPayout) {
      return NextResponse.json({ error: `Minimum payout amount is $${minPayout}. Your balance is $${affiliate.balance}` }, { status: 400 })
    }

    // Use custom amount if provided and valid, otherwise use full balance
    const payoutAmount = customAmount && customAmount > 0 && customAmount <= affiliate.balance
      ? customAmount
      : affiliate.balance

    const payoutMethod = customMethod || affiliate.payoutMethod

    // Create payout request
    const payoutId = `pay_${uuidv4().substring(0, 12)}`
    const { error: dbError } = await supabase.from('Payout').insert({
      id: payoutId,
      affiliateId: affiliate.id,
      amount: payoutAmount,
      method: payoutMethod,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // Deduct from balance (only the payout amount, not necessarily full balance)
    const newBalance = affiliate.balance - payoutAmount
    await supabase.from('Affiliate').update({
      balance: newBalance,
      updatedAt: new Date().toISOString(),
    }).eq('id', affiliate.id)

    // Link approved commissions to this payout if paying full balance
    if (payoutAmount === affiliate.balance) {
      const { data: pendingComms } = await supabase
        .from('Commission')
        .select('id')
        .eq('affiliateId', affiliate.id)
        .eq('status', 'approved')

      if (pendingComms && pendingComms.length > 0) {
        await supabase
          .from('Commission')
          .update({ payoutId, status: 'paid', updatedAt: new Date().toISOString() })
          .in('id', pendingComms.map((c: any) => c.id))
      }
    }

    // Log activity
    await supabase.from('Activity').insert({
      id: `act_${uuidv4().substring(0, 12)}`,
      userId: user.id,
      action: 'requested_payout',
      entity: 'payout',
      entityId: payoutId,
      details: `Affiliate requested payout of $${payoutAmount} via ${payoutMethod}`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ id: payoutId, amount: payoutAmount, message: 'Payout request submitted' }, { status: 201 })
  } catch (error: any) {
    console.error('Request payout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
