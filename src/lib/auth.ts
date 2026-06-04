import { getServerClient, DbUser, DbSession } from './supabase'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'elevateme_session'
const SESSION_DURATION_HOURS = 24

export async function authenticateUser(email: string, password: string): Promise<{ user: DbUser; token: string } | null> {
  const supabase = getServerClient()

  // Find user by email
  const { data: user, error } = await supabase
    .from('User')
    .select('*')
    .eq('email', email)
    .eq('status', 'active')
    .single()

  if (error || !user || !user.passwordHash) {
    return null
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    return null
  }

  // Create session
  const token = uuidv4()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString()

  const { error: sessionError } = await supabase
    .from('Session')
    .insert({
      id: `sess_${uuidv4().substring(0, 12)}`,
      userId: user.id,
      token,
      expiresAt,
    })

  if (sessionError) {
    console.error('Session creation error:', sessionError)
    return null
  }

  return { user, token }
}

export async function getSessionUser(token: string): Promise<DbUser | null> {
  const supabase = getServerClient()

  // Get session
  const { data: session, error: sessError } = await supabase
    .from('Session')
    .select('*')
    .eq('token', token)
    .single()

  if (sessError || !session) {
    return null
  }

  // Check expiry
  if (new Date(session.expiresAt) < new Date()) {
    // Delete expired session
    await supabase.from('Session').delete().eq('id', session.id)
    return null
  }

  // Get user
  const { data: user, error: userError } = await supabase
    .from('User')
    .select('*')
    .eq('id', session.userId)
    .single()

  if (userError || !user) {
    return null
  }

  return user
}

export async function destroySession(token: string): Promise<void> {
  const supabase = getServerClient()
  await supabase.from('Session').delete().eq('token', token)
}

export function getTokenFromRequest(request: Request): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check cookie
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim())
    const sessionCookie = cookies.find(c => c.startsWith(`${SESSION_COOKIE}=`))
    if (sessionCookie) {
      return sessionCookie.split('=')[1]
    }
  }

  return null
}

export async function requireAuth(request: Request): Promise<{ user: DbUser; error?: never } | { user: null; error: string }> {
  const token = getTokenFromRequest(request)
  if (!token) {
    return { user: null, error: 'Not authenticated' }
  }

  const user = await getSessionUser(token)
  if (!user) {
    return { user: null, error: 'Invalid or expired session' }
  }

  return { user }
}

export async function requireAdmin(request: Request): Promise<{ user: DbUser; error?: never } | { user: null; error: string }> {
  const result = await requireAuth(request)
  if (result.user && result.user.role !== 'admin') {
    return { user: null, error: 'Admin access required' }
  }
  return result
}

export async function requireAffiliate(request: Request): Promise<{ user: DbUser; affiliate: any; error?: never } | { user: null; affiliate: null; error: string }> {
  const result = await requireAuth(request)
  if (!result.user) {
    return { user: null, affiliate: null, error: result.error }
  }

  if (result.user.role !== 'affiliate') {
    return { user: null, affiliate: null, error: 'Affiliate access required' }
  }

  const supabase = getServerClient()
  const { data: affiliate, error } = await supabase
    .from('Affiliate')
    .select('*')
    .eq('userId', result.user.id)
    .single()

  if (error || !affiliate) {
    return { user: null, affiliate: null, error: 'Affiliate profile not found' }
  }

  return { user: result.user, affiliate }
}

export function setSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DURATION_HOURS * 3600}`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}
