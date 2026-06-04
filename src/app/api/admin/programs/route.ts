import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')

    let query = supabase.from('Program').select('*').order('createdAt', { ascending: false })
    if (isActive !== null) query = query.eq('isActive', isActive === 'true')

    const { data: programs, error: dbError } = await query

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // Get affiliate count per program
    const programsWithCount = await Promise.all(
      (programs || []).map(async (p: any) => {
        const { count } = await supabase
          .from('Link')
          .select('id', { count: 'exact', head: true })
          .eq('programId', p.id)
        return { ...p, affiliateCount: count || 0 }
      })
    )

    return NextResponse.json({ programs: programsWithCount })
  } catch (error: any) {
    console.error('Programs list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const { name, slug, description, commissionType, commissionValue, minPayout, cookieDuration, landingPageUrl, terms } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    const supabase = getServerClient()
    const id = `prg_${uuidv4().substring(0, 12)}`

    const { error: dbError } = await supabase.from('Program').insert({
      id,
      name,
      slug,
      description: description || null,
      commissionType: commissionType || 'percentage',
      commissionValue: commissionValue || 10,
      minPayout: minPayout || 50,
      cookieDuration: cookieDuration || 30,
      isActive: true,
      landingPageUrl: landingPageUrl || null,
      terms: terms || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // Log activity
    await supabase.from('Activity').insert({
      id: `act_${uuidv4().substring(0, 12)}`,
      userId: user.id,
      action: 'created_program',
      entity: 'program',
      entityId: id,
      details: `Created program: ${name}`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ id, message: 'Program created successfully' }, { status: 201 })
  } catch (error: any) {
    console.error('Create program error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'Program ID is required' }, { status: 400 })

    const supabase = getServerClient()
    updates.updatedAt = new Date().toISOString()

    const { error: dbError } = await supabase.from('Program').update(updates).eq('id', id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ message: 'Program updated successfully' })
  } catch (error: any) {
    console.error('Update program error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
