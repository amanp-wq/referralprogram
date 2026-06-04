import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// This endpoint is called when a referral converts (e.g., after signup/purchase)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { referralCode, visitorEmail, visitorName, programId, conversionAmount } = body

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 })
    }

    const supabase = getServerClient()

    // Find the affiliate by referral code
    const { data: affiliate } = await supabase
      .from('Affiliate')
      .select('*')
      .eq('referralCode', referralCode)
      .eq('status', 'active')
      .single()

    if (!affiliate) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
    }

    // Find a matching referral that was clicked
    const { data: referral } = await supabase
      .from('Referral')
      .select('*')
      .eq('referralCode', referralCode)
      .eq('status', 'clicked')
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()

    const targetProgramId = programId || referral?.programId

    if (!targetProgramId) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 })
    }

    // Get program details
    const { data: program } = await supabase.from('Program').select('*').eq('id', targetProgramId).single()
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    // Calculate commission
    let commissionAmount = 0
    const rate = affiliate.commissionRate || program.commissionValue
    if (program.commissionType === 'percentage' && conversionAmount) {
      commissionAmount = (conversionAmount * rate) / 100
    } else {
      commissionAmount = program.commissionValue
    }

    // Update referral to converted
    if (referral) {
      await supabase.from('Referral').update({
        status: 'converted',
        visitorEmail: visitorEmail || referral.visitorEmail,
        visitorName: visitorName || referral.visitorName,
        convertedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).eq('id', referral.id)
    } else {
      // Create new referral record if none exists
      await supabase.from('Referral').insert({
        id: `ref_${uuidv4().substring(0, 12)}`,
        affiliateId: affiliate.id,
        programId: targetProgramId,
        referralCode,
        visitorEmail,
        visitorName,
        status: 'converted',
        convertedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    // Increment conversions on link
    if (referral?.linkId) {
      const { data: link } = await supabase.from('Link').select('conversions').eq('id', referral.linkId).single()
      if (link) {
        await supabase.from('Link').update({ conversions: link.conversions + 1, updatedAt: new Date().toISOString() }).eq('id', referral.linkId)
      }
    }

    // Increment affiliate conversions
    await supabase.from('Affiliate').update({
      totalConversions: affiliate.totalConversions + 1,
      updatedAt: new Date().toISOString(),
    }).eq('id', affiliate.id)

    // Create commission
    const commissionId = `com_${uuidv4().substring(0, 12)}`
    await supabase.from('Commission').insert({
      id: commissionId,
      affiliateId: affiliate.id,
      programId: targetProgramId,
      referralId: referral?.id || null,
      amount: commissionAmount,
      rate,
      type: 'referral',
      status: 'pending',
      description: `Commission for ${program.name} referral`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Log activity
    await supabase.from('Activity').insert({
      id: `act_${uuidv4().substring(0, 12)}`,
      userId: affiliate.userId,
      action: 'conversion',
      entity: 'referral',
      entityId: referral?.id,
      details: `Conversion tracked for referral code ${referralCode}. Commission: $${commissionAmount.toFixed(2)}`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      commission: commissionAmount,
      message: 'Conversion tracked and commission created',
    })
  } catch (error: any) {
    console.error('Referral conversion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
