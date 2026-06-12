import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

function generateReferralCode(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 8)
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) {
      return NextResponse.json({ error }, { status: 401 })
    }

    const body = await request.json()
    const { affiliates } = body as {
      affiliates: {
        name: string
        email: string
        phone?: string
        referralCode?: string
        commissionRate?: number | string
        tier?: string
      }[]
    }

    if (!affiliates || !Array.isArray(affiliates) || affiliates.length === 0) {
      return NextResponse.json({ error: 'No affiliates data provided' }, { status: 400 })
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

    const passwordHash = await bcrypt.hash('ChangeMe123!', 10)
    const validTiers = ['standard', 'pro', 'elite']

    for (let i = 0; i < affiliates.length; i++) {
      const row = affiliates[i]
      const rowNum = i + 1

      try {
        if (!row.name || !row.email) {
          errors.push({ row: rowNum, message: 'Name and email are required' })
          continue
        }

        // Check if email already exists
        const { data: existingUser } = await supabase
          .from('User')
          .select('id')
          .eq('email', row.email)
          .single()

        if (existingUser) {
          errors.push({ row: rowNum, message: `Email ${row.email} already exists` })
          continue
        }

        // Generate referral code if not provided
        let referralCode = row.referralCode || generateReferralCode(row.name)

        // Check if referral code already exists
        if (row.referralCode) {
          const { data: existingCode } = await supabase
            .from('Affiliate')
            .select('id')
            .eq('referralCode', referralCode)
            .single()

          if (existingCode) {
            // Auto-generate instead
            referralCode = generateReferralCode(row.name)
          }
        } else {
          // Ensure auto-generated code is unique
          let codeAttempts = 0
          while (codeAttempts < 5) {
            const { data: existingCode } = await supabase
              .from('Affiliate')
              .select('id')
              .eq('referralCode', referralCode)
              .single()
            if (!existingCode) break
            referralCode = generateReferralCode(row.name)
            codeAttempts++
          }
        }

        const tier = validTiers.includes(row.tier || '') ? row.tier : 'standard'
        const commissionRate = row.commissionRate ? parseFloat(String(row.commissionRate)) : 10

        // Create user
        const userId = uuidv4()
        const { error: userError } = await supabase.from('User').insert({
          id: userId,
          email: row.email,
          name: row.name,
          phone: row.phone || null,
          passwordHash,
          role: 'affiliate',
          status: 'active',
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        if (userError) {
          errors.push({ row: rowNum, message: `Failed to create user: ${userError.message}` })
          continue
        }

        // Create affiliate record
        const affiliateId = uuidv4()
        const { error: affError } = await supabase.from('Affiliate').insert({
          id: affiliateId,
          userId,
          referralCode,
          tier,
          commissionRate,
          totalEarnings: 0,
          totalReferrals: 0,
          totalConversions: 0,
          balance: 0,
          payoutMethod: 'bank',
          status: 'active',
          joinedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        if (affError) {
          // Roll back user
          await supabase.from('User').delete().eq('id', userId)
          errors.push({ row: rowNum, message: `Failed to create affiliate: ${affError.message}` })
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
      entity: 'affiliate',
      entityId: null,
      details: `Admin ${adminName} imported ${created} ambassadors`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ created, failed: errors.length, errors })
  } catch (error: any) {
    console.error('Import affiliates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
