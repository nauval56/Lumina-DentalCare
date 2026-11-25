import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { verifyAppointmentRequest } from '../../services/appointmentVerificationService'
import { writeAuditLog } from '../../utils/audit'

const updateAppointmentSchema = z.object({
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'CHECKED_IN',
      'IN_TREATMENT',
      'COMPLETED',
      'CANCELLED',
      'RESCHEDULED',
      'NO_SHOW'
    ])
    .optional(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().trim().max(500).optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['RECEPTIONIST', 'DOCTOR', 'ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID appointment diperlukan.' })
  }

  const existing = await prisma.appointment.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Appointment tidak ditemukan.' })
  }

  const body = await readBody(event)
  const parsed = updateAppointmentSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data perubahan appointment tidak valid.'
    })
  }

  const d = parsed.data
  let nextDate = existing.appointmentDate
  let nextStartTime = existing.startTime
  let nextEndTime = existing.endTime
  let nextSlotKey = existing.slotKey
  let nextStatus = d.status ?? existing.status

  // Apabila jadwal diubah (reschedule)
  if (d.appointmentDate || d.startTime) {
    const dateStr = d.appointmentDate || existing.appointmentDate.toISOString().slice(0, 10)
    const startTimeStr = d.startTime || existing.startTime

    const verification = await verifyAppointmentRequest({
      patientId: existing.patientId,
      doctorId: existing.doctorId,
      serviceId: existing.serviceId,
      appointmentDate: dateStr,
      startTime: startTimeStr,
      excludeAppointmentId: existing.id
    })

    if (!verification.valid) {
      throw createError({
        statusCode: 422,
        statusMessage: verification.errors[0] || 'Jadwal pengganti tidak tersedia.'
      })
    }

    nextDate = verification.normalizedDate!
    nextStartTime = startTimeStr
    nextEndTime = verification.computedEndTime!
    nextSlotKey = verification.slotKey!
    if (!d.status) {
      nextStatus = 'CONFIRMED'
    }
  }

  // Kosongkan slotKey jika dibatalkan atau no show agar slot dapat dipakai pasien lain
  if (['CANCELLED', 'NO_SHOW', 'RESCHEDULED'].includes(nextStatus) && !d.appointmentDate && !d.startTime) {
    nextSlotKey = null
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: nextStatus,
      appointmentDate: nextDate,
      startTime: nextStartTime,
      endTime: nextEndTime,
      slotKey: nextSlotKey,
      notes: d.notes !== undefined ? d.notes : existing.notes
    },
    include: {
      patient: true,
      doctor: true,
      service: true,
      queue: true
    }
  })

  if (nextStatus === 'IN_TREATMENT' && updated.queue) {
    await prisma.queue.update({
      where: { id: updated.queue.id },
      data: { status: 'IN_PROGRESS', calledAt: updated.queue.calledAt ?? new Date() }
    })
  } else if (nextStatus === 'COMPLETED' && updated.queue) {
    await prisma.queue.update({
      where: { id: updated.queue.id },
      data: { status: 'COMPLETED', completedAt: new Date() }
    })
  }

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'APPOINTMENT_UPDATE',
    entityType: 'Appointment',
    entityId: id,
    beforeJson: { status: existing.status, startTime: existing.startTime },
    afterJson: { status: updated.status, startTime: updated.startTime }
  })

  return {
    success: true,
    message: 'Data appointment berhasil diperbarui.',
    appointment: updated
  }
})
