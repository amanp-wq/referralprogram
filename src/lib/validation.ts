// ============================================================
// API Validation Helpers
// ============================================================
// Centralized Zod schemas + parse helpers used by all /api routes
// that accept external input. Returns a structured 400 response on
// validation failure instead of letting raw DB errors reach client.
// ============================================================

import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'

// ────────────────────────────────────────────────────────────────
// Schemas
// ────────────────────────────────────────────────────────────────

export const emailSchema = z.string().email().max(254).toLowerCase().trim()
export const phoneSchema = z.string().max(20).optional().nullable()
export const urlSchema = z.string().url().max(2048)
export const referralCodeSchema = z.string().min(2).max(50).regex(/^[A-Za-z0-9_-]+$/)
export const uuidSchema = z.string().uuid()
export const cuidSchema = z.string().regex(/^c[a-z0-9]{20,}$/i)

export const affiliateSignupSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: emailSchema,
  password: z.string().min(8).max(128),
  phone: phoneSchema,
  company: z.string().max(100).optional().nullable(),
  referralCode: referralCodeSchema.optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
})

export const referralTrackSchema = z.object({
  referralCode: referralCodeSchema,
  source: z.enum(['social', 'email', 'website', 'direct', 'link']).optional(),
  visitorEmail: emailSchema.optional(),
  visitorName: z.string().max(100).optional(),
  visitorPhone: phoneSchema,
})

export const referralConvertSchema = z.object({
  referralCode: referralCodeSchema,
  visitorEmail: emailSchema,
  visitorName: z.string().max(100).optional(),
  visitorPhone: phoneSchema,
  source: z.enum(['social', 'email', 'website', 'direct', 'link']).optional(),
  notes: z.string().max(2000).optional(),
  // Optional metadata for the conversion event
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const payoutRequestSchema = z.object({
  amount: z.number().positive().max(1000000),
  method: z.enum(['bank', 'upi', 'paypal']),
})

export const commissionCreateSchema = z.object({
  affiliateId: cuidSchema.or(uuidSchema),
  amount: z.number().positive().max(1000000),
  description: z.string().max(500).optional(),
  referralId: cuidSchema.or(uuidSchema).optional(),
})

export const referralStatusUpdateSchema = z.object({
  status: z.enum(['opened', 'submitted', 'pending', 'enrolled', 'not_enrolled', 'cancelled']),
})

export const affiliateStatusUpdateSchema = z.object({
  status: z.enum(['active', 'inactive', 'pending', 'suspended']),
})

export const affiliateImportSchema = z.object({
  affiliates: z.array(z.object({
    name: z.string().min(2).max(100),
    email: emailSchema,
    phone: phoneSchema,
    referralCode: referralCodeSchema.optional(),
    commissionRate: z.number().min(0).max(100).optional(),
    tier: z.enum(['standard', 'pro', 'elite']).optional(),
  })).min(1).max(1000),
})

export const referralImportSchema = z.object({
  referrals: z.array(z.object({
    ambassadorEmail: emailSchema,
    visitorName: z.string().max(100).optional(),
    visitorEmail: emailSchema.optional(),
    visitorPhone: phoneSchema,
    source: z.enum(['social', 'email', 'website', 'direct', 'link']).optional(),
    status: z.enum(['opened', 'submitted', 'pending', 'enrolled', 'not_enrolled', 'cancelled']).optional(),
  })).min(1).max(1000),
})

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse }

export function validateBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): ValidationResult<T> {
  const result = schema.safeParse(body)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return {
    success: false,
    response: validationErrorResponse(result.error),
  }
}

export function validationErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation failed',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    },
    { status: 400 }
  )
}

// Sanitize a free-text string for safe DB storage (basic).
// Strips control characters and trims. Does NOT escape HTML —
// your rendering layer must do that.
export function sanitizeText(value: string | undefined | null, maxLen = 1000): string | null {
  if (!value) return null
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen) || null
}
