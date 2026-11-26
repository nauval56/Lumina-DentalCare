import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['RECEPTIONIST', 'DOCTOR', 'ADMIN'])
  const query = getQuery(event)
  const dateStr = String(query.date || new Date().toISOString().slice(0, 10)).trim()
  const doctorId = String(query.doctorId || '').trim()

  const normalizedDate = new Date(`${dateStr}T00:00:00.000Z`)
  const where: Record<string, unknown> = {
    queueDate: normalizedDate
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
          medicalRecord: {
            select: {
              id: true,
              invoices: {
                select: { id: true, invoiceNumber: true, status: true }
              }
            }
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
