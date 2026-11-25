import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const includeInactive = query.includeInactive === 'true'
  const specialization = String(query.specialization || '').trim()

  const where: Record<string, unknown> = {}
  if (!includeInactive) {
    where.isActive = true
  }
  if (specialization) {
    where.specialization = { contains: specialization }
  }

  const doctors = await prisma.doctor.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, phone: true, isActive: true } },
      schedules: {
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
      }
    },
    orderBy: [{ isFeatured: 'desc' }, { fullName: 'asc' }]
  })

  return {
    total: doctors.length,
    items: doctors.map((d) => ({
      ...d,
      consultationFee: Number(d.consultationFee)
    }))
  }
})
