import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { data: links, error: dbError } = await supabase
      .from('Link')
      .select('*, Affiliate!Link_affiliateId_fkey(id, referralCode, User!Affiliate_userId_fkey(name, email)), Program!Link_programId_fkey(id, name, slug)')
      .order('createdAt', { ascending: false })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ links: links || [] })
  } catch (error: any) {
    console.error('Links list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const { affiliateId, programId, label } = body

    if (!affiliateId || !programId) {
      return NextResponse.json({ error: 'Affiliate ID and Program ID are required' }, { status: 400 })
    }

    const supabase = getServerClient()

    // Get affiliate
    const { data: affiliate, error: affError } = await supabase
      .from('Affiliate')
      .select('id, referralCode, status')
      .eq('id', affiliateId)
      .single()

    if (affError || !affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }

    // Get program
    const { data: program, error: progError } = await supabase
      .from('Program')
      .select('id, name, slug, isActive')
      .eq('id', programId)
      .single()

    if (progError || !program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    if (!program.isActive) {
      return NextResponse.json({ error: 'Program is not active' }, { status: 400 })
    }

    // Generate unique link code
    const code = `${affiliate.referralCode}-${uuidv4().substring(0, 8)}`
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://referral.elevateme.pro'
    const url = `${baseUrl}/ref/${code}`

    // Create link
    const linkId = `lnk_${uuidv4().substring(0, 12)}`
    const { error: dbError } = await supabase.from('Link').insert({
      id: linkId,
      affiliateId: affiliate.id,
      programId,
      code,
      url,
      clicks: 0,
      conversions: 0,
      isActive: true,
      label: label || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // Log activity
    await supabase.from('Activity').insert({
      id: `act_${uuidv4().substring(0, 12)}`,
      userId: user.id,
      action: 'created_link',
      entity: 'link',
      entityId: linkId,
      details: `Admin created tracking link for affiliate ${affiliate.referralCode}`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ id: linkId, code, url, message: 'Link created successfully' }, { status: 201 })
  } catch (error: any) {
    console.error('Admin create link error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
