import { getRouterParam, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['PATIENT', 'DOCTOR', 'ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID rekam medis diperlukan.' })
  }

  const record = await prisma.medicalRecord.findUnique({
    where: { id },
    include: {
      patient: true,
      doctor: true,
      appointment: { include: { service: true } },
      diagnoses: true,
      treatments: true,
      odontograms: { include: { tooth: true } },
      prescriptions: {
        include: { items: { include: { medicine: true } } }
      }
    }
  })

  if (!record) {
    throw createError({ statusCode: 404, statusMessage: 'Rekam medis tidak ditemukan.' })
  }

  if (user.role === 'PATIENT' && record.patientId !== user.patientId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akses ditolak. Anda hanya dapat mengakses rekam medis milik Anda sendiri.'
    })
  }

  return { medicalRecord: record }
})
