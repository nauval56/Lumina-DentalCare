import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const doctorId = String(query.doctorId || '').trim()

  const where: Record<string, unknown> = {}
  if (doctorId) {
    where.doctorId = doctorId
  }

  const [schedules, holidays] = await Promise.all([
    prisma.schedule.findMany({
      where,
      include: {
        doctor: {
          select: { id: true, titlePrefix: true, fullName: true, titleSuffix: true, specialization: true }
        }
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    }),
    prisma.clinicHoliday.findMany({
      orderBy: { date: 'asc' }
    })
  ])

  return {
    items: schedules,
    holidays
  }
})
