import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { data: settings, error: dbError } = await supabase.from('Setting').select('*')

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // Convert to key-value object
    const settingsMap: Record<string, string> = {}
    ;(settings || []).forEach((s: any) => {
      settingsMap[s.key] = s.value
    })

    return NextResponse.json({ settings: settingsMap })
  } catch (error: any) {
    console.error('Settings get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const { settings } = body // { key: value, ... }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 })
    }

    const supabase = getServerClient()

    // Upsert each setting
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from('Setting').upsert({
        id: `set_${key.substring(0, 20)}`,
        key,
        value: value as string,
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' })
    }

    return NextResponse.json({ message: 'Settings updated successfully' })
  } catch (error: any) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
