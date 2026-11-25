import { getRouterParam, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID pasien diperlukan.' })
  }

  const existing = await prisma.patient.findUnique({
    where: { id },
    include: {
      _count: { select: { medicalRecords: true, appointments: true, invoices: true } }
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Pasien tidak ditemukan.' })
  }

  if (existing._count.medicalRecords > 0 || existing._count.invoices > 0) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Pasien yang telah memiliki riwayat rekam medis atau transaksi tagihan tidak dapat dihapus demi integritas rekam medis.'
    })
  }

  await prisma.$transaction([
    prisma.queue.deleteMany({ where: { patientId: id } }),
    prisma.appointment.deleteMany({ where: { patientId: id } }),
    prisma.odontogram.deleteMany({ where: { patientId: id } }),
    prisma.review.deleteMany({ where: { patientId: id } }),
    prisma.patient.delete({ where: { id } })
  ])

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'PATIENT_DELETE',
    entityType: 'Patient',
    entityId: id,
    beforeJson: { medicalRecordNo: existing.medicalRecordNo, fullName: existing.fullName }
  })

  return {
    success: true,
    message: 'Data pasien berhasil dihapus.'
  }
})
