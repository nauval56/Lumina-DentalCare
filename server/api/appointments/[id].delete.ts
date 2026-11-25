import { getRouterParam, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN', 'RECEPTIONIST'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID appointment diperlukan.' })
  }

  const existing = await prisma.appointment.findUnique({
    where: { id },
    include: {
      medicalRecord: { select: { id: true } },
      invoice: { select: { id: true, status: true } }
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Data appointment tidak ditemukan.' })
  }

  if (existing.medicalRecord || (existing.invoice && existing.invoice.status === 'PAID')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Appointment yang sudah memiliki rekam medis atau pembayaran lunas tidak dapat dihapus.'
    })
  }

  await prisma.$transaction([
    prisma.queue.deleteMany({ where: { appointmentId: id } }),
    prisma.appointment.delete({ where: { id } })
  ])

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'APPOINTMENT_DELETE',
    entityType: 'Appointment',
    entityId: id,
    beforeJson: { bookingCode: existing.bookingCode, status: existing.status }
  })

  return {
    success: true,
    message: 'Data appointment berhasil dihapus.'
  }
})
