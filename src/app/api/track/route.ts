import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { validateBody, referralCodeSchema } from '@/lib/validation'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { applyCors, handlePreflight } from '@/lib/cors'
import { v4 as uuidv4 } from 'uuid'

// Handle CORS preflight for cross-origin tracking requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const requestOrigin = new URL(request.url).origin
  return handlePreflight(origin, requestOrigin)
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const requestOrigin = new URL(request.url).origin
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const source = searchParams.get('source') || 'direct'

    if (!code) {
      return applyCors(
        NextResponse.redirect(new URL('/', request.url)),
        origin,
        requestOrigin
      )
    }

    // Validate the referral code format (defensive)
    const codeCheck = validateBody(referralCodeSchema, code)
    if (!codeCheck.success) {
      return applyCors(
        NextResponse.redirect(new URL('/?error=invalid_code', request.url)),
        origin,
        requestOrigin
      )
    }
    const safeCode = codeCheck.data

    // Validate source
    if (!['social', 'email', 'website', 'direct'].includes(source)) {
      return applyCors(
        NextResponse.redirect(new URL(`/?error=invalid_source`, request.url)),
        origin,
        requestOrigin
      )
    }

    // Rate limit: 30 clicks per IP per minute (anti-fraud)
    const ip = getClientIp(request)
    if (ip) {
      const allowed = checkRateLimit(`track:${ip}`, 30, 60_000)
      if (!allowed) {
        return applyCors(
          NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429 }
          ),
          origin,
          requestOrigin
        )
      }
    }

    const supabase = getServerClient()

    // Find the link by code
    const { data: link, error: linkError } = await supabase
      .from('Link')
      .select('*, Affiliate!Link_affiliateId_fkey(id, userId, referralCode, User!Affiliate_userId_fkey(name)), Program!Link_programId_fkey(id, name, slug, landingPageUrl, cookieDuration)')
      .eq('code', safeCode)
      .eq('isActive', true)
      .single()

    // Determine affiliate info for the enrollment form
    let affiliateName = ''
    let affiliateId = ''
    let programId: string | null = null
    let linkId: string | null = null
    let cookieDays = 30

    if (!linkError && link) {
      affiliateId = link.affiliateId
      affiliateName = (link.Affiliate as any)?.User?.name || (link.Affiliate as any)?.referralCode || 'an ElevateMe Ambassador'
      programId = link.programId
      linkId = link.id
      cookieDays = link.Program?.cookieDuration || 30

      // Increment click count
      await supabase
        .from('Link')
        .update({ clicks: link.clicks + 1, updatedAt: new Date().toISOString() })
        .eq('id', link.id)
    } else {
      // Try finding by affiliate referralCode directly (for /ref/ELEVATE10 style links)
      const { data: affiliate } = await supabase
        .from('Affiliate')
        .select('id, userId, referralCode, status, User!Affiliate_userId_fkey(name)')
        .eq('referralCode', safeCode)
        .eq('status', 'active')
        .single()

      if (!affiliate) {
        return NextResponse.redirect(new URL('/', request.url))
      }

      affiliateId = affiliate.id
      affiliateName = (affiliate as any).User?.name || affiliate.referralCode || 'an ElevateMe Ambassador'

      // Increment click count on any active link for this affiliate
      const { data: affiliateLinks } = await supabase
        .from('Link')
        .select('id, clicks, programId')
        .eq('affiliateId', affiliate.id)
        .eq('isActive', true)
        .limit(1)

      const firstLink = affiliateLinks?.[0]
      if (firstLink) {
        programId = firstLink.programId
        linkId = firstLink.id
        await supabase
          .from('Link')
          .update({ clicks: firstLink.clicks + 1, updatedAt: new Date().toISOString() })
          .eq('id', firstLink.id)
      }
    }

    // Create referral record for the click
    const referralId = `ref_${uuidv4().substring(0, 12)}`
    const visitorIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null

    await supabase.from('Referral').insert({
      id: referralId,
      affiliateId,
      programId,
      linkId,
      referralCode: safeCode,
      visitorIp,
      source,
      status: 'opened',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Increment affiliate totalReferrals
    const { data: affData } = await supabase.from('Affiliate').select('totalReferrals').eq('id', affiliateId).single()
    if (affData) {
      await supabase.from('Affiliate').update({
        totalReferrals: affData.totalReferrals + 1,
        updatedAt: new Date().toISOString(),
      }).eq('id', affiliateId)
    }

    // Log activity
    await supabase.from('Activity').insert({
      id: `act_${uuidv4().substring(0, 12)}`,
      action: 'referral_click',
      entity: 'referral',
      entityId: referralId,
      details: `Referral click tracked via code ${safeCode}`,
      createdAt: new Date().toISOString(),
    })

    // Redirect to the enrollment form with referral info
    // Use request origin so it works regardless of domain (Vercel preview, custom domain, etc.)
    const requestOrigin = new URL(request.url).origin
    const enrollUrl = new URL('/enroll', requestOrigin)
    enrollUrl.searchParams.set('code', safeCode)
    enrollUrl.searchParams.set('source', source)
    enrollUrl.searchParams.set('ref', affiliateName)

    const response = NextResponse.redirect(enrollUrl.toString())

    // Set referral cookie for long-term attribution (30 days default)
    const cookieDuration = cookieDays * 24 * 60 * 60 // days to seconds
    response.headers.set('Set-Cookie', `ref_code=${safeCode}; Path=/; Max-Age=${cookieDuration}; SameSite=Lax; HttpOnly`)

    return applyCors(response, origin, requestOrigin)
  } catch (error: any) {
    console.error('Track error:', error)
    // On error, still redirect to enroll so visitor can fill the form
    const requestOrigin = new URL(request.url).origin
    const fallbackUrl = new URL('/enroll', requestOrigin)
    if (safeCode) fallbackUrl.searchParams.set('code', safeCode)
    return applyCors(
      NextResponse.redirect(fallbackUrl.toString()),
      request.headers.get('origin'),
      requestOrigin
    )
  }
}
