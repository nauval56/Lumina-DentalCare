import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { hashPassword } from '../../utils/crypto'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const createUserSchema = z.object({
  fullName: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter').max(150),
  email: z.string().trim().email('Email tidak valid'),
  phone: z.string().trim().min(9).max(25).optional(),
  roleCode: z.enum(['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT']),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  isActive: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const rawBody = await readBody(event)
  const parsed = createUserSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data pengguna tidak valid.'
    })
  }

  const d = parsed.data
  const normalizedEmail = d.email.toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Email sudah digunakan oleh akun lain.' })
  }

  const role = await prisma.role.upsert({
    where: { code: d.roleCode },
    update: {},
    create: { code: d.roleCode, name: d.roleCode }
  })

  const created = await prisma.user.create({
    data: {
      roleId: role.id,
      fullName: d.fullName,
      email: normalizedEmail,
      phone: d.phone || null,
      passwordHash: hashPassword(d.password),
      isActive: d.isActive,
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    },
    include: { role: true }
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'USER_CREATE',
    entityType: 'User',
    entityId: created.id,
    afterJson: { email: created.email, role: created.role.code }
  })

  return {
    success: true,
    message: 'Akun pengguna baru berhasil dibuat.',
    user: {
      id: created.id,
      fullName: created.fullName,
      email: created.email,
      role: created.role.code,
      isActive: created.isActive
    }
  }
})
