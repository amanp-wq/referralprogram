import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

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

    // Log activity if status changed
    if (status !== undefined) {
      const { data: adminUser } = await supabase
        .from('User')
        .select('name')
        .eq('id', user.id)
        .single()

      const adminName = adminUser?.name || 'Unknown'

      await supabase.from('Activity').insert({
        id: uuidv4(),
        userId: user.id,
        action: 'status_changed',
        entity: 'referral',
        entityId: id,
        details: `Admin ${adminName} changed referral ${id.substring(0, 8)} status to ${status}`,
        createdAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({ message: 'Referral updated successfully' })
  } catch (error: any) {
    console.error('Update referral error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const validStatuses = ['submitted', 'pending', 'enrolled', 'not_enrolled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const supabase = getServerClient()

    // Get referral info for activity logging
    const { data: referral } = await supabase
      .from('Referral')
      .select('id, visitorName, visitorEmail')
      .eq('id', id)
      .single()

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    const updateData: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString(),
    }

    if (status === 'enrolled') {
      updateData.convertedAt = new Date().toISOString()
    }

    const { error: dbError } = await supabase
      .from('Referral')
      .update(updateData)
      .eq('id', id)

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
    const visitorName = referral.visitorName || referral.visitorEmail || id.substring(0, 8)

    // Log activity
    await supabase.from('Activity').insert({
      id: uuidv4(),
      userId: user.id,
      action: 'status_changed',
      entity: 'referral',
      entityId: id,
      details: `Admin ${adminName} changed referral for ${visitorName} status to ${status}`,
      createdAt: new Date().toISOString(),
    })

    // Send email to affiliate when referral is marked as enrolled
    if (status === 'enrolled') {
      try {
        const { data: fullReferral } = await supabase
          .from('Referral')
          .select('affiliateId, Affiliate!Referral_affiliateId_fkey(id, userId, User!Affiliate_userId_fkey(email))')
          .eq('id', id)
          .single()

        if (fullReferral) {
          const affiliateEmail = (fullReferral as any).Affiliate?.User?.email
          if (affiliateEmail) {
            const { sendEmail, referralEnrolledEmail } = await import('@/app/api/email/route')
            await sendEmail(referralEnrolledEmail(affiliateEmail, visitorName))
          }
        }
      } catch (emailErr) {
        console.error('[REFERRAL] Email sending failed:', emailErr)
      }
    }

    return NextResponse.json({ message: 'Referral status updated successfully' })
  } catch (error: any) {
    console.error('Update referral status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const { id } = await params
    const supabase = getServerClient()

    // Get referral info for activity logging
    const { data: referral } = await supabase
      .from('Referral')
      .select('id, visitorName, visitorEmail')
      .eq('id', id)
      .single()

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    const visitorName = referral.visitorName || referral.visitorEmail || id.substring(0, 8)

    // Delete referral
    const { error: dbError } = await supabase
      .from('Referral')
      .delete()
      .eq('id', id)

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

    // Log activity
    await supabase.from('Activity').insert({
      id: uuidv4(),
      userId: user.id,
      action: 'deleted',
      entity: 'referral',
      entityId: id,
      details: `Admin ${adminName} deleted referral for ${visitorName}`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ message: 'Referral deleted successfully' })
  } catch (error: any) {
    console.error('Delete referral error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
