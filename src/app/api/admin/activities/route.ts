import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const { data: activities, error: dbError } = await supabase
      .from('Activity')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ activities: activities || [] })
  } catch (error: any) {
    console.error('Activities error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
