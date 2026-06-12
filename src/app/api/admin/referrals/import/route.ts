import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) {
      return NextResponse.json({ error }, { status: 401 })
    }

    const body = await request.json()
    const { referrals } = body as {
      referrals: {
        ambassadorEmail: string
        visitorName?: string
        visitorEmail?: string
        visitorPhone?: string
        source?: string
        status?: string
      }[]
    }

    if (!referrals || !Array.isArray(referrals) || referrals.length === 0) {
      return NextResponse.json({ error: 'No referrals data provided' }, { status: 400 })
    }

    const supabase = getServerClient()

    // Get admin name for activity logging
    const { data: adminUser } = await supabase
      .from('User')
      .select('name')
      .eq('id', user.id)
      .single()

    const adminName = adminUser?.name || 'Unknown'
    const errors: { row: number; message: string }[] = []
    let created = 0

    const validStatuses = ['submitted', 'pending', 'enrolled', 'not_enrolled']

    // Get first active program
    const { data: programs } = await supabase
      .from('Program')
      .select('id')
      .eq('isActive', true)
      .limit(1)

    const programId = programs && programs.length > 0 ? programs[0].id : null

    if (!programId) {
      return NextResponse.json({ error: 'No active program found. Please create a program first.' }, { status: 400 })
    }

    for (let i = 0; i < referrals.length; i++) {
      const row = referrals[i]
      const rowNum = i + 1

      try {
        if (!row.ambassadorEmail) {
          errors.push({ row: rowNum, message: 'Ambassador email is required' })
          continue
        }

        // Look up affiliate by ambassadorEmail
        const { data: ambassadorUser } = await supabase
          .from('User')
          .select('id')
          .eq('email', row.ambassadorEmail)
          .single()

        if (!ambassadorUser) {
          errors.push({ row: rowNum, message: `No user found with email ${row.ambassadorEmail}` })
          continue
        }

        const { data: affiliate } = await supabase
          .from('Affiliate')
          .select('id, referralCode')
          .eq('userId', ambassadorUser.id)
          .single()

        if (!affiliate) {
          errors.push({ row: rowNum, message: `No affiliate profile found for ${row.ambassadorEmail}` })
          continue
        }

        const status = validStatuses.includes(row.status || '') ? row.status : 'submitted'

        // Create referral record
        const referralId = uuidv4()
        const { error: refError } = await supabase.from('Referral').insert({
          id: referralId,
          affiliateId: affiliate.id,
          programId,
          linkId: null,
          referralCode: affiliate.referralCode,
          visitorEmail: row.visitorEmail || null,
          visitorName: row.visitorName || null,
          visitorIp: null,
          source: row.source || 'import',
          status,
          convertedAt: (status === 'enrolled') ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        if (refError) {
          errors.push({ row: rowNum, message: `Failed to create referral: ${refError.message}` })
          continue
        }

        created++
      } catch (err: any) {
        errors.push({ row: rowNum, message: err.message || 'Unknown error' })
      }
    }

    // Log activity
    await supabase.from('Activity').insert({
      id: uuidv4(),
      userId: user.id,
      action: 'imported',
      entity: 'referral',
      entityId: null,
      details: `Admin ${adminName} imported ${created} referrals`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ created, failed: errors.length, errors })
  } catch (error: any) {
    console.error('Import referrals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
