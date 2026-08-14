import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// List import/export history (most recent first)
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // optional: 'import' | 'export'
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    let query = supabase
      .from('ImportExportLog')
      .select('*', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .limit(limit)
    if (type === 'import' || type === 'export') query = query.eq('type', type)

    const { data: logs, error: dbError, count } = await query
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ logs: logs || [], total: count || 0 })
  } catch (error: any) {
    console.error('Import history list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Record an export event (exports are generated client-side, so the UI POSTs here)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const entity = ['referral', 'affiliate'].includes(body.entity) ? body.entity : 'referral'
    const total = Number.isFinite(body.total) ? body.total : 0
    const fileName: string | null = body.fileName || null

    const supabase = getServerClient()
    const { data: adminUser } = await supabase.from('User').select('name').eq('id', user.id).single()

    const logId = uuidv4()
    const { error: insErr } = await supabase.from('ImportExportLog').insert({
      id: logId,
      type: 'export',
      entity,
      userId: user.id,
      userName: adminUser?.name || 'Unknown',
      fileName,
      total,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      details: null,
      createdAt: new Date().toISOString(),
    })
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ success: true, id: logId })
  } catch (error: any) {
    console.error('Export log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
