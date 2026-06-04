import { NextRequest, NextResponse } from 'next/server'
import { requireAffiliate } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { data: invoices, error: dbError } = await supabase
      .from('Invoice')
      .select('*, Payout!Invoice_payoutId_fkey(id, amount, method, status, processedAt)')
      .eq('affiliateId', affiliate.id)
      .order('issuedAt', { ascending: false })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ invoices: invoices || [] })
  } catch (error: any) {
    console.error('Affiliate invoices error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
