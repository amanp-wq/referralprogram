import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// This endpoint is called when a referred person submits the enrollment form
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { referralCode, visitorEmail, visitorName, visitorPhone, source } = body

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 })
    }

    if (!visitorName || !visitorEmail) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
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

    // Check if this email has already been referred
    const { data: existingReferral } = await supabase
      .from('Referral')
      .select('id, status')
      .eq('affiliateId', affiliate.id)
      .eq('visitorEmail', visitorEmail)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()

    if (existingReferral && (existingReferral.status === 'submitted' || existingReferral.status === 'enrolled' || existingReferral.status === 'converted')) {
      return NextResponse.json({
        success: true,
        message: 'You have already submitted your details with this email.',
        alreadyExists: true,
      })
    }

    // Find a matching "opened"/"clicked" referral from the same code to update
    const { data: clickedReferral } = await supabase
      .from('Referral')
      .select('*')
      .eq('referralCode', referralCode)
      .in('status', ['clicked', 'opened'])
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()

    // Determine programId from the clicked referral or affiliate's links
    let targetProgramId: string | null = null
    if (clickedReferral?.programId) {
      targetProgramId = clickedReferral.programId
    } else {
      // Try to find the affiliate's active program
      const { data: affiliateLink } = await supabase
        .from('Link')
        .select('programId')
        .eq('affiliateId', affiliate.id)
        .eq('isActive', true)
        .limit(1)
        .single()
      targetProgramId = affiliateLink?.programId || null
    }

    // Update existing "clicked" referral or create new one
    if (clickedReferral) {
      await supabase.from('Referral').update({
        status: 'submitted',
        visitorEmail,
        visitorName,
        source: source || clickedReferral.source || 'direct',
        updatedAt: new Date().toISOString(),
      }).eq('id', clickedReferral.id)
    } else {
      // Create new referral record if none exists (direct form submission)
      await supabase.from('Referral').insert({
        id: `ref_${uuidv4().substring(0, 12)}`,
        affiliateId: affiliate.id,
        programId: targetProgramId,
        referralCode,
        visitorEmail,
        visitorName,
        source: source || 'direct',
        status: 'submitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }

    // Log activity
    await supabase.from('Activity').insert({
      id: `act_${uuidv4().substring(0, 12)}`,
      userId: affiliate.userId,
      action: 'referral_submitted',
      entity: 'referral',
      entityId: clickedReferral?.id || null,
      details: `${visitorName} (${visitorEmail}) submitted enrollment via referral code ${referralCode}`,
      createdAt: new Date().toISOString(),
    })

    // Send email notification to admin about new referral
    try {
      const { sendEmail, newReferralAdminEmail } = await import('@/app/api/email/route')
      const affiliateName = (affiliate as any).User?.name || affiliate.referralCode || 'Ambassador'
      await sendEmail(newReferralAdminEmail(visitorName, visitorEmail, affiliateName, referralCode))
    } catch (emailErr) {
      console.error('[REFERRAL] Email sending failed:', emailErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Enrollment submitted successfully! Your referral is now being processed.',
      referralStatus: 'submitted',
    })
  } catch (error: any) {
    console.error('Referral submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
