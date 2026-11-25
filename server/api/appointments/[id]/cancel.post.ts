import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../utils/session'
import { writeAuditLog } from '../../../utils/audit'

const cancelSchema = z.object({
  reason: z.string().trim().min(3, 'Alasan pembatalan wajib diisi').max(255)
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID appointment diperlukan.' })
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { patient: true }
  })
  if (!appointment) {
    throw createError({ statusCode: 404, statusMessage: 'Appointment tidak ditemukan.' })
  }

  if (user.role === 'PATIENT' && appointment.patientId !== user.patientId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda hanya dapat membatalkan appointment milik Anda sendiri.'
    })
  }

  if (['COMPLETED', 'IN_TREATMENT', 'CANCELLED'].includes(appointment.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Appointment dengan status ${appointment.status} tidak dapat dibatalkan.`
    })
  }

  const body = await readBody(event).catch(() => ({}))
  const parsed = cancelSchema.safeParse(body)
  const cancelReason = parsed.success ? parsed.data.reason : 'Dibatalkan oleh pengguna'

  const updated = await prisma.$transaction(async (tx) => {
    const appt = await tx.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        slotKey: null, // Membebaskan slot waktu agar dapat dipesan kembali
        cancelledAt: new Date(),
        cancelReason
      }
    })

    await tx.queue.updateMany({
      where: { appointmentId: id },
      data: { status: 'CANCELLED' }
    })

    return appt
  })

  await writeAuditLog(event, {
    actorId: user.id,
    actorRole: user.role,
    action: 'APPOINTMENT_CANCEL',
    entityType: 'Appointment',
    entityId: id,
    beforeJson: { status: appointment.status },
    afterJson: { status: 'CANCELLED', cancelReason }
  })

  return {
    success: true,
    message: 'Appointment berhasil dibatalkan.',
    appointment: updated
  }
})
