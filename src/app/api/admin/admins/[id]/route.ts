// ============================================================
// Admin User Delete Endpoint
// ============================================================
// DELETE /api/admin/admins/[id] — delete an admin user
//
// Safety: an admin cannot delete their own account through this
// endpoint (must use a different admin or the CLI). This prevents
// accidental lockout.
// ============================================================

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
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const { id } = await params

    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own admin account. Ask another admin to do this.' },
        { status: 400 }
      )
    }

    const supabase = getServerClient()

    // Verify the target is actually an admin (don't allow deleting affiliates here)
    const { data: target, error: findError } = await supabase
      .from('User')
      .select('id, email, name, role')
      .eq('id', id)
      .single()

    if (findError || !target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (target.role !== 'admin') {
      return NextResponse.json(
        { error: 'This endpoint only deletes admin users. Use the Ambassadors page for affiliates.' },
        { status: 400 }
      )
    }

    // Count remaining admins — refuse if this is the last one
    const { count } = await supabase
      .from('User')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last admin account. Create another admin first.' },
        { status: 400 }
      )
    }

    // Delete the admin
    const { error: deleteError } = await supabase.from('User').delete().eq('id', id)

    if (deleteError) {
      console.error('[ADMINS] Delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Log activity
    await supabase.from('Activity').insert({
      id: uuidv4(),
      userId: user.id,
      action: 'admin_deleted',
      entity: 'user',
      entityId: id,
      details: `Admin ${user.name} deleted admin: ${target.name} (${target.email})`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: `Admin ${target.name} (${target.email}) deleted successfully.`,
    })
  } catch (error: any) {
    console.error('[ADMINS] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
