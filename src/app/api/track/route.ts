import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const source = searchParams.get('source') || 'direct'

    if (!code) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const supabase = getServerClient()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://referral.elevateme.pro'

    // Find the link by code
    const { data: link, error: linkError } = await supabase
      .from('Link')
      .select('*, Affiliate!Link_affiliateId_fkey(id, userId, referralCode, User!Affiliate_userId_fkey(name)), Program!Link_programId_fkey(id, name, slug, landingPageUrl, cookieDuration)')
      .eq('code', code)
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
        .eq('referralCode', code)
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
      referralCode: code,
      visitorIp,
      source,
      status: 'clicked',
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
      details: `Referral click tracked via code ${code}`,
      createdAt: new Date().toISOString(),
    })

    // Redirect to the enrollment form with referral info
    const enrollUrl = new URL('/enroll', baseUrl)
    enrollUrl.searchParams.set('code', code)
    enrollUrl.searchParams.set('source', source)
    enrollUrl.searchParams.set('ref', affiliateName)

    const response = NextResponse.redirect(enrollUrl.toString())

    // Set referral cookie for long-term attribution (30 days default)
    const cookieDuration = cookieDays * 24 * 60 * 60 // days to seconds
    response.headers.set('Set-Cookie', `ref_code=${code}; Path=/; Max-Age=${cookieDuration}; SameSite=Lax; Secure`)

    return response
  } catch (error: any) {
    console.error('Track error:', error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}
