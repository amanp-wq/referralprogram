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

    // If search term provided, first find matching user IDs by name/email
    let matchingUserIds: string[] | null = null
    if (search) {
      const { data: usersByName } = await supabase
        .from('User')
        .select('id')
        .or(`name.ilike.%${search}%,email.ilike.%${search}%`)
      matchingUserIds = (usersByName || []).map((u: any) => u.id)
    }

    let query = supabase
      .from('Affiliate')
      .select('*, User!Affiliate_userId_fkey(id, email, name, phone, avatarUrl, status, createdAt)', { count: 'exact' })
      .order('joinedAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) query = query.eq('status', status)

    // Apply search filter - by referralCode OR by matching user IDs
    if (search) {
      if (matchingUserIds && matchingUserIds.length > 0) {
        query = query.or(`referralCode.ilike.%${search}%,userId.in.(${matchingUserIds.join(',')})`)
      } else {
        query = query.ilike('referralCode', `%${search}%`)
      }
    }

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

    // Validate tier value
    const validTiers = ['standard', 'pro', 'elite']
    const affiliateTier = validTiers.includes(tier) ? tier : 'standard'

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
      tier: affiliateTier,
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
      details: `Created affiliate ${name} (${email}) with tier ${affiliateTier}`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ id: affiliateId, userId, message: 'Affiliate created successfully' }, { status: 201 })
  } catch (error: any) {
    console.error('Create affiliate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) {
      return NextResponse.json({ error }, { status: 401 })
    }

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Affiliate ID and status are required' }, { status: 400 })
    }

    const validStatuses = ['active', 'inactive', 'pending', 'suspended']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const supabase = getServerClient()

    // Get affiliate info for activity logging
    const { data: affiliate } = await supabase
      .from('Affiliate')
      .select('id, userId, User!Affiliate_userId_fkey(name)')
      .eq('id', id)
      .single()

    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }

    const affiliateName = (affiliate as any).User?.name || 'Unknown'

    // Update affiliate status
    const { error: dbError } = await supabase
      .from('Affiliate')
      .update({ status, updatedAt: new Date().toISOString() })
      .eq('id', id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Also update user status
    await supabase
      .from('User')
      .update({ status, updatedAt: new Date().toISOString() })
      .eq('id', affiliate.userId)

    // Get admin name for activity logging
    const { data: adminUser } = await supabase
      .from('User')
      .select('name')
      .eq('id', user.id)
      .single()

    const adminName = adminUser?.name || 'Unknown'

    // Log activity
    await supabase.from('Activity').insert({
      id: uuidv4(),
      userId: user.id,
      action: 'status_changed',
      entity: 'affiliate',
      entityId: id,
      details: `Admin ${adminName} changed ambassador ${affiliateName} status to ${status}`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ message: 'Affiliate status updated successfully' })
  } catch (error: any) {
    console.error('Update affiliate status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
