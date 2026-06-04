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

    // Find the link by code
    const { data: link, error: linkError } = await supabase
      .from('Link')
      .select('*, Affiliate!Link_affiliateId_fkey(id, userId), Program!Link_programId_fkey(id, name, slug, landingPageUrl)')
      .eq('code', code)
      .eq('isActive', true)
      .single()

    if (linkError || !link) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Increment click count
    await supabase
      .from('Link')
      .update({ clicks: link.clicks + 1, updatedAt: new Date().toISOString() })
      .eq('id', link.id)

    // Create referral record
    const referralId = `ref_${uuidv4().substring(0, 12)}`
    const visitorIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null

    await supabase.from('Referral').insert({
      id: referralId,
      affiliateId: link.affiliateId,
      programId: link.programId,
      linkId: link.id,
      referralCode: code,
      visitorIp,
      source,
      status: 'clicked',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Increment affiliate totalReferrals
    const { data: affiliate } = await supabase.from('Affiliate').select('totalReferrals').eq('id', link.affiliateId).single()
    if (affiliate) {
      await supabase.from('Affiliate').update({
        totalReferrals: affiliate.totalReferrals + 1,
        updatedAt: new Date().toISOString(),
      }).eq('id', link.affiliateId)
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

    // Redirect to the program landing page or home
    const redirectUrl = link.Program?.landingPageUrl || link.Program?.slug
      ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://referral.elevateme.pro'}/program/${link.Program.slug}`
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://referral.elevateme.pro'

    return NextResponse.redirect(redirectUrl)
  } catch (error: any) {
    console.error('Track error:', error)
    return NextResponse.redirect(new URL('/', request.url))
  }
}
