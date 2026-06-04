import { NextRequest, NextResponse } from 'next/server'
import { requireAffiliate } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        company: user.company,
        avatarUrl: user.avatarUrl,
      },
      affiliate: {
        id: affiliate.id,
        referralCode: affiliate.referralCode,
        tier: affiliate.tier,
        commissionRate: affiliate.commissionRate,
        payoutMethod: affiliate.payoutMethod,
        bankName: affiliate.bankName,
        bankAccount: affiliate.bankAccount,
        bankIfsc: affiliate.bankIfsc,
        upiId: affiliate.upiId,
        payoutEmail: affiliate.payoutEmail,
      },
    })
  } catch (error: any) {
    console.error('Affiliate settings get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const { name, phone, company, payoutMethod, bankName, bankAccount, bankIfsc, upiId, payoutEmail } = body

    const supabase = getServerClient()

    // Update user
    if (name || phone || company) {
      await supabase.from('User').update({
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(company !== undefined && { company }),
        updatedAt: new Date().toISOString(),
      }).eq('id', user.id)
    }

    // Update affiliate payout settings
    await supabase.from('Affiliate').update({
      ...(payoutMethod && { payoutMethod }),
      ...(bankName !== undefined && { bankName }),
      ...(bankAccount !== undefined && { bankAccount }),
      ...(bankIfsc !== undefined && { bankIfsc }),
      ...(upiId !== undefined && { upiId }),
      ...(payoutEmail !== undefined && { payoutEmail }),
      updatedAt: new Date().toISOString(),
    }).eq('id', affiliate.id)

    return NextResponse.json({ message: 'Settings updated successfully' })
  } catch (error: any) {
    console.error('Affiliate settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
