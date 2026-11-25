import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])

  const patients = await prisma.patient.findMany({
    include: {
      _count: {
        select: { appointments: true, medicalRecords: true, invoices: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return {
    total: patients.length,
    items: patients
  }
})
