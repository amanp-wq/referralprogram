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

    // Get referral info for activity logging and commission handling
    const { data: referral } = await supabase
      .from('Referral')
      .select('id, visitorName, visitorEmail, affiliateId, programId, status')
      .eq('id', id)
      .single()

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }

    const previousStatus = (referral as any).status
    const statusChanged = previousStatus !== status

    const updateData: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString(),
    }

    if (status === 'enrolled') {
      updateData.convertedAt = new Date().toISOString()
    } else {
      // Clear convertedAt when moving away from enrolled
      updateData.convertedAt = null
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
      details: `Admin ${adminName} changed referral for ${visitorName} status from ${previousStatus} to ${status}`,
      createdAt: new Date().toISOString(),
    })

    // Handle commission reversal when moving AWAY from enrolled
    if (previousStatus === 'enrolled' && status !== 'enrolled' && statusChanged) {
      try {
        const { affiliateId } = referral

        // Find and cancel the auto-created commission linked to this referral
        const { data: existingCommission } = await supabase
          .from('Commission')
          .select('id, amount, status, type')
          .eq('referralId', id)
          .in('type', ['commission', 'bonus'])
          .order('createdAt', { ascending: false })
          .limit(1)
          .single()

        if (existingCommission && existingCommission.status === 'pending') {
          // Cancel the commission (preserve audit trail instead of deleting)
          const { error: cancelError } = await supabase
            .from('Commission')
            .update({
              status: 'cancelled',
              description: `Cancelled: referral for ${visitorName} changed from enrolled to ${status}`,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', existingCommission.id)

          if (cancelError) {
            console.error('[REFERRAL] Commission cancellation failed:', cancelError)
          } else {
            // Log activity for commission cancellation
            await supabase.from('Activity').insert({
              id: uuidv4(),
              userId: user.id,
              action: 'cancelled',
              entity: 'commission',
              entityId: existingCommission.id,
              details: `Auto-cancelled commission of $${existingCommission.amount} — referral for ${visitorName} changed from enrolled to ${status}`,
              createdAt: new Date().toISOString(),
            })
          }
        } else if (existingCommission && existingCommission.status !== 'pending') {
          // Commission already approved/paid — don't auto-cancel, just log a warning
          await supabase.from('Activity').insert({
            id: uuidv4(),
            userId: user.id,
            action: 'warning',
            entity: 'commission',
            entityId: existingCommission.id,
            details: `Referral for ${visitorName} changed from enrolled to ${status}, but linked commission ($${existingCommission.amount}, status: ${existingCommission.status}) was NOT auto-cancelled. Manual review needed.`,
            createdAt: new Date().toISOString(),
          })
        }

        // Decrement affiliate's totalConversions
        const { data: affiliate } = await supabase
          .from('Affiliate')
          .select('totalConversions')
          .eq('id', affiliateId)
          .single()

        if (affiliate && (affiliate.totalConversions || 0) > 0) {
          await supabase
            .from('Affiliate')
            .update({
              totalConversions: (affiliate.totalConversions || 0) - 1,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', affiliateId)
        }
      } catch (reversalErr) {
        console.error('[REFERRAL] Commission reversal error:', reversalErr)
      }
    }

    // Auto-create Commission and update affiliate when referral is marked as enrolled
    // Only create if status actually changed TO enrolled (not already enrolled)
    if (status === 'enrolled' && previousStatus !== 'enrolled' && statusChanged) {
      try {
        const { affiliateId, programId } = referral

        // Look up the Program to get commissionValue
        let commissionValue = 50 // default $50 bonus per enrolled referral
        let effectiveProgramId = programId

        if (programId) {
          const { data: program } = await supabase
            .from('Program')
            .select('id, commissionValue')
            .eq('id', programId)
            .single()

          if (program) {
            commissionValue = program.commissionValue
          }
        }

        // Commission amount from program settings (always fixed manual bonus)
        const amount = commissionValue

        // Create Commission record
        const commissionId = uuidv4()
        const { error: commissionError } = await supabase
          .from('Commission')
          .insert({
            id: commissionId,
            affiliateId,
            programId: effectiveProgramId,
            referralId: id,
            amount,
            rate: 0,
            type: 'bonus',
            status: 'pending',
            description: `Bonus for enrolled referral: ${visitorName}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })

        if (commissionError) {
          console.error('[REFERRAL] Commission creation failed:', commissionError)
        } else {
          // Log activity for commission creation
          await supabase.from('Activity').insert({
            id: uuidv4(),
            userId: user.id,
            action: 'created',
            entity: 'commission',
            entityId: commissionId,
            details: `Auto-created bonus of $${amount} for enrolled referral: ${visitorName}`,
            createdAt: new Date().toISOString(),
          })
        }

        // Update affiliate's totalConversions (increment by 1)
        const { data: affiliate } = await supabase
          .from('Affiliate')
          .select('totalConversions')
          .eq('id', affiliateId)
          .single()

        if (affiliate) {
          await supabase
            .from('Affiliate')
            .update({
              totalConversions: (affiliate.totalConversions || 0) + 1,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', affiliateId)
        }

        // Send email to affiliate when referral is marked as enrolled
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
      } catch (commissionErr) {
        console.error('[REFERRAL] Commission auto-creation error:', commissionErr)
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
