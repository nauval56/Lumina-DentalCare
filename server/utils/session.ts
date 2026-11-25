import type { H3Event } from 'h3'
import { getCookie, setCookie, deleteCookie, getRequestIP, getHeader, createError } from 'h3'
import type { RoleCode } from '@prisma/client'
import { prisma } from './prisma'
import { generateSecureToken, hashToken } from './crypto'

export const SESSION_COOKIE_NAME = 'lumina_session'
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7 // 7 hari

export interface AuthenticatedUser {
  id: string
  fullName: string
  email: string
  phone: string | null
  avatarUrl: string | null
  isActive: boolean
  isEmailVerified: boolean
  role: RoleCode
  roleName: string
  patientId: string | null
  doctorId: string | null
}

export async function createUserSession(event: H3Event, userId: string): Promise<string> {
  const rawToken = generateSecureToken(32)
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const ipAddress = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'
  const userAgent = getHeader(event, 'user-agent') || 'unknown'

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      ipAddress: ipAddress.slice(0, 64),
      userAgent: userAgent.slice(0, 500),
      expiresAt
    }
  })

  setCookie(event, SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt
  })

  return rawToken
}

export async function destroyUserSession(event: H3Event): Promise<void> {
  const rawToken = getCookie(event, SESSION_COOKIE_NAME)
  if (rawToken) {
    const tokenHash = hashToken(rawToken)
    await prisma.session.deleteMany({
      where: { tokenHash }
    }).catch(() => {})
  }
  deleteCookie(event, SESSION_COOKIE_NAME, { path: '/' })
}

export async function getUserFromSession(event: H3Event): Promise<AuthenticatedUser | null> {
  if (event.context.authUser !== undefined) {
    return event.context.authUser
  }

  const rawToken = getCookie(event, SESSION_COOKIE_NAME)
  if (!rawToken) {
    event.context.authUser = null
    return null
  }

  const tokenHash = hashToken(rawToken)
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          role: true,
          patient: { select: { id: true } },
          doctor: { select: { id: true } }
        }
      }
    }
  })

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    }
    deleteCookie(event, SESSION_COOKIE_NAME, { path: '/' })
    event.context.authUser = null
    return null
  }

  const authUser: AuthenticatedUser = {
    id: session.user.id,
    fullName: session.user.fullName,
    email: session.user.email,
    phone: session.user.phone,
    avatarUrl: session.user.avatarUrl,
    isActive: session.user.isActive,
    isEmailVerified: session.user.isEmailVerified,
    role: session.user.role.code,
    roleName: session.user.role.name,
    patientId: session.user.patient?.id ?? null,
    doctorId: session.user.doctor?.id ?? null
  }

  event.context.authUser = authUser
  return authUser
}

export async function requireAuth(event: H3Event): Promise<AuthenticatedUser> {
  const user = await getUserFromSession(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.'
    })
  }
  return user
}

export async function requireRole(event: H3Event, allowedRoles: RoleCode[]): Promise<AuthenticatedUser> {
  const user = await requireAuth(event)
  if (!allowedRoles.includes(user.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akses ditolak. Anda tidak memiliki kewenangan untuk mengakses sumber daya ini.'
    })
  }
  return user
}
