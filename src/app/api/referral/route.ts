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
    const { referralCode, visitorEmail, visitorName, visitorPhone, source, notes } = validation.data

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
    const safeNotes = notes ? sanitizeText(notes, 2000) : null

    const supabase = getServerClient()

    // ─────────────────────────────────────────────────────────────
    // Look up the affiliate.
    // The referralCode in the URL can be EITHER:
    //   (a) The affiliate's primary referralCode (e.g. "ELEVATE10")
    //       — used by the default ambassador link /ref/ELEVATE10
    //   (b) A per-program Link code (e.g. "ELEVATE10-a1b2c3d4")
    //       — created via POST /api/affiliate/links, format is
    //       `${referralCode}-${uuid8}` and stored in the Link table.
    // We need to handle both cases, otherwise custom per-program
    // links break at form submission time.
    //
    // Status policy: allow 'active' AND 'pending' affiliates to
    // receive referrals — newly signed-up ambassadors (status=
    // 'pending' until admin approval) should still be able to share
    // their links and collect referrals. Suspended/inactive cannot.
    // ─────────────────────────────────────────────────────────────

    let affiliate: any = null
    let linkId: string | null = null
    let targetProgramId: string | null = null

    // First, try matching the Affiliate table directly (case (a))
    const { data: affiliateByCode } = await supabase
      .from('Affiliate')
      .select('*, User!Affiliate_userId_fkey(name, email)')
      .eq('referralCode', referralCode)
      .in('status', ['active', 'pending'])
      .single()

    if (affiliateByCode) {
      affiliate = affiliateByCode
    } else {
      // Case (b): try matching the Link table by code, then join to Affiliate
      const { data: linkRow } = await supabase
        .from('Link')
        .select('id, affiliateId, programId, Affiliate!Link_affiliateId_fkey(*)')
        .eq('code', referralCode)
        .eq('isActive', true)
        .single()

      if (linkRow) {
        const linkedAffiliate = (linkRow as any).Affiliate
        // Verify the affiliate is still active or pending
        if (linkedAffiliate && ['active', 'pending'].includes(linkedAffiliate.status)) {
          affiliate = linkedAffiliate
          linkId = linkRow.id
          targetProgramId = linkRow.programId
        }
      }
    }

    if (!affiliate) {
      return applyCors(
        NextResponse.json({ error: 'Invalid referral code' }, { status: 404 }),
        origin,
        requestOrigin
      )
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
      return applyCors(
        NextResponse.json({
          success: true,
          message: 'You have already submitted your details with this email.',
          alreadyExists: true,
        }),
        origin,
        requestOrigin
      )
    }

    // Find a matching "opened" referral from the same affiliate and code to update
    const { data: clickedReferral } = await supabase
      .from('Referral')
      .select('*')
      .eq('affiliateId', affiliate.id)
      .eq('referralCode', referralCode)
      .in('status', ['opened'])
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()

    // Determine programId — prefer the Link we already looked up (case (b)),
    // then the clicked Referral's programId (set by /api/track),
    // then fall back to the affiliate's first active Link.
    if (!targetProgramId) {
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
    }

    // If we found an opened Referral from /api/track but didn't get a linkId
    // from the affiliate lookup (case (a) — default ambassador link), use
    // the linkId stored on the Referral record.
    if (!linkId && clickedReferral?.linkId) {
      linkId = clickedReferral.linkId
    }

    // Update existing "opened" referral or create new one
    if (clickedReferral) {
      const { error: updateError } = await supabase.from('Referral').update({
        status: 'submitted',
        visitorEmail: safeEmail,
        visitorName: safeName,
        visitorPhone: visitorPhone || null,
        source: source || clickedReferral.source || 'direct',
        ...(safeNotes !== null ? { notes: safeNotes } : {}),
        updatedAt: new Date().toISOString(),
      }).eq('id', clickedReferral.id)

      if (updateError) {
        console.error('[REFERRAL] Failed to update referral status:', updateError)
        return applyCors(
          NextResponse.json({ error: 'Failed to save your submission. Please try again.' }, { status: 500 }),
          origin, requestOrigin
        )
      }
    } else {
      // Create new referral record if none exists (direct form submission)
      const { error: insertError } = await supabase.from('Referral').insert({
        id: `ref_${uuidv4().substring(0, 12)}`,
        affiliateId: affiliate.id,
        programId: targetProgramId,
        linkId,  // may be null for default ambassador links
        referralCode,
        visitorEmail: safeEmail,
        visitorName: safeName,
        visitorPhone: visitorPhone || null,
        source: source || 'direct',
        notes: safeNotes,
        status: 'submitted',
        // Auto-map the ambassador's Admission Advisor onto the new reference
        admissionAdvisorId: (affiliate as any).admissionAdvisorId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      if (insertError) {
        console.error('[REFERRAL] Failed to insert referral:', insertError)
        return applyCors(
          NextResponse.json({ error: 'Failed to save your submission. Please try again.' }, { status: 500 }),
          origin, requestOrigin
        )
      }
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

    const returnedId = clickedReferral ? (clickedReferral as any).id : null

    // For new inserts we need to re-query to get the id (insert didn't capture it above)
    let finalId = returnedId
    if (!finalId) {
      const { data: newRef } = await supabase
        .from('Referral')
        .select('id')
        .eq('affiliateId', affiliate.id)
        .eq('visitorEmail', safeEmail)
        .order('createdAt', { ascending: false })
        .limit(1)
        .single()
      finalId = (newRef as any)?.id || null
    }

    // Send email notification to admin (after finalId is resolved so we can include referral number)
    try {
      const { sendEmail, newReferralAdminEmail } = await import('@/app/api/email/route')
      const affiliateName = (affiliate as any).User?.name || affiliate.referralCode || 'Ambassador'
      // Fetch resume URL if referral has one
      let resumeUrl: string | null = null
      if (finalId) {
        const { data: refData } = await supabase.from('Referral').select('resumeUrl').eq('id', finalId).single()
        if ((refData as any)?.resumeUrl) resumeUrl = (refData as any).resumeUrl
      }
      await sendEmail(newReferralAdminEmail(safeName, safeEmail, affiliateName, referralCode, finalId || undefined, safeNotes, resumeUrl))
    } catch (emailErr) {
      console.error('[REFERRAL] Email sending failed:', emailErr)
    }

    return applyCors(
      NextResponse.json({
        success: true,
        id: finalId,
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
