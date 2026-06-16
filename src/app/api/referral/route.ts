import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { validateBody, referralConvertSchema, sanitizeText } from '@/lib/validation'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { applyCors, handlePreflight } from '@/lib/cors'
import { v4 as uuidv4 } from 'uuid'

// Handle CORS preflight for cross-origin conversion POSTs
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const requestOrigin = new URL(request.url).origin
  return handlePreflight(origin, requestOrigin)
}

// This endpoint is called when a referred person submits the enrollment form
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const requestOrigin = new URL(request.url).origin
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return applyCors(
        NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
        origin,
        requestOrigin
      )
    }

    // Validate input
    const validation = validateBody(referralConvertSchema, body)
    if (!validation.success) {
      return applyCors(validation.response, origin, requestOrigin)
    }
    const { referralCode, visitorEmail, visitorName, visitorPhone, source } = validation.data

    // Rate limit: 5 submissions per IP per minute (anti-fraud)
    const ip = getClientIp(request)
    if (ip) {
      const allowed = checkRateLimit(`referral:${ip}`, 5, 60_000)
      if (!allowed) {
        return applyCors(
          NextResponse.json(
            { error: 'Too many submissions. Please try again later.' },
            { status: 429 }
          ),
          origin,
          requestOrigin
        )
      }
    }

    // Sanitize free-text fields
    const safeName = sanitizeText(visitorName, 100) || ''
    const safeEmail = visitorEmail.toLowerCase().trim()

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
      .eq('visitorEmail', safeEmail)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()

    if (existingReferral && (existingReferral.status === 'submitted' || existingReferral.status === 'enrolled')) {
      return NextResponse.json({
        success: true,
        message: 'You have already submitted your details with this email.',
        alreadyExists: true,
      })
    }

    // Find a matching "opened" referral from the same code to update
    const { data: clickedReferral } = await supabase
      .from('Referral')
      .select('*')
      .eq('referralCode', referralCode)
      .in('status', ['opened'])
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

    // Update existing "opened" referral or create new one
    if (clickedReferral) {
      await supabase.from('Referral').update({
        status: 'submitted',
        visitorEmail: safeEmail,
        visitorName: safeName,
        visitorPhone: visitorPhone || null,
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
        visitorEmail: safeEmail,
        visitorName: safeName,
        visitorPhone: visitorPhone || null,
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
      details: `${safeName} (${safeEmail}) submitted enrollment via referral code ${referralCode}`,
      createdAt: new Date().toISOString(),
    })

    // Send email notification to admin about new referral
    try {
      const { sendEmail, newReferralAdminEmail } = await import('@/app/api/email/route')
      const affiliateName = (affiliate as any).User?.name || affiliate.referralCode || 'Ambassador'
      await sendEmail(newReferralAdminEmail(safeName, safeEmail, affiliateName, referralCode))
    } catch (emailErr) {
      console.error('[REFERRAL] Email sending failed:', emailErr)
    }

    return applyCors(
      NextResponse.json({
        success: true,
        message: 'Enrollment submitted successfully! Your referral is now being processed.',
        referralStatus: 'submitted',
      }),
      origin,
      requestOrigin
    )
  } catch (error: any) {
    console.error('Referral submission error:', error)
    return applyCors(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      request.headers.get('origin'),
      new URL(request.url).origin
    )
  }
}
