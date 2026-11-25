import { getRouterParam, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID pasien diperlukan.' })
  }

  // RBAC: Pasien hanya boleh mengakses miliknya sendiri
  if (user.role === 'PATIENT' && user.patientId !== id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Akses ditolak. Anda hanya dapat melihat data pasien milik Anda sendiri.'
    })
  }

  // Resepsionis tidak boleh melihat detail rekam medis klinis rahasia tanpa kewenangan medis
  const includeClinical = ['DOCTOR', 'ADMIN', 'PATIENT'].includes(user.role)

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        include: {
          doctor: { select: { id: true, titlePrefix: true, fullName: true, titleSuffix: true, specialization: true } },
          service: { select: { id: true, name: true, price: true, durationMinutes: true } }
        },
        orderBy: { appointmentDate: 'desc' },
        take: 20
      },
      ...(includeClinical
        ? {
            medicalRecords: {
              include: {
                doctor: { select: { id: true, titlePrefix: true, fullName: true, titleSuffix: true } },
                diagnoses: true,
                treatments: true,
                prescriptions: {
                  include: {
                    items: {
                      include: { medicine: { select: { id: true, name: true, unit: true } } }
                    }
                  }
                }
              },
              orderBy: { visitDate: 'desc' }
            },
            odontograms: {
              include: {
                tooth: true,
                doctor: { select: { id: true, titlePrefix: true, fullName: true } }
              },
              orderBy: { recordedAt: 'desc' }
            }
          }
        : {}),
      invoices: {
        include: { payments: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!patient) {
    throw createError({ statusCode: 404, statusMessage: 'Data pasien tidak ditemukan.' })
  }

  return { patient }
})
