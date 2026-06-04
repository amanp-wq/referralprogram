import { NextRequest, NextResponse } from 'next/server'
import { requireAffiliate } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { data: payouts, error: dbError } = await supabase
      .from('Payout')
      .select('*, Invoice!Invoice_payoutId_fkey(id, invoiceNo, status, pdfUrl)')
      .eq('affiliateId', affiliate.id)
      .order('createdAt', { ascending: false })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ payouts: payouts || [] })
  } catch (error: any) {
    console.error('Affiliate payouts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()

    // Check minimum balance
    const minPayout = 50 // from settings
    if (affiliate.balance < minPayout) {
      return NextResponse.json({ error: `Minimum payout amount is $${minPayout}. Your balance is $${affiliate.balance}` }, { status: 400 })
    }

    // Create payout request
    const payoutId = `pay_${uuidv4().substring(0, 12)}`
    const { error: dbError } = await supabase.from('Payout').insert({
      id: payoutId,
      affiliateId: affiliate.id,
      amount: affiliate.balance,
      method: affiliate.payoutMethod,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // Reset balance
    await supabase.from('Affiliate').update({
      balance: 0,
      updatedAt: new Date().toISOString(),
    }).eq('id', affiliate.id)

    // Log activity
    await supabase.from('Activity').insert({
      id: `act_${uuidv4().substring(0, 12)}`,
      userId: user.id,
      action: 'requested_payout',
      entity: 'payout',
      entityId: payoutId,
      details: `Affiliate requested payout of $${affiliate.balance}`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ id: payoutId, amount: affiliate.balance, message: 'Payout request submitted' }, { status: 201 })
  } catch (error: any) {
    console.error('Request payout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
