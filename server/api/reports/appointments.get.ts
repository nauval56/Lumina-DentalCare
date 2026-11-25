import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const query = getQuery(event)
  const from = query.from ? new Date(String(query.from)) : new Date(Date.now() - 30 * 86400000)
  const to = query.to ? new Date(String(query.to)) : new Date(Date.now() + 30 * 86400000)

  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: from, lte: to }
    },
    include: {
      patient: { select: { medicalRecordNo: true, fullName: true } },
      doctor: { select: { titlePrefix: true, fullName: true, specialization: true } },
      service: { select: { name: true, category: true, price: true } }
    },
    orderBy: { appointmentDate: 'desc' }
  })

  return {
    total: appointments.length,
    items: appointments.map((a) => ({
      ...a,
      service: { ...a.service, price: Number(a.service.price) }
    }))
  }
})
