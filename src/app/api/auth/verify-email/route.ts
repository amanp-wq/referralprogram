// ============================================================
// Email Verification Endpoint
// ============================================================
// GET /api/auth/verify-email?token=<token>
//
// Called when the user clicks the "Verify Email" button in the
// welcome email. Marks the user's email as verified and clears
// the verification token. Redirects to the login page with a
// success/failure indicator.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import { validateBody, uuidSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return redirectToLogin(request, 'error', 'Missing verification token.')
  }

  // Validate token format (must be a UUID)
  const tokenCheck = validateBody(uuidSchema, token)
  if (!tokenCheck.success) {
    return redirectToLogin(request, 'error', 'Invalid verification token format.')
  }

  const supabase = getServerClient()
  const now = new Date().toISOString()

  // Find the user by verification token
  const { data: user, error } = await supabase
    .from('User')
    .select('id, email, emailVerificationExpiry, emailVerified')
    .eq('emailVerificationToken', token)
    .single()

  if (error || !user) {
    return redirectToLogin(request, 'error', 'Verification token not found or already used.')
  }

  if (user.emailVerified) {
    return redirectToLogin(request, 'success', 'Email already verified. You can log in.')
  }

  if (user.emailVerificationExpiry && new Date(user.emailVerificationExpiry) < new Date(now)) {
    return redirectToLogin(request, 'error', 'Verification link expired. Please request a new one.')
  }

  // Mark as verified and clear the token
  const { error: updateError } = await supabase
    .from('User')
    .update({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
      updatedAt: now,
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('[VERIFY] Failed to update user:', updateError)
    return redirectToLogin(request, 'error', 'Failed to verify email. Please try again.')
  }

  // Log activity
  await supabase.from('Activity').insert({
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: user.id,
    action: 'email_verified',
    entity: 'user',
    entityId: user.id,
    details: `Email verified for ${user.email}`,
    createdAt: now,
  })

  return redirectToLogin(request, 'success', 'Email verified successfully! You can now log in.')
}

function redirectToLogin(request: NextRequest, status: 'success' | 'error', message: string) {
  const origin = new URL(request.url).origin
  const url = new URL('/', origin)
  url.searchParams.set('verified', status)
  url.searchParams.set('msg', message)
  return NextResponse.redirect(url.toString())
}
