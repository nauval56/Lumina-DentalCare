import type { H3Event } from 'h3'
import { getRequestIP, createError } from 'h3'

interface RateLimitBucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitBucket>()

export function enforceRateLimit(
  event: H3Event,
  keyPrefix: string,
  maxRequests = 15,
  windowMs = 60_000
): void {
  const ip = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'
  const key = `${keyPrefix}:${ip}`
  const now = Date.now()

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  existing.count += 1
  if (existing.count > maxRequests) {
    const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000)
    throw createError({
      statusCode: 429,
      statusMessage: `Terlalu banyak permintaan. Silakan coba kembali dalam ${retryAfterSec} detik.`
    })
  }
}

export function resetRateLimitBuckets(): void {
  buckets.clear()
}
