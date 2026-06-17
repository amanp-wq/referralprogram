import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, setSessionCookie } from '@/lib/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 login attempts per IP per minute (brute-force protection)
    const ip = getClientIp(request)
    if (ip) {
      const allowed = checkRateLimit(`login:${ip}`, 10, 60_000)
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many login attempts. Please try again later.' },
          { status: 429 }
        )
      }
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const result = await authenticateUser(email, password)

    if (!result) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const response = NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        avatarUrl: result.user.avatarUrl,
      },
      token: result.token,
    })

    // Set session cookie
    response.headers.set('Set-Cookie', setSessionCookie(result.token))

    return response
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
