import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) {
      return NextResponse.json({ error }, { status: 401 })
    }

    const supabase = getServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('Affiliate')
      .select('*, User!Affiliate_userId_fkey(id, email, name, avatarUrl, status, createdAt)')
      .order('joinedAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) query = query.eq('status', status)
    if (search) query = query.ilike('referralCode', `%${search}%`)

    const { data: affiliates, error: dbError, count } = await query

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({
      affiliates: affiliates || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error: any) {
    console.error('Affiliates list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) {
      return NextResponse.json({ error }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, referralCode, commissionRate, tier } = body

    if (!name || !email || !referralCode) {
      return NextResponse.json({ error: 'Name, email, and referral code are required' }, { status: 400 })
    }

    const supabase = getServerClient()

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }

    // Check if referral code already exists
    const { data: existingCode } = await supabase
      .from('Affiliate')
      .select('id')
      .eq('referralCode', referralCode)
      .single()

    if (existingCode) {
      return NextResponse.json({ error: 'Referral code already exists' }, { status: 409 })
    }

    // Create user with default password
    const userId = `usr_${uuidv4().substring(0, 12)}`
    const passwordHash = await bcrypt.hash('affiliate123', 10)

    const { error: userError } = await supabase.from('User').insert({
      id: userId,
      email,
      name,
      passwordHash,
      role: 'affiliate',
      status: 'active',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    // Create affiliate record
    const affiliateId = `aff_${uuidv4().substring(0, 12)}`
    const { error: affError } = await supabase.from('Affiliate').insert({
      id: affiliateId,
      userId,
      referralCode,
      tier: tier || 'standard',
      commissionRate: commissionRate || 10,
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
      return NextResponse.json({ error: affError.message }, { status: 500 })
    }

    // Log activity
    await supabase.from('Activity').insert({
      id: `act_${uuidv4().substring(0, 12)}`,
      userId: user.id,
      action: 'created_affiliate',
      entity: 'affiliate',
      entityId: affiliateId,
      details: `Created affiliate ${name} (${email})`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ id: affiliateId, userId, message: 'Affiliate created successfully' }, { status: 201 })
  } catch (error: any) {
    console.error('Create affiliate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
