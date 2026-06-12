import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('Commission')
      .select('*, Affiliate!Commission_affiliateId_fkey(id, referralCode, User!Affiliate_userId_fkey(name, email)), Program!Commission_programId_fkey(id, name, commissionType, commissionValue)', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (status) query = query.eq('status', status)

    const { data: commissions, error: dbError, count } = await query

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({
      commissions: commissions || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error: any) {
    console.error('Commissions list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const { affiliateId, referralId, amount, rate, type, description, status } = body

    if (!affiliateId) {
      return NextResponse.json({ error: 'affiliateId is required' }, { status: 400 })
    }
    if (amount === undefined || amount === null) {
      return NextResponse.json({ error: 'amount is required' }, { status: 400 })
    }

    const supabase = getServerClient()

    // Verify the affiliate exists
    const { data: affiliate } = await supabase
      .from('Affiliate')
      .select('id, programId')
      .eq('id', affiliateId)
      .single()

    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }

    // Get programId from referral if provided, otherwise from affiliate
    let programId: string | null = null
    if (referralId) {
      const { data: referral } = await supabase
        .from('Referral')
        .select('programId')
        .eq('id', referralId)
        .single()
      if (referral) {
        programId = referral.programId
      }
    }

    // If still no programId, try to get a default active program
    if (!programId) {
      const { data: defaultProgram } = await supabase
        .from('Program')
        .select('id')
        .eq('isActive', true)
        .order('createdAt', { ascending: false })
        .limit(1)
        .single()
      if (defaultProgram) {
        programId = defaultProgram.id
      }
    }

    if (!programId) {
      return NextResponse.json({ error: 'No program found for commission. Please ensure a program exists.' }, { status: 400 })
    }

    const commissionId = uuidv4()
    const commissionStatus = status || 'pending'
    const commissionType = type || 'commission'
    const commissionRate = rate ?? 0

    const { error: dbError } = await supabase
      .from('Commission')
      .insert({
        id: commissionId,
        affiliateId,
        programId,
        referralId: referralId || null,
        amount,
        rate: commissionRate,
        type: commissionType,
        status: commissionStatus,
        description: description || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Get admin name for activity logging
    const { data: adminUser } = await supabase
      .from('User')
      .select('name')
      .eq('id', user.id)
      .single()

    const adminName = adminUser?.name || 'Unknown'

    // Log activity for commission creation
    await supabase.from('Activity').insert({
      id: uuidv4(),
      userId: user.id,
      action: 'created',
      entity: 'commission',
      entityId: commissionId,
      details: `Admin ${adminName} manually created commission of $${amount} for affiliate ${affiliateId.substring(0, 8)}`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ message: 'Commission created successfully', id: commissionId }, { status: 201 })
  } catch (error: any) {
    console.error('Create commission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) return NextResponse.json({ error: 'ID and status are required' }, { status: 400 })

    const supabase = getServerClient()
    const { error: dbError } = await supabase
      .from('Commission')
      .update({ status, updatedAt: new Date().toISOString() })
      .eq('id', id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    // If approved, update affiliate's totalEarnings
    if (status === 'approved') {
      const { data: commission } = await supabase.from('Commission').select('affiliateId, amount').eq('id', id).single()
      if (commission) {
        const { data: affiliate } = await supabase.from('Affiliate').select('totalEarnings, balance').eq('id', commission.affiliateId).single()
        if (affiliate) {
          await supabase.from('Affiliate').update({
            totalEarnings: affiliate.totalEarnings + commission.amount,
            balance: affiliate.balance + commission.amount,
            updatedAt: new Date().toISOString(),
          }).eq('id', commission.affiliateId)
        }
      }
    }

    return NextResponse.json({ message: 'Commission updated successfully' })
  } catch (error: any) {
    console.error('Update commission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
