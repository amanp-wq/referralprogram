import { NextRequest, NextResponse } from 'next/server'
import { requireAffiliate } from '@/lib/auth'
import { getServerClient } from '@/lib/supabase'
import { encryptField, decryptField, maskSensitive } from '@/lib/crypto'
import { sanitizeText } from '@/lib/validation'

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
        // Decrypt for the affiliate's own view (they own this data)
        bankAccount: decryptField(affiliate.bankAccount),
        bankIfsc: decryptField(affiliate.bankIfsc),
        upiId: decryptField(affiliate.upiId),
        payoutEmail: affiliate.payoutEmail,
        // Masked variants for displaying in form placeholders
        bankAccountMasked: maskSensitive(affiliate.bankAccount),
        bankIfscMasked: maskSensitive(affiliate.bankIfsc),
        upiIdMasked: maskSensitive(affiliate.upiId),
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

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { name, phone, company, payoutMethod, bankName, bankAccount, bankIfsc, upiId, payoutEmail,
      emailNotifications, conversionAlerts, payoutAlerts, weeklyReport, monthlyReport } = body

    const supabase = getServerClient()

    // Update user (with sanitization)
    if (name || phone || company) {
      await supabase.from('User').update({
        ...(name && { name: sanitizeText(name, 100) }),
        ...(phone !== undefined && { phone: phone ? sanitizeText(phone, 20) : null }),
        ...(company !== undefined && { company: company ? sanitizeText(company, 100) : null }),
        updatedAt: new Date().toISOString(),
      }).eq('id', user.id)
    }

    // Build affiliate update object — encrypt sensitive fields
    // Only encrypt if the user provided a non-empty value. If they sent
    // an empty string, we leave the existing value (don't wipe).
    const affiliateUpdate: Record<string, any> = {
      ...(payoutMethod && { payoutMethod }),
      ...(bankName !== undefined && { bankName: bankName ? sanitizeText(bankName, 100) : null }),
      ...(bankAccount !== undefined && bankAccount && bankAccount !== '' && {
        bankAccount: encryptField(sanitizeText(bankAccount, 50)),
      }),
      ...(bankIfsc !== undefined && bankIfsc && bankIfsc !== '' && {
        bankIfsc: encryptField(sanitizeText(bankIfsc, 20)),
      }),
      ...(upiId !== undefined && upiId && upiId !== '' && {
        upiId: encryptField(sanitizeText(upiId, 50)),
      }),
      ...(payoutEmail !== undefined && { payoutEmail: payoutEmail ? sanitizeText(payoutEmail, 254) : null }),
      updatedAt: new Date().toISOString(),
    }

    // Store notification preferences using the Setting table (key-value)
    const notificationSettings = {
      emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
      conversionAlerts: conversionAlerts !== undefined ? conversionAlerts : true,
      payoutAlerts: payoutAlerts !== undefined ? payoutAlerts : true,
      weeklyReport: weeklyReport !== undefined ? weeklyReport : true,
      monthlyReport: monthlyReport !== undefined ? monthlyReport : false,
    }

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
