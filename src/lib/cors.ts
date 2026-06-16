// ============================================================
// CORS Helper for Public API Routes
// ============================================================
// The /api/track and /api/referral endpoints are called from
// external websites (e.g. when a referred visitor lands on a
// partner's site and clicks an ElevateMe referral link, or when
// a checkout page posts a conversion event back to us).
//
// This helper applies a strict allowlist of origins rather than
// the dangerous `*` wildcard.
// ============================================================

import { NextResponse } from 'next/server'

/**
 * Origins allowed to make cross-origin requests to public API routes.
 * Set as a comma-separated env var ALLOWED_ORIGINS, e.g.:
 *   ALLOWED_ORIGINS=https://elevateme.pro,https://www.elevateme.pro,https://shop.partner.com
 *
 * Same-origin requests (Origin header matches the request host) are
 * always allowed.
 */
function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS || ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Returns true if the given Origin should be allowed to call public APIs.
 */
export function isOriginAllowed(origin: string | null, requestOrigin: string | null): boolean {
  if (!origin) return true // Same-origin requests don't send Origin header
  const allowed = getAllowedOrigins()
  if (allowed.length === 0) {
    // No allowlist configured — only allow same-origin
    return origin === requestOrigin
  }
  return allowed.includes(origin)
}

/**
 * Apply CORS headers to a NextResponse. Call this on every response
 * (success and error) from public API routes.
 */
export function applyCors(
  response: NextResponse,
  origin: string | null,
  requestOrigin: string | null
): NextResponse {
  if (origin && isOriginAllowed(origin, requestOrigin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    )
    response.headers.set('Access-Control-Max-Age', '86400') // 24h preflight cache
    response.headers.set('Vary', 'Origin')
  }
  return response
}

/**
 * Handle a CORS preflight (OPTIONS) request. Returns a 204 with the
 * appropriate headers, or a 403 if the origin is not allowed.
 */
export function handlePreflight(
  origin: string | null,
  requestOrigin: string | null
): NextResponse {
  if (origin && !isOriginAllowed(origin, requestOrigin)) {
    return new NextResponse(null, { status: 403 })
  }
  const response = new NextResponse(null, { status: 204 })
  return applyCors(response, origin, requestOrigin)
}
