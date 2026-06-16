// ============================================================
// Session Cleanup Endpoint
// ============================================================
// Called daily by Vercel Cron (see vercel.json).
// Deletes expired sessions from the Session table to prevent
// unbounded growth.
//
// Security: requires CRON_SECRET header to match env var.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET env var not set — refusing to run.')
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getServerClient()
    const now = new Date().toISOString()

    // Delete expired sessions
    const { error, count } = await supabase
      .from('Session')
      .delete({ count: 'exact' })
      .lt('expiresAt', now)

    if (error) {
      console.error('[CRON] Session cleanup error:', error)
      return NextResponse.json(
        { error: 'Cleanup failed', details: error.message },
        { status: 500 }
      )
    }

    console.log(`[CRON] Deleted ${count ?? 0} expired sessions.`)

    // Optional: log as an activity entry
    await supabase.from('Activity').insert({
      id: `act_cron_${Date.now()}`,
      action: 'session_cleanup',
      entity: 'session',
      entityId: null,
      details: `Cron job deleted ${count ?? 0} expired sessions`,
      createdAt: now,
    })

    return NextResponse.json({
      success: true,
      deleted: count ?? 0,
      ranAt: now,
    })
  } catch (error: any) {
    console.error('[CRON] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Support GET for easy manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}
