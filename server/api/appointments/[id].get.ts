import { getRouterParam, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID appointment diperlukan.' })
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: true,
      doctor: true,
      service: true,
      queue: true,
      medicalRecord: {
        include: {
          diagnoses: true,
          treatments: true,
          odontograms: { include: { tooth: true } },
          prescriptions: {
            include: { items: { include: { medicine: true } } }
          }
        }
      },
      invoice: {
        include: { payments: true }
      }
    }
  })

  if (!appointment) {
    throw createError({ statusCode: 404, statusMessage: 'Appointment tidak ditemukan.' })
  }

  if (user.role === 'PATIENT' && appointment.patientId !== user.patientId) {
    throw createError({ statusCode: 403, statusMessage: 'Akses ditolak.' })
  }

  return { appointment }
})
