import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const status = String(query.status || '').trim()
  const dateStr = String(query.date || '').trim()
  const doctorId = String(query.doctorId || '').trim()
  const patientId = String(query.patientId || '').trim()

  const where: Record<string, unknown> = {}

  // RBAC filtering
  if (user.role === 'PATIENT') {
    where.patientId = user.patientId ?? '__NONE__'
  } else if (user.role === 'DOCTOR') {
    where.doctorId = user.doctorId ?? '__NONE__'
  } else {
    if (doctorId) where.doctorId = doctorId
    if (patientId) where.patientId = patientId
  }

  if (status) {
    where.status = status
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    where.appointmentDate = new Date(`${dateStr}T00:00:00.000Z`)
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: {
        select: {
          id: true,
          medicalRecordNo: true,
          fullName: true,
          phone: true,
          gender: true,
          dateOfBirth: true,
          allergies: true
        }
      },
      doctor: {
        select: {
          id: true,
          titlePrefix: true,
          fullName: true,
          titleSuffix: true,
          specialization: true,
          consultationFee: true
        }
      },
      service: {
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          price: true,
          durationMinutes: true
        }
      },
      queue: true,
      medicalRecord: {
        select: { id: true, visitDate: true, chiefComplaint: true, assessment: true }
      },
      invoice: {
        select: { id: true, invoiceNumber: true, totalAmount: true, status: true }
      }
    },
    orderBy: [{ appointmentDate: 'desc' }, { startTime: 'asc' }],
    take: 100
  })

  return {
    total: appointments.length,
    items: appointments.map((a) => ({
      ...a,
      doctor: {
        ...a.doctor,
        consultationFee: Number(a.doctor.consultationFee)
      },
      service: {
        ...a.service,
        price: Number(a.service.price)
      },
      invoice: a.invoice
        ? {
            ...a.invoice,
            totalAmount: Number(a.invoice.totalAmount)
          }
        : null
    }))
  }
})
