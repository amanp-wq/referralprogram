// ============================================================
// In-memory IP rate limiter
// ============================================================
// Simple sliding-window rate limiter using a Map. Suitable for
// single-instance deployments (Vercel hobby, self-hosted, etc.).
//
// For multi-instance production (Vercel Pro/Enterprise with multiple
// regions or many serverless instances), replace this with Upstash
// Redis + @upstash/ratelimit:
//
//   import { Ratelimit } from '@upstash/ratelimit'
//   import { Redis } from '@upstash/redis'
//   const ratelimit = new Ratelimit({
//     redis: Redis.fromEnv(),
//     limiter: Ratelimit.slidingWindow(30, '1 m'),
//   })
//   const { success } = await ratelimit.limit(`track:${ip}`)
//
// The interface (checkRateLimit returning boolean) stays the same,
// so callers don't need to change.
// ============================================================

import type { NextRequest } from 'next/server'

interface RateBucket {
  hits: number[]
  windowMs: number
  maxHits: number
}

const buckets = new Map<string, RateBucket>()

// GC interval — old buckets cleaned up every 5 minutes
const GC_INTERVAL_MS = 5 * 60 * 1000
let lastGc = Date.now()

/**
 * Returns the client IP from a Next.js request, normalized to a single
 * IPv4/IPv6 string (takes the first IP from x-forwarded-for).
 */
export function getClientIp(request: NextRequest | Request): string | null {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const xRealIp = request.headers.get('x-real-ip')
  if (xRealIp) return xRealIp.trim()
  return null
}

/**
 * Check whether a request identified by `key` should be allowed
 * given a `maxHits` allowance per `windowMs` window. Side-effecting:
 * records the hit on success.
 *
 * Returns true if allowed, false if rate-limited.
 */
export function checkRateLimit(
  key: string,
  maxHits: number,
  windowMs: number
): boolean {
  const now = Date.now()

  // Periodic GC — drop stale buckets to avoid memory growth
  if (now - lastGc > GC_INTERVAL_MS) {
    for (const [k, bucket] of buckets) {
      bucket.hits = bucket.hits.filter((t) => now - t < bucket.windowMs)
      if (bucket.hits.length === 0) buckets.delete(k)
    }
    lastGc = now
  }

  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { hits: [], windowMs, maxHits }
    buckets.set(key, bucket)
  }

  // Drop timestamps outside the window
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)

  if (bucket.hits.length >= maxHits) {
    return false
  }

  bucket.hits.push(now)
  return true
}

/**
 * Reset the rate limit for a key (admin/debug only).
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key)
}

/**
 * Get current hit count for a key (for debugging/observability).
 */
export function getHitCount(key: string): number {
  const bucket = buckets.get(key)
  if (!bucket) return 0
  const now = Date.now()
  return bucket.hits.filter((t) => now - t < bucket.windowMs).length
}
