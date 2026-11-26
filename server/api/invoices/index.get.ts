import { getQuery, setHeader } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const user = await requireRole(event, ['PATIENT', 'RECEPTIONIST', 'ADMIN'])
  const query = getQuery(event)
  const status = String(query.status || '').trim()
  const patientId = String(query.patientId || '').trim()

  const where: Record<string, unknown> = {}
  if (user.role === 'PATIENT') {
    where.patientId = user.patientId ?? '__NONE__'
  } else if (patientId) {
    where.patientId = patientId
  }
  if (status) {
    where.status = status
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      patient: {
        select: { id: true, medicalRecordNo: true, fullName: true, phone: true, email: true }
      },
      appointment: {
        select: {
          id: true,
          bookingCode: true,
          appointmentDate: true,
          doctor: { select: { titlePrefix: true, fullName: true } },
          service: { select: { name: true } }
        }
      },
      payments: {
        include: {
          verifiedBy: { select: { id: true, fullName: true } },
          transactions: true
        },
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  return {
    total: invoices.length,
    items: invoices.map((inv) => ({
      ...inv,
      subtotal: Number(inv.subtotal),
      discount: Number(inv.discount),
      tax: Number(inv.tax),
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      payments: inv.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
        transactions: p.transactions.map((t) => ({
          ...t,
          amount: Number(t.amount)
        }))
      }))
    }))
  }
})
