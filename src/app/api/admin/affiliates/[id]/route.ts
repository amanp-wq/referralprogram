import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// Edit an ambassador's contact details (name / email / phone).
// Email lives on the User table and is the login identity, so changing it
// updates the login email too.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { name, email, phone } = body as { name?: string; email?: string; phone?: string }

    const supabase = getServerClient()

    const { data: affiliate } = await supabase
      .from('Affiliate')
      .select('id, userId, User!Affiliate_userId_fkey(name)')
      .eq('id', id)
      .single()
    if (!affiliate) return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })

    const userId = (affiliate as any).userId
    const update: Record<string, any> = { updatedAt: new Date().toISOString() }

    if (name !== undefined) update.name = name.trim()

    if (email !== undefined) {
      const em = email.trim().toLowerCase()
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRe.test(em)) return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
      // Ensure the email isn't already used by another account
      const { data: clash } = await supabase.from('User').select('id').ilike('email', em).neq('id', userId).limit(1)
      if (clash && clash.length > 0) return NextResponse.json({ error: 'That email is already in use by another account' }, { status: 409 })
      update.email = em
    }

    if (phone !== undefined) update.phone = phone.trim() || null

    const { error: dbError } = await supabase.from('User').update(update).eq('id', userId)
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

    const { data: adminUser } = await supabase.from('User').select('name').eq('id', user.id).single()
    const adminName = (adminUser as any)?.name || 'Unknown'
    await supabase.from('Activity').insert({
      id: uuidv4(),
      userId: user.id,
      action: 'updated',
      entity: 'affiliate',
      entityId: id,
      details: `Admin ${adminName} edited contact details for ambassador ${(affiliate as any).User?.name || id.substring(0, 8)}`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ message: 'Ambassador updated successfully' })
  } catch (error: any) {
    console.error('Update affiliate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) {
      return NextResponse.json({ error }, { status: 401 })
    }

    const { id } = await params
    const supabase = getServerClient()

    // Get affiliate info for activity logging
    const { data: affiliate } = await supabase
      .from('Affiliate')
      .select('id, userId, referralCode, User!Affiliate_userId_fkey(name)')
      .eq('id', id)
      .single()

    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
    }

    const affiliateName = (affiliate as any).User?.name || 'Unknown'
    const userId = (affiliate as any).userId

    // Delete affiliate first (cascades will handle related records)
    const { error: affDeleteError } = await supabase
      .from('Affiliate')
      .delete()
      .eq('id', id)

    if (affDeleteError) {
      return NextResponse.json({ error: affDeleteError.message }, { status: 500 })
    }

    // Delete user
    const { error: userDeleteError } = await supabase
      .from('User')
      .delete()
      .eq('id', userId)

    if (userDeleteError) {
      console.error('Failed to delete user after affiliate deletion:', userDeleteError)
      // Don't fail the whole request — affiliate is already deleted
    }

    // Get admin name for activity logging
    const { data: adminUser } = await supabase
      .from('User')
      .select('name')
      .eq('id', user.id)
      .single()

    const adminName = (adminUser as any)?.name || 'Unknown'

    // Log activity
    await supabase.from('Activity').insert({
      id: uuidv4(),
      userId: user.id,
      action: 'deleted',
      entity: 'affiliate',
      entityId: id,
      details: `Admin ${adminName} deleted ambassador ${affiliateName}`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ message: 'Affiliate deleted successfully' })
  } catch (error: any) {
    console.error('Delete affiliate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
