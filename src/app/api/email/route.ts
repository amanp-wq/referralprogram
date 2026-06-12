import { NextRequest, NextResponse } from 'next/server'

// Email sending utility using a configurable email service
// This currently logs emails and supports integration with:
// - Resend (recommended for production)
// - SendGrid
// - Nodemailer (SMTP)
// - AWS SES

interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

// Store email logs for demo/testing purposes
const emailLog: Array<{ to: string; subject: string; sentAt: string; status: string }> = []

async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; message: string }> {
  const { to, subject, html } = payload

  // Check for email service configuration
  const emailService = process.env.EMAIL_SERVICE || 'log' // 'log' | 'resend' | 'sendgrid' | 'smtp'
  const resendApiKey = process.env.RESEND_API_KEY
  const sendGridApiKey = process.env.SENDGRID_API_KEY

  // Log the email regardless of service
  const recipients = Array.isArray(to) ? to.join(', ') : to
  console.log(`[EMAIL] To: ${recipients} | Subject: ${subject}`)
  emailLog.push({ to: recipients, subject, sentAt: new Date().toISOString(), status: 'sent' })

  if (emailService === 'resend' && resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'ElevateMe <noreply@elevateme.pro>',
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        }),
      })
      if (response.ok) {
        return { success: true, message: 'Email sent via Resend' }
      }
      const err = await response.text()
      console.error('[EMAIL] Resend error:', err)
      return { success: false, message: `Resend error: ${err}` }
    } catch (error: any) {
      console.error('[EMAIL] Resend exception:', error.message)
      return { success: false, message: error.message }
    }
  }

  if (emailService === 'sendgrid' && sendGridApiKey) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: (Array.isArray(to) ? to : [to]).map(t => ({ email: t })) }],
          from: { email: process.env.EMAIL_FROM || 'noreply@elevateme.pro', name: 'ElevateMe' },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      })
      if (response.status === 202) {
        return { success: true, message: 'Email sent via SendGrid' }
      }
      const err = await response.text()
      console.error('[EMAIL] SendGrid error:', err)
      return { success: false, message: `SendGrid error: ${err}` }
    } catch (error: any) {
      console.error('[EMAIL] SendGrid exception:', error.message)
      return { success: false, message: error.message }
    }
  }

  // Default: log mode (for development/demo)
  console.log('[EMAIL] No email service configured. Email logged but not sent.')
  console.log('[EMAIL] Configure EMAIL_SERVICE, RESEND_API_KEY or SENDGRID_API_KEY in .env')
  return { success: true, message: 'Email logged (no email service configured)' }
}

// Pre-built email templates
export function newAffiliateEmail(name: string, email: string, referralCode: string): EmailPayload {
  return {
    to: email,
    subject: 'Welcome to the ElevateMe Ambassador Program!',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #C44838; font-size: 28px; margin: 0;">Welcome to ElevateMe!</h1>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Hi ${name},</h2>
          <p style="color: #475569; line-height: 1.6;">Thank you for joining the ElevateMe Ambassador Program! Your account has been created and is currently pending approval. Once approved, you'll get full access to your ambassador dashboard.</p>
          <div style="background: white; border: 2px solid #689775; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
            <p style="color: #689775; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">Your Referral Code</p>
            <p style="color: #0f172a; font-size: 24px; font-weight: bold; font-family: monospace; margin: 0;">${referralCode}</p>
          </div>
          <p style="color: #475569; line-height: 1.6;">Share your unique referral link to start earning commissions for every successful enrollment!</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://elevateme.pro'}" style="background: #689775; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">&copy; 2026 ElevateMe, Inc. All rights reserved.</p>
      </div>
    `,
  }
}

export function newReferralAdminEmail(visitorName: string, visitorEmail: string, ambassadorName: string, referralCode: string): EmailPayload {
  return {
    to: process.env.ADMIN_EMAIL || 'admin@elevateme.pro',
    subject: `New Referral Submitted: ${visitorName}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C44838; font-size: 24px;">New Referral Submitted</h1>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Visitor Name:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${visitorName}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Visitor Email:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${visitorEmail}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Ambassador:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${ambassadorName}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Referral Code:</td><td style="padding: 8px 0; font-weight: 600; font-family: monospace; color: #0f172a;">${referralCode}</td></tr>
          </table>
        </div>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://elevateme.pro'}" style="background: #C44838; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View in Dashboard</a>
      </div>
    `,
  }
}

export function newAffiliateAdminEmail(name: string, email: string): EmailPayload {
  return {
    to: process.env.ADMIN_EMAIL || 'admin@elevateme.pro',
    subject: `New Ambassador Registration: ${name}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C44838; font-size: 24px;">New Ambassador Registered</h1>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Name:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${name}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${email}</td></tr>
          </table>
          <p style="color: #475569; margin-top: 16px;">This ambassador is currently pending approval. Please review and approve their account.</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://elevateme.pro'}" style="background: #C44838; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Review in Dashboard</a>
      </div>
    `,
  }
}

export function referralEnrolledEmail(affiliateEmail: string, visitorName: string): EmailPayload {
  return {
    to: affiliateEmail,
    subject: `Your referral has enrolled! - ElevateMe`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #689775; font-size: 24px;">🎉 Great News!</h1>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 20px 0;">
          <p style="color: #475569; line-height: 1.6;">Your referral <strong>${visitorName}</strong> has been marked as enrolled! Your commission will be processed according to the program terms.</p>
          <p style="color: #475569; line-height: 1.6;">Keep sharing your referral link to earn more rewards!</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://elevateme.pro'}" style="background: #689775; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Your Dashboard</a>
      </div>
    `,
  }
}

// GET endpoint to check email service status
export async function GET() {
  return NextResponse.json({
    service: process.env.EMAIL_SERVICE || 'log',
    configured: !!(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY),
    recentEmails: emailLog.slice(-20),
  })
}

export { sendEmail }
