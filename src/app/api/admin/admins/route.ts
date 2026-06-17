// ============================================================
// Admin Users API
// ============================================================
// GET  /api/admin/admins        — list all admin users
// POST /api/admin/admins        — create a new admin user (admin-only)
// DELETE /api/admin/admins/[id] — delete an admin user (admin-only)
//
// This endpoint is the in-app equivalent of scripts/create-admin.ts.
// It allows existing admins to grant admin access to other users
// without needing CLI access.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { validateBody, sanitizeText } from '@/lib/validation'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// Schema for creating a new admin
const createAdminSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().max(254).toLowerCase().trim(),
  password: z.string().min(12).max(128),
  phone: z.string().max(20).optional().nullable(),
  sendWelcomeEmail: z.boolean().optional().default(true),
})

// GET — list all admin users
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const supabase = getServerClient()
    const { data: admins, error: dbError } = await supabase
      .from('User')
      .select('id, email, name, phone, status, emailVerified, createdAt, updatedAt')
      .eq('role', 'admin')
      .order('createdAt', { ascending: false })

    if (dbError) {
      console.error('[ADMINS] List error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ admins: admins || [], currentUserId: user.id })
  } catch (error: any) {
    console.error('[ADMINS] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — create a new admin user
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin(request)
    if (!user) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Validate input
    const validation = validateBody(createAdminSchema, body)
    if (!validation.success) {
      return validation.response
    }
    const { name, email, password, phone, sendWelcomeEmail } = validation.data

    const safeName = sanitizeText(name, 100) || ''
    const safePhone = phone ? sanitizeText(phone, 20) : null

    const supabase = getServerClient()

    // Check if user already exists
    const { data: existing } = await supabase
      .from('User')
      .select('id, role')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json(
        {
          error: `A user with this email already exists (role: ${existing.role}). ${
            existing.role === 'affiliate'
              ? 'Demote the affiliate first or use a different email.'
              : 'Admin already exists.'
          }`,
        },
        { status: 409 }
      )
    }

    // Hash password
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    // Create admin user
    const userId = uuidv4()
    const { error: insertError } = await supabase.from('User').insert({
      id: userId,
      email,
      name: safeName,
      passwordHash,
      role: 'admin',
      phone: safePhone,
      status: 'active',
      emailVerified: true, // admins are pre-verified since they're created by another admin
    })

    if (insertError) {
      console.error('[ADMINS] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create admin user. ' + insertError.message },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from('Activity').insert({
      id: uuidv4(),
      userId: user.id,
      action: 'admin_created',
      entity: 'user',
      entityId: userId,
      details: `Admin ${user.name} created new admin: ${safeName} (${email})`,
      createdAt: new Date().toISOString(),
    })

    // Send welcome email (optional)
    if (sendWelcomeEmail) {
      try {
        const { sendEmail } = await import('@/app/api/email/route')
        await sendEmail({
          to: email,
          subject: 'You now have admin access to ElevateMe Referral',
          html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #C44838; font-size: 24px; margin: 0;">Admin Access Granted</h1>
              </div>
              <div style="background: #f8fafc; border-radius: 12px; padding: 24px;">
                <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Hi ${safeName},</h2>
                <p style="color: #475569; line-height: 1.6;">
                  You have been granted administrator access to the ElevateMe Referral Program by
                  <strong>${user.name}</strong>. You can now log in at
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'https://elevateme.pro'}/login"
                     style="color: #C44838;">${process.env.NEXT_PUBLIC_SITE_URL || 'the platform'}/login</a>
                  using your email <strong>${email}</strong> and the password that was set for you.
                </p>
                <p style="color: #475569; line-height: 1.6;">
                  Please change your password after your first login for security.
                </p>
              </div>
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
                &copy; 2026 ElevateMe, Inc. All rights reserved.
              </p>
            </div>
          `,
        })
      } catch (emailErr) {
        console.error('[ADMINS] Welcome email failed:', emailErr)
        // Don't fail the request — admin was still created
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Admin user created successfully${sendWelcomeEmail ? ' and welcome email sent' : ''}.`,
        admin: {
          id: userId,
          email,
          name: safeName,
          role: 'admin',
          status: 'active',
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[ADMINS] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
