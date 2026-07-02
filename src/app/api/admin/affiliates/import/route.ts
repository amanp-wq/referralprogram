import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.randomBytes(12)
  return Array.from(bytes).map(b => chars[b % chars.length]).join('')
}

function generateReferralCode(name: string, phone?: string): string {
  const parts = name.trim().split(/\s+/)
  const firstInitial = (parts[0]?.[0] || '').toUpperCase()
  const lastInitial = (parts[parts.length > 1 ? parts.length - 1 : 0]?.[0] || '').toUpperCase()
  const initials = parts.length > 1 ? `${firstInitial}${lastInitial}` : `${firstInitial}${parts[0]?.[1] || ''}`.toUpperCase()

  if (phone) {
    const digits = phone.replace(/\D/g, '')
    const suffix = digits.slice(-4)
    return `${initials}${suffix}`
  }

  const randomNum = Math.floor(1000 + Math.random() * 9000).toString()
  return `${initials}${randomNum}`
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
    let skipped = 0

    for (let i = 0; i < affiliates.length; i++) {
      const row = affiliates[i]
      const rowNum = i + 1

      try {
        if (!row.name || !row.email) {
          errors.push({ row: rowNum, message: 'Name and email are required' })
          continue
        }

        // Check if email already exists — skip (duplicate)
        const { data: existingUser } = await supabase
          .from('User')
          .select('id')
          .eq('email', row.email)
          .single()

        if (existingUser) {
          skipped++
          continue
        }

        // Auto-generate referral code from initials + last 4 digits of phone
        let referralCode = generateReferralCode(row.name, row.phone)

        // Ensure uniqueness: if taken, append incrementing number
        let suffix = 1
        const baseCode = referralCode
        while (true) {
          const { data: existingCode } = await supabase
            .from('Affiliate')
            .select('id')
            .eq('referralCode', referralCode)
            .single()
          if (!existingCode) break
          referralCode = `${baseCode}${suffix}`
          suffix++
        }

        const tier = 'standard'
        const commissionRate = 10

        // Create user with a unique secure temporary password
        const tempPassword = generateSecurePassword()
        console.log(`[AFFILIATE IMPORT] Temporary password for ${row.email}: ${tempPassword}`)
        const passwordHash = await bcrypt.hash(tempPassword, 10)
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

    return NextResponse.json({ created, skipped, failed: errors.length, errors })
  } catch (error: any) {
    console.error('Import affiliates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
