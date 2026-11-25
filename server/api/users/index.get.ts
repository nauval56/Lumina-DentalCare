import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      include: {
        role: true,
        patient: { select: { id: true, medicalRecordNo: true } },
        doctor: { select: { id: true, specialization: true, licenseNumber: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.role.findMany({ orderBy: { code: 'asc' } })
  ])

  return {
    roles,
    items: users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      isActive: u.isActive,
      isEmailVerified: u.isEmailVerified,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      role: u.role.code,
      roleName: u.role.name,
      patient: u.patient,
      doctor: u.doctor
    }))
  }
})
