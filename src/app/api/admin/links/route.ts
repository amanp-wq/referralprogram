import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { data: links, error: dbError } = await supabase
      .from('Link')
      .select('*, Affiliate!Link_affiliateId_fkey(id, referralCode, User!Affiliate_userId_fkey(name, email)), Program!Link_programId_fkey(id, name, slug)')
      .order('createdAt', { ascending: false })

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ links: links || [] })
  } catch (error: any) {
    console.error('Links list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
