import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { hashToken } from '../../utils/crypto'
import { getUserFromSession } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const verifySchema = z.object({
  token: z.string().trim().optional()
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const parsed = verifySchema.safeParse(body)
  const token = parsed.success ? parsed.data.token : undefined

  if (token) {
    const tokenHash = hashToken(token)
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash }
    })

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Token verifikasi akun tidak valid atau telah kedaluwarsa.'
      })
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true, emailVerifiedAt: new Date() }
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() }
      })
    ])

    await writeAuditLog(event, {
      actorId: record.userId,
      action: 'AUTH_EMAIL_VERIFIED',
      entityType: 'User',
      entityId: record.userId
    })

    return {
      success: true,
      message: 'Akun Anda telah berhasil diverifikasi.'
    }
  }

  const sessionUser = await getUserFromSession(event)
  if (!sessionUser) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token verifikasi diperlukan.'
    })
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { isEmailVerified: true, emailVerifiedAt: new Date() }
  })

  await writeAuditLog(event, {
    actorId: sessionUser.id,
    actorRole: sessionUser.role,
    action: 'AUTH_ACCOUNT_VERIFIED',
    entityType: 'User',
    entityId: sessionUser.id
  })

  return {
    success: true,
    message: 'Akun Anda telah berhasil diverifikasi.'
  }
})
