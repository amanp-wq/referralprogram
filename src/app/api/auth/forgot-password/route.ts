import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (ip) {
      const allowed = checkRateLimit(`forgot-password:${ip}`, 5, 60_000)
      if (!allowed) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
      }
    }

    const body = await request.json()
    const email = body?.email?.toLowerCase().trim()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = getServerClient()

    const { data: user } = await supabase
      .from('User')
      .select('id, email, name')
      .eq('email', email)
      .eq('status', 'active')
      .single()

    // Always return success to avoid email enumeration
    if (!user) {
      return NextResponse.json({ success: true, message: 'If that email exists, a reset link has been sent.' })
    }

    const resetToken = uuidv4()
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

    await supabase.from('User').update({
      passwordResetToken: resetToken,
      passwordResetExpiry: expiry,
      updatedAt: new Date().toISOString(),
    }).eq('id', user.id)

    const baseUrl = process.env.APP_URL || 'https://referral.elevateme.pro'
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

    try {
      const { sendEmail } = await import('@/app/api/email/route')
      await sendEmail({
        to: user.email,
        subject: 'Reset your ElevateMe password',
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #C44838; font-size: 28px; margin: 0;">ElevateMe</h1>
            </div>
            <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
              <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Hi ${user.name},</h2>
              <p style="color: #475569; line-height: 1.6;">We received a request to reset your password. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="background: #C44838; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #94a3b8; font-size: 13px;">If you didn't request this, you can safely ignore this email. Your password will not change.</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">&copy; 2026 ElevateMe, Inc. All rights reserved.</p>
          </div>
        `,
      })
    } catch (emailErr) {
      console.error('[FORGOT-PASSWORD] Email failed:', emailErr)
    }

    return NextResponse.json({ success: true, message: 'If that email exists, a reset link has been sent.' })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
