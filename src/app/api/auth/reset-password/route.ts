import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (ip) {
      const allowed = checkRateLimit(`reset-password:${ip}`, 5, 60_000)
      if (!allowed) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
      }
    }

    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const supabase = getServerClient()

    const { data: user } = await supabase
      .from('User')
      .select('id, email, passwordResetToken, passwordResetExpiry')
      .eq('passwordResetToken', token)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
    }

    if (!user.passwordResetExpiry || new Date(user.passwordResetExpiry) < new Date()) {
      return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await supabase.from('User').update({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      updatedAt: new Date().toISOString(),
    }).eq('id', user.id)

    // Invalidate all existing sessions for security
    await supabase.from('Session').delete().eq('userId', user.id)

    return NextResponse.json({ success: true, message: 'Password reset successfully. You can now log in.' })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
