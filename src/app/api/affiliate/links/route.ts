import { NextRequest, NextResponse } from 'next/server'
import { requireAffiliate } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { data: links, error: dbError } = await supabase
      .from('Link')
      .select('*, Program!Link_programId_fkey(id, name, slug)')
      .eq('affiliateId', affiliate.id)
      .order('createdAt', { ascending: false })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ links: links || [] })
  } catch (error: any) {
    console.error('Affiliate links error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const { programId, label } = body

    if (!programId) return NextResponse.json({ error: 'Program ID is required' }, { status: 400 })

    const supabase = getServerClient()

    // Get program
    const { data: program } = await supabase.from('Program').select('*').eq('id', programId).eq('isActive', true).single()
    if (!program) return NextResponse.json({ error: 'Program not found or inactive' }, { status: 404 })

    // Generate unique link code
    const code = `${affiliate.referralCode}-${uuidv4().substring(0, 8)}`
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://referral.elevateme.pro'
    const url = `${baseUrl}/referral?code=${code}`

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

    return NextResponse.json({ id: linkId, code, url, message: 'Link created successfully' }, { status: 201 })
  } catch (error: any) {
    console.error('Create affiliate link error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
