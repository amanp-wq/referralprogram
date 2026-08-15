import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// Manage dynamic dropdown options (e.g. Admission Advisors).
// category groups the options, e.g. 'admission_advisor'.

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'admission_advisor'
    const activeOnly = searchParams.get('activeOnly') === '1'

    let query = supabase.from('DropdownOption').select('*').eq('category', category)
    if (activeOnly) query = query.eq('isActive', true)
    const { data, error: dbError } = await query.order('sortOrder', { ascending: true }).order('label', { ascending: true })
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ options: data || [] })
  } catch (error: any) {
    console.error('Dropdown list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const category = (body.category || 'admission_advisor').trim()
    const label = (body.label || '').trim()
    if (!label) return NextResponse.json({ error: 'Label is required' }, { status: 400 })

    const supabase = getServerClient()
    const id = uuidv4()
    const { error: dbError } = await supabase.from('DropdownOption').insert({
      id, category, label, isActive: true, sortOrder: Number.isFinite(body.sortOrder) ? body.sortOrder : 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    if (dbError) {
      if (dbError.code === '23505') return NextResponse.json({ error: 'That option already exists' }, { status: 409 })
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    console.error('Dropdown create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const id = body.id
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const update: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (body.label !== undefined) {
      const label = String(body.label).trim()
      if (!label) return NextResponse.json({ error: 'Label cannot be empty' }, { status: 400 })
      update.label = label
    }
    if (body.isActive !== undefined) update.isActive = !!body.isActive
    if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder

    const supabase = getServerClient()
    const { error: dbError } = await supabase.from('DropdownOption').update(update).eq('id', id)
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Dropdown update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const supabase = getServerClient()
    // Unassign this option from any ambassadors/references first (no FK, so
    // clear stale references to keep data clean).
    await supabase.from('Affiliate').update({ admissionAdvisorId: null }).eq('admissionAdvisorId', id)
    await supabase.from('Referral').update({ admissionAdvisorId: null }).eq('admissionAdvisorId', id)

    const { error: dbError } = await supabase.from('DropdownOption').delete().eq('id', id)
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Dropdown delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
