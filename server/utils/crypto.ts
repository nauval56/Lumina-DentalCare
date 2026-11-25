import { randomBytes, scryptSync, timingSafeEqual, createHash, createHmac } from 'node:crypto'

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64
}

/**
 * Hash password menggunakan memory-hard scrypt (setara kekuatan Argon2id)
 * Format: $scrypt$N=16384,r=8,p=1$<saltHex>$<hashHex>
 */
export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = scryptSync(plainPassword, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p
  })
  return `$scrypt$N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}$${salt}$${derivedKey.toString('hex')}`
}

/**
 * Verifikasi password dengan timing-safe comparison
 */
export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split('$').filter(Boolean)
    if (parts.length !== 4 || parts[0] !== 'scrypt') {
      return false
    }
    const salt = parts[2]
    const expectedHex = parts[3]
    if (!salt || !expectedHex) return false

    const derivedKey = scryptSync(plainPassword, salt, SCRYPT_PARAMS.keylen, {
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p
    })
    const expectedBuf = Buffer.from(expectedHex, 'hex')
    if (derivedKey.length !== expectedBuf.length) return false
    return timingSafeEqual(derivedKey, expectedBuf)
  } catch {
    return false
  }
}

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

export function createWebhookSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false
  const expected = createWebhookSignature(payload, secret)
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length) return false
  return timingSafeEqual(sigBuf, expBuf)
}
