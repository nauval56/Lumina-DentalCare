import { describe, it, expect, beforeEach } from 'vitest'
import { enforceRateLimit, resetRateLimitBuckets } from '../../server/utils/rateLimit'
import type { H3Event } from 'h3'

function createFakeEvent(ip = '10.0.0.15'): H3Event {
  return {
    node: {
      req: {
        headers: {
          'x-forwarded-for': ip,
          'user-agent': 'Vitest-Integration-Suite'
        },
        socket: { remoteAddress: ip }
      }
    },
    context: {}
  } as unknown as H3Event
}

describe('Lumina Dental Care — Integration Tests (Rate Limiting & Security Policy)', () => {
  beforeEach(() => {
    resetRateLimitBuckets()
  })

  it('Blocks brute-force requests exceeding rate limit threshold with HTTP 429', () => {
    const event = createFakeEvent('192.168.1.99')
    for (let i = 0; i < 5; i++) {
      expect(() => enforceRateLimit(event, 'test:login', 5, 60_000)).not.toThrow()
    }
    expect(() => enforceRateLimit(event, 'test:login', 5, 60_000)).toThrow(
      /Terlalu banyak permintaan/
    )
  })
})
