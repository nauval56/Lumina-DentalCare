import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'DOCTOR'])
  const query = getQuery(event)
  const medicineId = String(query.medicineId || '').trim()
  const type = String(query.type || '').trim()

  const where: Record<string, unknown> = {}
  if (medicineId) where.medicineId = medicineId
  if (type) where.type = type

  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    include: {
      medicine: { select: { id: true, code: true, name: true, unit: true } },
      batch: { select: { id: true, batchNumber: true, expiryDate: true } },
      actor: { select: { id: true, fullName: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  return {
    items: transactions
  }
})
