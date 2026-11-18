import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

const ALLOWED_LIMITS = [25, 50, 100, 200]

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = (searchParams.get('search') || '').trim()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limitRaw = parseInt(searchParams.get('limit') || '25')
    const limit = ALLOWED_LIMITS.includes(limitRaw) ? limitRaw : 25

    // Shared filter logic for both the list query and its total count
    const applyFilters = (q: any) => {
      if (status) {
        q = q.eq('status', status)
      } else {
        // Default: exclude pure "opened" (link clicks that never submitted a form)
        q = q.neq('status', 'opened')
      }
      if (search) {
        // Sanitize PostgREST or() special chars, then match reference fields
        const s = search.replace(/[%,()]/g, ' ')
        q = q.or(
          `visitorName.ilike.%${s}%,visitorEmail.ilike.%${s}%,visitorPhone.ilike.%${s}%,referralCode.ilike.%${s}%`
        )
      }
      return q
    }

    const query = applyFilters(
      supabase
        .from('Referral')
        .select(
          '*, Affiliate!Referral_affiliateId_fkey(id, referralCode, userId, User!Affiliate_userId_fkey(name, email)), Program!Referral_programId_fkey(id, name, slug)',
          { count: 'exact' }
        )
    )
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    const { data: referrals, error: dbError, count } = await query
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // Aggregate status counts across the WHOLE dataset (independent of the
    // current page / search) so the KPI tiles show real totals, not just
    // whatever is on the current page.
    const countFor = async (st: string | null) => {
      let q = supabase.from('Referral').select('*', { count: 'exact', head: true })
      if (st) q = q.eq('status', st)
      else q = q.neq('status', 'opened')
      const { count: c } = await q
      return c || 0
    }
    const [all, opened, submitted, pending, enrolled, notEnrolled, cancelled] = await Promise.all([
      countFor(null),
      countFor('opened'),
      countFor('submitted'),
      countFor('pending'),
      countFor('enrolled'),
      countFor('not_enrolled'),
      countFor('cancelled'),
    ])

    return NextResponse.json({
      referrals: referrals || [],
      total: count || 0, // total matching the current status/search filter (for pagination)
      page,
      limit,
      counts: { all, opened, submitted, pending, enrolled, notEnrolled, cancelled },
    })
  } catch (error: any) {
    console.error('Referrals list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Normalize a phone to its last 10 digits so "+1 (614) 555-1234" and
// "16145551234" compare equal.
function phoneKey(value: string | null | undefined): string {
  const digits = (value || '').replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

function formatPhone(value: string): string {
  const ten = phoneKey(value)
  if (ten.length < 10) return value // not enough digits, store as-is
  return `+1 (${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
}

// Manually add one reference for an ambassador (admin "Add Referral").
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const affiliateId = String(body.affiliateId || '').trim()
    const visitorName = String(body.visitorName || '').trim()
    const visitorEmail = String(body.visitorEmail || '').trim().toLowerCase()
    const visitorPhoneRaw = String(body.visitorPhone || '').trim()
    const notes = String(body.notes || '').trim()
    const force = body.force === true

    const validStatuses = ['submitted', 'pending', 'enrolled', 'not_enrolled', 'cancelled']
    const status = validStatuses.includes(body.status) ? body.status : 'submitted'

    if (!affiliateId) return NextResponse.json({ error: 'Please choose an ambassador' }, { status: 400 })
    if (!visitorName) return NextResponse.json({ error: 'Student name is required' }, { status: 400 })
    if (!visitorEmail && !visitorPhoneRaw) return NextResponse.json({ error: 'Add the student email or phone' }, { status: 400 })
    if (visitorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail)) return NextResponse.json({ error: 'Student email looks invalid' }, { status: 400 })

    const supabase = getServerClient()

    const { data: affiliate } = await supabase
      .from('Affiliate')
      .select('id, referralCode, admissionAdvisorId, User!Affiliate_userId_fkey(name)')
      .eq('id', affiliateId)
      .single()
    if (!affiliate) return NextResponse.json({ error: 'Ambassador not found' }, { status: 404 })

    // Duplicate check: same student email or phone already referred
    // (link-visit "opened" rows have no details, so they never match).
    if (!force) {
      const { data: existing } = await supabase
        .from('Referral')
        .select('id, visitorName, visitorEmail, visitorPhone, status, Affiliate!Referral_affiliateId_fkey(User!Affiliate_userId_fkey(name))')
        .neq('status', 'opened')
      const ph = phoneKey(visitorPhoneRaw)
      const dup = (existing || []).find((r: any) =>
        (visitorEmail && (r.visitorEmail || '').toLowerCase().trim() === visitorEmail) ||
        (ph.length === 10 && phoneKey(r.visitorPhone) === ph))
      if (dup) {
        return NextResponse.json({
          error: 'This student has already been referred',
          duplicate: {
            id: (dup as any).id,
            visitorName: (dup as any).visitorName,
            status: (dup as any).status,
            ambassadorName: (dup as any).Affiliate?.User?.name || 'Unknown',
          },
        }, { status: 409 })
      }
    }

    const { data: programs } = await supabase.from('Program').select('id').eq('isActive', true).order('createdAt', { ascending: false }).limit(1)
    const programId = programs && programs.length > 0 ? programs[0].id : null
    if (!programId) return NextResponse.json({ error: 'No active program found. Please create a program first.' }, { status: 400 })

    const now = new Date().toISOString()
    const referralId = uuidv4()
    const { error: refError } = await supabase.from('Referral').insert({
      id: referralId,
      affiliateId: affiliate.id,
      programId,
      linkId: null,
      referralCode: affiliate.referralCode,
      visitorName,
      visitorEmail: visitorEmail || null,
      visitorPhone: visitorPhoneRaw ? formatPhone(visitorPhoneRaw) : null,
      visitorIp: null,
      source: 'manual',
      status,
      // Auto-map the ambassador's Admission Advisor onto the new reference
      admissionAdvisorId: (affiliate as any).admissionAdvisorId || null,
      ...(notes ? { notes } : {}),
      convertedAt: status === 'enrolled' ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    if (refError) return NextResponse.json({ error: refError.message }, { status: 500 })

    // Same as changing a reference to Enrolled: start a $0 pending bonus
    if (status === 'enrolled') {
      await supabase.from('Commission').insert({
        id: uuidv4(),
        affiliateId: affiliate.id,
        programId,
        referralId,
        amount: 0,
        rate: 0,
        type: 'referral_bonus',
        status: 'pending',
        description: `Auto-created for enrolled referral: ${visitorName}`,
        createdAt: now,
        updatedAt: now,
      })
    }

    const { data: adminUser } = await supabase.from('User').select('name').eq('id', user.id).single()
    await supabase.from('Activity').insert({
      id: uuidv4(),
      userId: user.id,
      action: 'created',
      entity: 'referral',
      entityId: referralId,
      details: `Admin ${adminUser?.name || 'Unknown'} manually added referral ${visitorName} for ambassador ${(affiliate as any).User?.name || affiliate.referralCode} (${status})`,
      createdAt: now,
    })

    return NextResponse.json({ message: 'Referral added', id: referralId }, { status: 201 })
  } catch (error: any) {
    console.error('Add referral error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
