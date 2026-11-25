import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { hashPassword, verifyPassword } from '../../utils/crypto'
import { requireAuth } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
  newPassword: z
    .string()
    .min(8, 'Kata sandi baru minimal 8 karakter')
    .max(100)
    .regex(/[A-Za-z]/, 'Kata sandi baru harus mengandung huruf')
    .regex(/[0-9]/, 'Kata sandi baru harus mengandung angka')
})

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)
  const body = await readBody(event)
  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data perubahan kata sandi tidak valid.'
    })
  }

  const dbUser = await prisma.user.findUnique({ where: { id: authUser.id } })
  if (!dbUser || !verifyPassword(parsed.data.currentPassword, dbUser.passwordHash)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Kata sandi saat ini tidak sesuai.'
    })
  }

  await prisma.user.update({
    where: { id: authUser.id },
    data: { passwordHash: hashPassword(parsed.data.newPassword) }
  })

  await writeAuditLog(event, {
    actorId: authUser.id,
    actorRole: authUser.role,
    action: 'AUTH_CHANGE_PASSWORD',
    entityType: 'User',
    entityId: authUser.id
  })

  return {
    success: true,
    message: 'Kata sandi Anda berhasil diperbarui.'
  }
})
