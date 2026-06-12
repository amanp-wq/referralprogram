import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

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
    const userId = affiliate.userId

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

    const adminName = adminUser?.name || 'Unknown'

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
