import { getQuery, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

export default defineEventHandler(async (event) => {
  // RBAC: Hanya PATIENT (milik sendiri), DOCTOR, dan ADMIN yang berwenang melihat rekam medis
  const user = await requireRole(event, ['PATIENT', 'DOCTOR', 'ADMIN'])
  const query = getQuery(event)
  const patientId = String(query.patientId || '').trim()

  const where: Record<string, unknown> = {}

  if (user.role === 'PATIENT') {
    if (!user.patientId) {
      throw createError({ statusCode: 403, statusMessage: 'Profil pasien tidak ditemukan.' })
    }
    where.patientId = user.patientId
  } else if (patientId) {
    where.patientId = patientId
  } else if (user.role === 'DOCTOR' && user.doctorId && query.all !== 'true') {
    where.doctorId = user.doctorId
  }

  const records = await prisma.medicalRecord.findMany({
    where,
    include: {
      patient: {
        select: {
          id: true,
          medicalRecordNo: true,
          fullName: true,
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
      appointment: {
        select: {
          id: true,
          bookingCode: true,
          appointmentDate: true,
          startTime: true,
          invoice: {
            select: { id: true, invoiceNumber: true, totalAmount: true, status: true }
          }
        }
      },
      diagnoses: true,
      treatments: true,
      odontograms: {
        include: { tooth: true }
      },
      prescriptions: {
        include: {
          items: {
            include: {
              medicine: { select: { id: true, code: true, name: true, unit: true, unitPrice: true } }
            }
          }
        }
      }
    },
    orderBy: { visitDate: 'desc' },
    take: 100
  })

  return {
    items: records.map((r) => ({
      ...r,
      doctor: {
        ...r.doctor,
        consultationFee: Number(r.doctor.consultationFee || 0)
      },
      appointment: r.appointment
        ? {
            ...r.appointment,
            invoice: r.appointment.invoice
              ? {
                  ...r.appointment.invoice,
                  totalAmount: Number(r.appointment.invoice.totalAmount || 0)
                }
              : null
          }
        : null,
      treatments: r.treatments.map((t) => ({ ...t, fee: Number(t.fee) })),
      prescriptions: r.prescriptions.map((rx) => ({
        ...rx,
        items: rx.items.map((it) => ({
          ...it,
          unitPrice: Number(it.unitPrice || it.medicine?.unitPrice || 0)
        }))
      }))
    }))
  }
})
