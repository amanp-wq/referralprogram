import { NextRequest, NextResponse } from 'next/server'
import { destroySession, getTokenFromRequest, clearSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (token) {
      await destroySession(token)
    }

    const response = NextResponse.json({ success: true })
    response.headers.set('Set-Cookie', clearSessionCookie())
    return response
  } catch (error: any) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
