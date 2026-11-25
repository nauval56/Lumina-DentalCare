import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const updateDoctorSchema = z.object({
  licenseNumber: z.string().trim().min(4).optional(),
  titlePrefix: z.string().trim().max(30).optional(),
  fullName: z.string().trim().min(3).max(150).optional(),
  titleSuffix: z.string().trim().max(50).optional().nullable(),
  specialization: z.string().trim().min(3).max(120).optional(),
  bio: z.string().trim().max(1000).optional().nullable(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  education: z.string().trim().max(255).optional().nullable(),
  consultationFee: z.coerce.number().min(0).optional(),
  photoUrl: z.string().trim().max(500).optional().nullable(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID dokter diperlukan.' })
  }

  const existing = await prisma.doctor.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Dokter tidak ditemukan.' })
  }

  const body = await readBody(event)
  const parsed = updateDoctorSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data dokter tidak valid.'
    })
  }

  const d = parsed.data
  const updated = await prisma.doctor.update({
    where: { id },
    data: {
      licenseNumber: d.licenseNumber ?? existing.licenseNumber,
      titlePrefix: d.titlePrefix ?? existing.titlePrefix,
      fullName: d.fullName ?? existing.fullName,
      titleSuffix: d.titleSuffix !== undefined ? d.titleSuffix : existing.titleSuffix,
      specialization: d.specialization ?? existing.specialization,
      bio: d.bio !== undefined ? d.bio : existing.bio,
      experienceYears: d.experienceYears ?? existing.experienceYears,
      education: d.education !== undefined ? d.education : existing.education,
      consultationFee: d.consultationFee ?? existing.consultationFee,
      photoUrl: d.photoUrl !== undefined ? d.photoUrl : existing.photoUrl,
      isFeatured: d.isFeatured ?? existing.isFeatured,
      isActive: d.isActive ?? existing.isActive
    }
  })

  if (d.isActive !== undefined) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: { isActive: d.isActive }
    }).catch(() => {})
  }

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'DOCTOR_UPDATE',
    entityType: 'Doctor',
    entityId: id,
    beforeJson: { fullName: existing.fullName, isActive: existing.isActive },
    afterJson: { fullName: updated.fullName, isActive: updated.isActive }
  })

  return {
    success: true,
    message: 'Data dokter berhasil diperbarui.',
    doctor: {
      ...updated,
      consultationFee: Number(updated.consultationFee)
    }
  }
})
