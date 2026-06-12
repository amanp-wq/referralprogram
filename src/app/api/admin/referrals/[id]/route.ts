import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const { id } = await params
    const supabase = getServerClient()

    const { data: referral, error: dbError } = await supabase
      .from('Referral')
      .select('*, Affiliate!Referral_affiliateId_fkey(id, referralCode, User!Affiliate_userId_fkey(name, email))')
      .eq('id', id)
      .single()

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
    if (!referral) return NextResponse.json({ error: 'Referral not found' }, { status: 404 })

    return NextResponse.json(referral)
  } catch (error: any) {
    console.error('Referral detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { visitorName, visitorEmail, visitorPhone, status } = body

    const supabase = getServerClient()

    const updateData: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (visitorName !== undefined) updateData.visitorName = visitorName
    if (visitorEmail !== undefined) updateData.visitorEmail = visitorEmail
    if (visitorPhone !== undefined) updateData.visitorPhone = visitorPhone
    if (status !== undefined) updateData.status = status
    if (status === 'enrolled' || status === 'converted') {
      updateData.convertedAt = new Date().toISOString()
    }

    const { error: dbError } = await supabase
      .from('Referral')
      .update(updateData)
      .eq('id', id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    return NextResponse.json({ message: 'Referral updated successfully' })
  } catch (error: any) {
    console.error('Update referral error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
