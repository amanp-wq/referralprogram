import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

function formatPhone(value: string): string {
  const digits = (value || '').replace(/\D/g, '')
  const ten = digits.length > 10 ? digits.slice(-10) : digits
  if (ten.length < 10) return value // not enough digits, store as-is
  return `+1 (${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
}

// Last-10-digit normalized key for matching phones regardless of formatting.
function phoneKey(value: string | null | undefined): string {
  const digits = (value || '').replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

type ImportRow = {
  ambassadorEmail: string
  visitorName?: string
  visitorEmail?: string
  visitorPhone?: string
  status?: string
  notes?: string
}

const UPDATABLE_FIELDS = ['visitorName', 'visitorEmail', 'visitorPhone', 'status', 'notes']

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const referrals: ImportRow[] = body.referrals
    const mode: 'update' | 'fresh' = body.mode === 'fresh' ? 'fresh' : 'update'
    const matchBy: 'email' | 'phone' | 'email_phone' =
      ['email', 'phone', 'email_phone'].includes(body.matchBy) ? body.matchBy : 'email'
    // Which fields to overwrite when a matching lead is found (from field mapping).
    const updateFields: string[] = Array.isArray(body.updateFields) && body.updateFields.length
      ? body.updateFields.filter((f: string) => UPDATABLE_FIELDS.includes(f))
      : ['visitorName', 'visitorEmail', 'visitorPhone', 'status']
    const fileName: string | undefined = body.fileName

    if (!referrals || !Array.isArray(referrals) || referrals.length === 0) {
      return NextResponse.json({ error: 'No referrals data provided' }, { status: 400 })
    }

    const supabase = getServerClient()

    const { data: adminUser } = await supabase.from('User').select('name').eq('id', user.id).single()
    const adminName = adminUser?.name || 'Unknown'

    const errors: { row: number; message: string }[] = []
    const skippedDetails: { row: number; ambassadorEmail: string; reason: string }[] = []
    let created = 0
    let updated = 0
    let skipped = 0

    const validStatuses = ['submitted', 'pending', 'enrolled', 'not_enrolled', 'cancelled']

    const { data: programs } = await supabase.from('Program').select('id').eq('isActive', true).limit(1)
    const programId = programs && programs.length > 0 ? programs[0].id : null
    if (!programId) {
      return NextResponse.json({ error: 'No active program found. Please create a program first.' }, { status: 400 })
    }

    // For "update" mode, preload existing referrals once and build lookup maps
    // so we can match by email / phone in memory (fast, handles formatting).
    const byEmail = new Map<string, any>()
    const byPhone = new Map<string, any>()
    if (mode === 'update') {
      const { data: existing } = await supabase
        .from('Referral')
        .select('id, visitorEmail, visitorPhone, createdAt')
        .order('createdAt', { ascending: false })
      for (const r of existing || []) {
        const em = (r.visitorEmail || '').toLowerCase().trim()
        const ph = phoneKey(r.visitorPhone)
        // keep the most recent (first, since ordered desc) per key
        if (em && !byEmail.has(em)) byEmail.set(em, r)
        if (ph && ph.length === 10 && !byPhone.has(ph)) byPhone.set(ph, r)
      }
    }

    const findExisting = (row: ImportRow): any | null => {
      const em = (row.visitorEmail || '').toLowerCase().trim()
      const ph = phoneKey(row.visitorPhone)
      const emHit = em ? byEmail.get(em) : null
      const phHit = ph.length === 10 ? byPhone.get(ph) : null
      if (matchBy === 'email') return emHit || null
      if (matchBy === 'phone') return phHit || null
      // email_phone: require BOTH to point at the same record
      if (emHit && phHit && emHit.id === phHit.id) return emHit
      return null
    }

    for (let i = 0; i < referrals.length; i++) {
      const row = referrals[i]
      const rowNum = i + 1
      try {
        if (!row.ambassadorEmail) {
          errors.push({ row: rowNum, message: 'Ambassador email is required' })
          continue
        }

        const emailNorm = row.ambassadorEmail.trim()
        const { data: ambassadorUser } = await supabase
          .from('User').select('id').ilike('email', emailNorm).single()
        if (!ambassadorUser) {
          skipped++
          skippedDetails.push({ row: rowNum, ambassadorEmail: emailNorm, reason: 'No ambassador account found with this email' })
          continue
        }

        const { data: affiliate } = await supabase
          .from('Affiliate').select('id, referralCode, admissionAdvisorId').eq('userId', ambassadorUser.id).single()
        if (!affiliate) {
          skipped++
          skippedDetails.push({ row: rowNum, ambassadorEmail: emailNorm, reason: 'User exists but has no ambassador/affiliate profile' })
          continue
        }

        const status = validStatuses.includes(row.status || '') ? row.status : 'submitted'

        // UPDATE mode: try to match an existing lead and update selected fields
        if (mode === 'update') {
          const existing = findExisting(row)
          if (existing) {
            const patch: any = { updatedAt: new Date().toISOString() }
            if (updateFields.includes('visitorName') && row.visitorName != null) patch.visitorName = row.visitorName || null
            if (updateFields.includes('visitorEmail') && row.visitorEmail != null) patch.visitorEmail = row.visitorEmail || null
            if (updateFields.includes('visitorPhone') && row.visitorPhone != null) patch.visitorPhone = row.visitorPhone ? formatPhone(row.visitorPhone) : null
            if (updateFields.includes('status')) {
              patch.status = status
              if (status === 'enrolled') patch.convertedAt = new Date().toISOString()
            }
            if (updateFields.includes('notes') && row.notes != null) patch.notes = row.notes || null
            const { error: upErr } = await supabase.from('Referral').update(patch).eq('id', existing.id)
            if (upErr) { errors.push({ row: rowNum, message: `Failed to update: ${upErr.message}` }); continue }
            updated++
            continue
          }
          // no match → fall through and create a new record
        }

        // CREATE (fresh mode, or update mode with no match)
        const referralId = uuidv4()
        const { error: refError } = await supabase.from('Referral').insert({
          id: referralId,
          affiliateId: affiliate.id,
          programId,
          linkId: null,
          referralCode: affiliate.referralCode,
          visitorEmail: row.visitorEmail || null,
          visitorName: row.visitorName || null,
          visitorPhone: row.visitorPhone ? formatPhone(row.visitorPhone) : null,
          visitorIp: null,
          source: 'import',
          status,
          // Auto-map the ambassador's Admission Advisor onto the new reference
          admissionAdvisorId: affiliate.admissionAdvisorId || null,
          ...(row.notes ? { notes: row.notes } : {}),
          convertedAt: status === 'enrolled' ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        if (refError) { errors.push({ row: rowNum, message: `Failed to create referral: ${refError.message}` }); continue }
        created++
      } catch (err: any) {
        errors.push({ row: rowNum, message: err.message || 'Unknown error' })
      }
    }

    const failed = errors.length

    // Persist to Import/Export history
    const logId = uuidv4()
    await supabase.from('ImportExportLog').insert({
      id: logId,
      type: 'import',
      entity: 'referral',
      userId: user.id,
      userName: adminName,
      fileName: fileName || null,
      mode,
      matchBy,
      total: referrals.length,
      created,
      updated,
      skipped,
      failed,
      details: { skippedRows: skippedDetails, errors },
      createdAt: new Date().toISOString(),
    })

    // Activity log (kept for the existing activity feed)
    await supabase.from('Activity').insert({
      id: uuidv4(),
      userId: user.id,
      action: 'imported',
      entity: 'referral',
      entityId: null,
      details: `Admin ${adminName} imported referrals (${created} created, ${updated} updated, ${skipped} skipped)`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ created, updated, skipped, failed, errors, skippedDetails, logId })
  } catch (error: any) {
    console.error('Import referrals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
