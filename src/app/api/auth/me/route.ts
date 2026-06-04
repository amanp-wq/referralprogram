import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request)
    if (!user) {
      return NextResponse.json({ error }, { status: 401 })
    }

    let affiliate = null
    if (user.role === 'affiliate') {
      const supabase = getServerClient()
      const { data } = await supabase
        .from('Affiliate')
        .select('*')
        .eq('userId', user.id)
        .single()
      affiliate = data
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        company: user.company,
        status: user.status,
      },
      affiliate,
    })
  } catch (error: any) {
    console.error('Me error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
