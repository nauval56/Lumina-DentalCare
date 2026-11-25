import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { verifyPassword } from '../../utils/crypto'
import { createUserSession } from '../../utils/session'
import { enforceRateLimit } from '../../utils/rateLimit'
import { writeAuditLog } from '../../utils/audit'

const loginSchema = z.object({
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi')
})

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'auth:login', 15, 60_000)

  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Email dan password wajib diisi.'
    })
  }

  const normalizedEmail = parsed.data.email.toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      role: true,
      patient: { select: { id: true, medicalRecordNo: true } },
      doctor: { select: { id: true, specialization: true } }
    }
  })

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Email atau password yang Anda masukkan salah.'
    })
  }

  if (!user.isActive) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akun Anda sedang dinonaktifkan. Silakan hubungi administrator klinik.'
    })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  })

  await createUserSession(event, user.id)

  await writeAuditLog(event, {
    actorId: user.id,
    actorRole: user.role.code,
    action: 'AUTH_LOGIN',
    entityType: 'User',
    entityId: user.id,
    afterJson: { email: user.email, role: user.role.code }
  })

  return {
    success: true,
    message: 'Login berhasil.',
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      role: user.role.code,
      roleName: user.role.name,
      patientId: user.patient?.id ?? null,
      doctorId: user.doctor?.id ?? null
    }
  }
})
