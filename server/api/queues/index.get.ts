import { getQuery, setHeader } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

function getWibTodayStr() {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const user = await requireRole(event, ['RECEPTIONIST', 'DOCTOR', 'ADMIN'])
  const query = getQuery(event)
  const showAll = query.all === '1' || query.all === 'true'
  const dateStr = String(query.date || getWibTodayStr()).trim()
  const doctorId = String(query.doctorId || '').trim()

  const where: Record<string, unknown> = {}
  if (!showAll && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`)
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`)
    where.queueDate = { gte: dayStart, lte: dayEnd }
  }

  if (user.role === 'DOCTOR' && user.doctorId) {
    where.doctorId = user.doctorId
  } else if (doctorId) {
    where.doctorId = doctorId
  }

  const queues = await prisma.queue.findMany({
    where,
    include: {
      patient: {
        select: { id: true, medicalRecordNo: true, fullName: true, phone: true, allergies: true }
      },
      doctor: {
        select: { id: true, titlePrefix: true, fullName: true, titleSuffix: true, specialization: true }
      },
      appointment: {
        include: {
          service: { select: { id: true, name: true, durationMinutes: true } },
          invoice: {
            select: { id: true, invoiceNumber: true, status: true }
          }
        }
      }
    },
    orderBy: { sequence: 'asc' }
  })

  return {
    date: dateStr,
    items: queues
  }
})
