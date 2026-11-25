import { getQuery, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const search = String(query.search || '').trim()
  const gender = String(query.gender || '').trim()
  const page = Math.max(1, Number(query.page || 1))
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)))
  const skip = (page - 1) * limit

  // RBAC: Pasien hanya boleh mengakses data miliknya sendiri
  if (user.role === 'PATIENT') {
    if (!user.patientId) {
      throw createError({ statusCode: 404, statusMessage: 'Profil pasien tidak ditemukan.' })
    }
    const ownPatient = await prisma.patient.findUnique({
      where: { id: user.patientId },
      include: {
        _count: {
          select: { appointments: true, medicalRecords: true, invoices: true }
        }
      }
    })
    return {
      items: ownPatient ? [ownPatient] : [],
      total: ownPatient ? 1 : 0,
      page: 1,
      limit: 1
    }
  }

  if (!['ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Akses ditolak.' })
  }

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { medicalRecordNo: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
      { nik: { contains: search } }
    ]
  }
  if (gender === 'LAKI_LAKI' || gender === 'PEREMPUAN') {
    where.gender = gender
  }

  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: {
        _count: {
          select: { appointments: true, medicalRecords: true, invoices: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.patient.count({ where })
  ])

  return {
    items,
    total,
    page,
    limit
  }
})
