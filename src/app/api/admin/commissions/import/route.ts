import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

type BonusRow = {
  id?: string
  ambassadorEmail?: string
  amount?: string
  type?: string
  status?: string
  description?: string
}

const VALID_STATUSES = ['pending', 'approved', 'released', 'paid', 'failed', 'cancelled', 'refunded']
const VALID_TYPES = ['referral_bonus', 'helping_bonus', 'adjustment', 'bonus', 'referral']
const UPDATABLE = ['amount', 'type', 'status', 'description']

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const rows: BonusRow[] = body.commissions
    const updateFields: string[] = Array.isArray(body.updateFields) && body.updateFields.length
      ? body.updateFields.filter((f: string) => UPDATABLE.includes(f))
      : ['amount', 'type', 'status', 'description']
    const fileName: string | undefined = body.fileName

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No bonus data provided' }, { status: 400 })
    }

    const supabase = getServerClient()
    const { data: adminUser } = await supabase.from('User').select('name').eq('id', user.id).single()
    const adminName = adminUser?.name || 'Unknown'

    const { data: programs } = await supabase.from('Program').select('id').eq('isActive', true).limit(1)
    const programId = programs && programs.length > 0 ? programs[0].id : null

    const errors: { row: number; message: string }[] = []
    const skippedDetails: { row: number; ambassadorEmail: string; reason: string }[] = []
    let created = 0
    let updated = 0
    let skipped = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1
      try {
        const id = (row.id || '').trim()
        const amountNum = row.amount != null && row.amount !== '' ? parseFloat(String(row.amount)) : NaN
        const type = row.type && VALID_TYPES.includes(row.type.trim()) ? row.type.trim() : undefined
        const status = row.status && VALID_STATUSES.includes(row.status.trim()) ? row.status.trim() : undefined

        // UPDATE by Bonus ID
        if (id) {
          const { data: existing } = await supabase.from('Commission').select('id').eq('id', id).single()
          if (!existing) {
            skipped++
            skippedDetails.push({ row: rowNum, ambassadorEmail: row.ambassadorEmail || '', reason: `Bonus ID not found: ${id}` })
            continue
          }
          const patch: any = { updatedAt: new Date().toISOString() }
          if (updateFields.includes('amount') && !Number.isNaN(amountNum)) patch.amount = amountNum
          if (updateFields.includes('type') && type) patch.type = type
          if (updateFields.includes('status') && status) patch.status = status
          if (updateFields.includes('description') && row.description != null) patch.description = row.description || null
          const { error: upErr } = await supabase.from('Commission').update(patch).eq('id', id)
          if (upErr) { errors.push({ row: rowNum, message: `Update failed: ${upErr.message}` }); continue }
          updated++
          continue
        }

        // CREATE (no Bonus ID) — needs an ambassador + amount
        const email = (row.ambassadorEmail || '').trim()
        if (!email) { skipped++; skippedDetails.push({ row: rowNum, ambassadorEmail: '', reason: 'No Bonus ID and no Ambassador Email — cannot create' }); continue }
        if (Number.isNaN(amountNum)) { skipped++; skippedDetails.push({ row: rowNum, ambassadorEmail: email, reason: 'Missing/invalid amount for new bonus' }); continue }
        if (!programId) { skipped++; skippedDetails.push({ row: rowNum, ambassadorEmail: email, reason: 'No active program to attach the bonus to' }); continue }

        const { data: ambUser } = await supabase.from('User').select('id').ilike('email', email).single()
        if (!ambUser) { skipped++; skippedDetails.push({ row: rowNum, ambassadorEmail: email, reason: 'No ambassador account with this email' }); continue }
        const { data: affiliate } = await supabase.from('Affiliate').select('id').eq('userId', ambUser.id).single()
        if (!affiliate) { skipped++; skippedDetails.push({ row: rowNum, ambassadorEmail: email, reason: 'User has no ambassador profile' }); continue }

        const { error: insErr } = await supabase.from('Commission').insert({
          id: uuidv4(),
          affiliateId: affiliate.id,
          programId,
          referralId: null,
          amount: amountNum,
          rate: 0,
          type: type || 'referral_bonus',
          status: status || 'pending',
          description: row.description || 'Imported bonus',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        if (insErr) { errors.push({ row: rowNum, message: `Create failed: ${insErr.message}` }); continue }
        created++
      } catch (err: any) {
        errors.push({ row: rowNum, message: err.message || 'Unknown error' })
      }
    }

    const failed = errors.length
    const logId = uuidv4()
    await supabase.from('ImportExportLog').insert({
      id: logId, type: 'import', entity: 'commission', userId: user.id, userName: adminName,
      fileName: fileName || null, mode: 'update', matchBy: 'bonus_id',
      total: rows.length, created, updated, skipped, failed,
      details: { skippedRows: skippedDetails, errors }, createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ created, updated, skipped, failed, errors, skippedDetails, logId })
  } catch (error: any) {
    console.error('Import bonuses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
