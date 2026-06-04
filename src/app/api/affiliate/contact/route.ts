import { NextRequest, NextResponse } from 'next/server'
import { requireAffiliate } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const { subject, priority, message } = body

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
    }

    const supabase = getServerClient()

    // Store the contact message as an activity log
    await supabase.from('Activity').insert({
      id: `act_${uuidv4().substring(0, 12)}`,
      userId: user.id,
      action: 'support_request',
      entity: 'contact',
      entityId: affiliate.id,
      details: `[${priority || 'medium'}] ${subject}: ${message}`,
      createdAt: new Date().toISOString(),
    })

    // Also store in Setting table as a support ticket
    const ticketId = `tkt_${uuidv4().substring(0, 12)}`
    await supabase.from('Setting').upsert({
      id: ticketId,
      key: `support_${affiliate.id}_${Date.now()}`,
      value: JSON.stringify({
        subject,
        priority: priority || 'medium',
        message,
        status: 'open',
        affiliateId: affiliate.id,
        userEmail: user.email,
        userName: user.name,
        createdAt: new Date().toISOString(),
      }),
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ message: 'Support request submitted successfully. We will get back to you within 24 hours.' }, { status: 201 })
  } catch (error: any) {
    console.error('Contact form error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
