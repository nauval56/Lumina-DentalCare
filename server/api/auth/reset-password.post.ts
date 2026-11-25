import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { hashPassword, hashToken } from '../../utils/crypto'
import { enforceRateLimit } from '../../utils/rateLimit'
import { writeAuditLog } from '../../utils/audit'

const resetSchema = z.object({
  token: z.string().trim().min(10, 'Token reset password tidak valid'),
  newPassword: z
    .string()
    .min(8, 'Password baru minimal 8 karakter')
    .max(100)
    .regex(/[A-Za-z]/, 'Password harus mengandung huruf')
    .regex(/[0-9]/, 'Password harus mengandung angka')
})

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'auth:reset', 8, 60_000)

  const body = await readBody(event)
  const parsed = resetSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Input reset password tidak valid.'
    })
  }

  const tokenHash = hashToken(parsed.data.token)
  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  })

  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token reset password tidak ditemukan, sudah digunakan, atau telah kedaluwarsa.'
    })
  }

  const newPasswordHash = hashPassword(parsed.data.newPassword)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash: newPasswordHash }
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() }
    }),
    prisma.session.deleteMany({
      where: { userId: resetRecord.userId }
    })
  ])

  await writeAuditLog(event, {
    actorId: resetRecord.userId,
    action: 'AUTH_RESET_PASSWORD_SUCCESS',
    entityType: 'User',
    entityId: resetRecord.userId
  })

  return {
    success: true,
    message: 'Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru Anda.'
  }
})
