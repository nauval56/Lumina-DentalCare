import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const query = getQuery(event)
  const from = query.from ? new Date(String(query.from)) : new Date(Date.now() - 30 * 86400000)
  const to = query.to ? new Date(String(query.to)) : new Date()

  const payments = await prisma.payment.findMany({
    where: {
      status: 'SUCCESS',
      createdAt: { gte: from, lte: to }
    },
    include: {
      invoice: {
        include: {
          patient: { select: { medicalRecordNo: true, fullName: true } }
        }
      },
      verifiedBy: { select: { fullName: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    totalRevenue,
    transactionCount: payments.length,
    items: payments.map((p) => ({
      ...p,
      amount: Number(p.amount)
    }))
  }
})
