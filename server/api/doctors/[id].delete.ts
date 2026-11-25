import { getRouterParam, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID dokter diperlukan.' })
  }

  const existing = await prisma.doctor.findUnique({
    where: { id },
    include: {
      _count: {
        select: { appointments: true, medicalRecords: true }
      }
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Dokter tidak ditemukan.' })
  }

  if (existing._count.medicalRecords > 0 || existing._count.appointments > 0) {
    await prisma.doctor.update({
      where: { id },
      data: { isActive: false }
    })
    await prisma.user.update({
      where: { id: existing.userId },
      data: { isActive: false }
    }).catch(() => {})

    await writeAuditLog(event, {
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DOCTOR_DEACTIVATE_INSTEAD_OF_DELETE',
      entityType: 'Doctor',
      entityId: id,
      beforeJson: { fullName: existing.fullName, isActive: existing.isActive }
    })

    return {
      success: true,
      message: 'Dokter memiliki riwayat medis/appointment sehingga statusnya dinonaktifkan demi integritas data.'
    }
  }

  await prisma.$transaction([
    prisma.schedule.deleteMany({ where: { doctorId: id } }),
    prisma.doctor.delete({ where: { id } })
  ])

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'DOCTOR_DELETE',
    entityType: 'Doctor',
    entityId: id,
    beforeJson: { fullName: existing.fullName, licenseNumber: existing.licenseNumber }
  })

  return {
    success: true,
    message: 'Data dokter berhasil dihapus.'
  }
})
