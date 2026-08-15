import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

// Global CRM search: find people by name / email / phone (and referral code)
// across Ambassadors (Affiliate + User) and References (Referral).
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    if (q.length < 2) return NextResponse.json({ ambassadors: [], references: [] })

    const supabase = getServerClient()
    const s = q.replace(/[%,()]/g, ' ')
    const like = `%${s}%`

    // --- Ambassadors ---
    // Match on the User (name/email/phone) and on the Affiliate referralCode.
    const [{ data: users }, { data: byCode }] = await Promise.all([
      supabase.from('User').select('id, name, email, phone').eq('role', 'affiliate')
        .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`).limit(10),
      supabase.from('Affiliate').select('id, userId, referralCode, User!Affiliate_userId_fkey(name, email, phone)')
        .ilike('referralCode', like).limit(10),
    ])

    const ambassadorMap = new Map<string, any>()
    if (users && users.length) {
      const userIds = users.map((u: any) => u.id)
      const { data: affs } = await supabase
        .from('Affiliate').select('id, userId, referralCode').in('userId', userIds)
      for (const a of affs || []) {
        const u = users.find((x: any) => x.id === (a as any).userId)
        ambassadorMap.set((a as any).id, {
          affiliateId: (a as any).id,
          name: u?.name || '',
          email: u?.email || '',
          phone: u?.phone || '',
          referralCode: (a as any).referralCode,
        })
      }
    }
    for (const a of byCode || []) {
      if (!ambassadorMap.has((a as any).id)) {
        const u = (a as any).User
        ambassadorMap.set((a as any).id, {
          affiliateId: (a as any).id,
          name: u?.name || '',
          email: u?.email || '',
          phone: u?.phone || '',
          referralCode: (a as any).referralCode,
        })
      }
    }

    // --- References ---
    const { data: refs } = await supabase
      .from('Referral')
      .select('id, visitorName, visitorEmail, visitorPhone, status, referralCode')
      .or(`visitorName.ilike.${like},visitorEmail.ilike.${like},visitorPhone.ilike.${like}`)
      .neq('status', 'opened')
      .order('createdAt', { ascending: false })
      .limit(10)

    return NextResponse.json({
      ambassadors: Array.from(ambassadorMap.values()).slice(0, 8),
      references: (refs || []).map((r: any) => ({
        id: r.id,
        name: r.visitorName || r.visitorEmail || 'Unknown',
        email: r.visitorEmail || '',
        phone: r.visitorPhone || '',
        status: r.status,
      })).slice(0, 8),
    })
  } catch (error: any) {
    console.error('Global search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
