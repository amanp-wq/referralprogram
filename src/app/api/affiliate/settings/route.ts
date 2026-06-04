import { NextRequest, NextResponse } from 'next/server'
import { requireAffiliate } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    // Load notification settings from Setting table
    const supabase = getServerClient()
    const { data: notifSettings } = await supabase
      .from('Setting')
      .select('key, value')
      .like('key', `affiliate_${affiliate.id}_%`)

    const notifications: Record<string, boolean> = {
      emailNotifications: true,
      conversionAlerts: true,
      payoutAlerts: true,
      weeklyReport: true,
      monthlyReport: false,
    }

    if (notifSettings) {
      for (const s of notifSettings) {
        const key = s.key.replace(`affiliate_${affiliate.id}_`, '')
        if (key in notifications) {
          notifications[key] = s.value === 'true'
        }
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        company: user.company,
        avatarUrl: user.avatarUrl,
      },
      affiliate: {
        id: affiliate.id,
        referralCode: affiliate.referralCode,
        tier: affiliate.tier,
        commissionRate: affiliate.commissionRate,
        payoutMethod: affiliate.payoutMethod,
        bankName: affiliate.bankName,
        bankAccount: affiliate.bankAccount,
        bankIfsc: affiliate.bankIfsc,
        upiId: affiliate.upiId,
        payoutEmail: affiliate.payoutEmail,
      },
      notifications,
    })
  } catch (error: any) {
    console.error('Affiliate settings get error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, affiliate, error } = await requireAffiliate(request)
    if (!user || !affiliate) return NextResponse.json({ error }, { status: 401 })

    const body = await request.json()
    const { name, phone, company, payoutMethod, bankName, bankAccount, bankIfsc, upiId, payoutEmail,
      emailNotifications, conversionAlerts, payoutAlerts, weeklyReport, monthlyReport } = body

    const supabase = getServerClient()

    // Update user
    if (name || phone || company) {
      await supabase.from('User').update({
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(company !== undefined && { company }),
        updatedAt: new Date().toISOString(),
      }).eq('id', user.id)
    }

    // Build affiliate update object
    const affiliateUpdate: Record<string, any> = {
      ...(payoutMethod && { payoutMethod }),
      ...(bankName !== undefined && { bankName }),
      ...(bankAccount !== undefined && { bankAccount }),
      ...(bankIfsc !== undefined && { bankIfsc }),
      ...(upiId !== undefined && { upiId }),
      ...(payoutEmail !== undefined && { payoutEmail }),
      updatedAt: new Date().toISOString(),
    }

    // Store notification preferences as JSON in a meta field or use Setting table
    // Since Affiliate table may not have notification columns, we use the Setting table
    const notificationSettings = {
      emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
      conversionAlerts: conversionAlerts !== undefined ? conversionAlerts : true,
      payoutAlerts: payoutAlerts !== undefined ? payoutAlerts : true,
      weeklyReport: weeklyReport !== undefined ? weeklyReport : true,
      monthlyReport: monthlyReport !== undefined ? monthlyReport : false,
    }

    // Save notification settings using the Setting table (key-value)
    for (const [key, value] of Object.entries(notificationSettings)) {
      const settingId = `notif_${affiliate.id}_${key}`
      await supabase.from('Setting').upsert({
        id: settingId,
        key: `affiliate_${affiliate.id}_${key}`,
        value: String(value),
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'key' })
    }

    // Update affiliate payout settings
    await supabase.from('Affiliate').update(affiliateUpdate).eq('id', affiliate.id)

    return NextResponse.json({ message: 'Settings updated successfully' })
  } catch (error: any) {
    console.error('Affiliate settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
