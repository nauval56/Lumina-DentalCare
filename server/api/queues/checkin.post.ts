import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const checkinSchema = z.object({
  appointmentId: z.string().min(1, 'ID appointment diperlukan')
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['RECEPTIONIST', 'ADMIN'])
  const body = await readBody(event)
  const parsed = checkinSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'ID appointment tidak valid.'
    })
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    include: { queue: true, patient: true, doctor: true }
  })

  if (!appointment) {
    throw createError({ statusCode: 404, statusMessage: 'Data appointment tidak ditemukan.' })
  }

  if (appointment.queue) {
    return {
      success: true,
      message: `Pasien sudah melakukan check-in dengan nomor antrean ${appointment.queue.queueNumber}.`,
      queue: appointment.queue
    }
  }

  if (!['CONFIRMED', 'PENDING'].includes(appointment.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Appointment dengan status ${appointment.status} tidak dapat melakukan check-in.`
    })
  }

  const queueDate = new Date(appointment.appointmentDate)
  queueDate.setUTCHours(0, 0, 0, 0)

  const queue = await prisma.$transaction(async (tx) => {
    const lastQueue = await tx.queue.findFirst({
      where: { queueDate },
      orderBy: { sequence: 'desc' }
    })

    const nextSeq = (lastQueue?.sequence ?? 0) + 1
    const queueNumber = `A-${String(nextSeq).padStart(3, '0')}`

    const createdQueue = await tx.queue.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        queueDate,
        queueNumber,
        sequence: nextSeq,
        status: 'WAITING',
        checkedInAt: new Date()
      },
      include: {
        patient: true,
        doctor: true,
        appointment: { include: { service: true } }
      }
    })

    await tx.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CHECKED_IN' }
    })

    if (appointment.patient.userId) {
      await tx.notification.create({
        data: {
          userId: appointment.patient.userId,
          type: 'QUEUE',
          title: `Nomor Antrean Anda: ${queueNumber}`,
          message: `Check-in berhasil. Nomor antrean Anda untuk pemeriksaan bersama ${appointment.doctor.titlePrefix || ''} ${appointment.doctor.fullName} adalah ${queueNumber}.`,
          linkUrl: '/patient'
        }
      })
    }

    return createdQueue
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'QUEUE_CHECKIN',
    entityType: 'Queue',
    entityId: queue.id,
    afterJson: {
      queueNumber: queue.queueNumber,
      appointmentId: appointment.id,
      patientName: appointment.patient.fullName
    }
  })

  return {
    success: true,
    message: `Check-in berhasil. Nomor antrean: ${queue.queueNumber}.`,
    queue
  }
})
