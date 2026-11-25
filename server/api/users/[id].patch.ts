import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { hashPassword } from '../../utils/crypto'
import { writeAuditLog } from '../../utils/audit'

const updateUserSchema = z.object({
  fullName: z.string().trim().min(3).max(150).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(25).optional().nullable(),
  password: z.string().min(8).max(100).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  roleCode: z.enum(['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT']).optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID pengguna diperlukan.' })
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { role: true }
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Pengguna tidak ditemukan.' })
  }

  const body = await readBody(event)
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Data perubahan pengguna tidak valid.' })
  }

  const d = parsed.data
  if (d.email && d.email.toLowerCase() !== existing.email) {
    const dup = await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } })
    if (dup) {
      throw createError({ statusCode: 409, statusMessage: 'Email sudah digunakan oleh pengguna lain.' })
    }
  }

  let nextRoleId = existing.roleId
  if (d.roleCode) {
    const role = await prisma.role.findUnique({ where: { code: d.roleCode } })
    if (role) nextRoleId = role.id
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      fullName: d.fullName ?? existing.fullName,
      email: d.email ? d.email.toLowerCase() : existing.email,
      phone: d.phone !== undefined ? d.phone : existing.phone,
      passwordHash: d.password && d.password.length >= 8 ? hashPassword(d.password) : existing.passwordHash,
      isActive: d.isActive ?? existing.isActive,
      roleId: nextRoleId
    },
    include: { role: true }
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'USER_UPDATE',
    entityType: 'User',
    entityId: id,
    beforeJson: { email: existing.email, isActive: existing.isActive, role: existing.role.code },
    afterJson: { email: updated.email, isActive: updated.isActive, role: updated.role.code }
  })

  return {
    success: true,
    message: 'Data akun pengguna berhasil diperbarui.',
    user: {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      isActive: updated.isActive,
      role: updated.role.code
    }
  }
})
