import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/session'
import { verifyAppointmentRequest } from '../../services/appointmentVerificationService'
import { writeAuditLog } from '../../utils/audit'

const createAppointmentSchema = z.object({
  patientId: z.string().optional(),
  doctorId: z.string().min(1, 'Dokter wajib dipilih'),
  serviceId: z.string().min(1, 'Layanan wajib dipilih'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal kunjungan harus berformat YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Slot waktu harus berformat HH:mm'),
  chiefComplaint: z.string().trim().min(3, 'Keluhan atau tujuan kunjungan minimal 3 karakter').max(1000),
  notes: z.string().trim().max(500).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const rawBody = (await readBody(event)) || {}
  if (!rawBody.chiefComplaint && typeof rawBody.complaint === 'string') {
    rawBody.chiefComplaint = rawBody.complaint
  }
  const parsed = createAppointmentSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data booking appointment tidak valid.'
    })
  }

  const d = parsed.data
  let targetPatientId = d.patientId

  if (user.role === 'PATIENT') {
    if (!user.patientId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Akun Anda belum terhubung dengan profil pasien.'
      })
    }
    targetPatientId = user.patientId
  } else if (!['RECEPTIONIST', 'ADMIN'].includes(user.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda tidak memiliki hak akses untuk membuat appointment.'
    })
  }

  if (!targetPatientId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Pasien wajib dipilih.'
    })
  }

  // Jalankan Appointment Verification System (PRD Bab 11)
  const verification = await verifyAppointmentRequest({
    patientId: targetPatientId,
    doctorId: d.doctorId,
    serviceId: d.serviceId,
    appointmentDate: d.appointmentDate,
    startTime: d.startTime
  })

  if (!verification.valid || !verification.computedEndTime || !verification.slotKey || !verification.normalizedDate) {
    throw createError({
      statusCode: 422,
      statusMessage: verification.errors[0] || 'Gagal memverifikasi ketersediaan jadwal appointment.',
      data: { errors: verification.errors }
    })
  }

  const bookingCode = `LDC-${d.appointmentDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 8999)}`

  let created
  try {
    created = await prisma.$transaction(async (tx) => {
      // Double check di dalam transaksi untuk mencegah race condition / double booking
      const conflictingSlot = await tx.appointment.findUnique({
        where: { slotKey: verification.slotKey! }
      })
      if (conflictingSlot) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Slot waktu ini baru saja dipesan oleh pasien lain. Silakan pilih slot waktu lainnya.'
        })
      }

      const appointment = await tx.appointment.create({
        data: {
          bookingCode,
          patientId: targetPatientId!,
          doctorId: d.doctorId,
          serviceId: d.serviceId,
          appointmentDate: verification.normalizedDate!,
          startTime: d.startTime,
          endTime: verification.computedEndTime!,
          slotKey: verification.slotKey!,
          status: 'CONFIRMED',
          chiefComplaint: d.chiefComplaint,
          notes: d.notes || null,
          verifiedAt: new Date()
        },
        include: {
          patient: true,
          doctor: true,
          service: true
        }
      })

      if (appointment.patient.userId) {
        await tx.notification.create({
          data: {
            userId: appointment.patient.userId,
            type: 'APPOINTMENT',
            title: `Appointment Terkonfirmasi (#${appointment.bookingCode})`,
            message: `Jadwal perawatan ${appointment.service.name} bersama ${appointment.doctor.titlePrefix || ''} ${appointment.doctor.fullName} pada ${d.appointmentDate} pukul ${d.startTime} WIB telah terkonfirmasi.`,
            linkUrl: '/patient/appointments'
          }
        })
      }

      return appointment
    })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Double booking terdeteksi! Slot waktu dokter tersebut sudah terisi.'
      })
    }
    throw err
  }

  await writeAuditLog(event, {
    actorId: user.id,
    actorRole: user.role,
    action: 'APPOINTMENT_CREATE_CONFIRMED',
    entityType: 'Appointment',
    entityId: created.id,
    afterJson: {
      bookingCode: created.bookingCode,
      patientId: created.patientId,
      doctorId: created.doctorId,
      appointmentDate: d.appointmentDate,
      startTime: created.startTime,
      status: created.status
    }
  })

  return {
    success: true,
    message: 'Appointment berhasil diverifikasi secara otomatis dan berstatus Confirmed.',
    appointment: {
      ...created,
      service: { ...created.service, price: Number(created.service.price) },
      doctor: { ...created.doctor, consultationFee: Number(created.doctor.consultationFee) }
    }
  }
})
