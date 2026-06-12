import { NextRequest, NextResponse } from 'next/server'
import { getServerClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

function generateReferralCode(name: string): string {
  // Generate a readable referral code from name + random suffix
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 8)
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const supabase = getServerClient()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    // Create user
    const userId = uuidv4()
    const { error: userError } = await supabase.from('User').insert({
      id: userId,
      email,
      name,
      passwordHash,
      role: 'affiliate',
      phone: phone || null,
      status: 'active',
      emailVerified: false,
    })

    if (userError) {
      console.error('User creation error:', userError)
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

    // Generate unique referral code
    let referralCode = generateReferralCode(name)
    let codeAttempts = 0
    while (codeAttempts < 5) {
      const { data: existingCode } = await supabase
        .from('Affiliate')
        .select('id')
        .eq('referralCode', referralCode)
        .single()

      if (!existingCode) break
      referralCode = generateReferralCode(name)
      codeAttempts++
    }

    // Create affiliate profile
    const affiliateId = uuidv4()
    const { error: affiliateError } = await supabase.from('Affiliate').insert({
      id: affiliateId,
      userId,
      referralCode,
      tier: 'standard',
      commissionRate: 10,
      totalEarnings: 0,
      totalReferrals: 0,
      totalConversions: 0,
      balance: 0,
      payoutMethod: 'bank',
      status: 'pending', // Pending until admin approves
      joinedAt: new Date().toISOString(),
    })

    if (affiliateError) {
      console.error('Affiliate creation error:', affiliateError)
      // Roll back user creation
      await supabase.from('User').delete().eq('id', userId)
      return NextResponse.json(
        { error: 'Failed to create affiliate profile. Please try again.' },
        { status: 500 }
      )
    }

    // Get the first active program to auto-enroll
    const { data: programs } = await supabase
      .from('Program')
      .select('id')
      .eq('isActive', true)
      .limit(1)

    // Create a default tracking link for the affiliate
    if (programs && programs.length > 0) {
      const linkCode = Math.random().toString(36).substring(2, 8)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://elevateme.pro'
      await supabase.from('Link').insert({
        id: uuidv4(),
        affiliateId,
        programId: programs[0].id,
        code: linkCode,
        url: `${baseUrl}/ref/${linkCode}`,
        clicks: 0,
        conversions: 0,
        isActive: true,
        label: 'Default Link',
      })
    }

    // Log activity
    await supabase.from('Activity').insert({
      id: uuidv4(),
      userId,
      action: 'affiliate_registered',
      entity: 'affiliate',
      entityId: affiliateId,
      details: `New ambassador registered: ${name} (${email})`,
    })

    // Send welcome email to affiliate + notification to admin
    try {
      const { sendEmail, newAffiliateEmail, newAffiliateAdminEmail } = await import('@/app/api/email/route')
      await sendEmail(newAffiliateEmail(name, email, referralCode))
      await sendEmail(newAffiliateAdminEmail(name, email))
    } catch (emailErr) {
      console.error('[REGISTER] Email sending failed:', emailErr)
      // Don't fail registration if email fails
    }

    // Auto-login: Create session
    const token = uuidv4()
    const expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString()

    await supabase.from('Session').insert({
      id: `sess_${uuidv4().substring(0, 12)}`,
      userId,
      token,
      expiresAt,
    })

    // Return success with token and user data
    const response = NextResponse.json(
      {
        success: true,
        message:
          'Account created successfully! Your ambassador profile is pending approval.',
        user: {
          id: userId,
          email,
          name,
          role: 'affiliate',
          phone: phone || null,
          status: 'active',
        },
        affiliate: {
          id: affiliateId,
          referralCode,
          status: 'pending',
          tier: 'standard',
        },
        token,
      },
      { status: 201 }
    )

    return response
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}
