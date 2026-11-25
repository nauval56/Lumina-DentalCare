import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['DOCTOR', 'ADMIN', 'RECEPTIONIST'])
  const query = getQuery(event)
  const search = String(query.search || '').trim()

  const where: Record<string, unknown> = { isActive: true }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { genericName: { contains: search } }
    ]
  }

  const medicines = await prisma.medicine.findMany({
    where,
    include: {
      inventory: true,
      batches: {
        where: { remainingQty: { gt: 0 } },
        orderBy: { expiryDate: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  })

  return {
    items: medicines.map((m) => ({
      ...m,
      unitPrice: Number(m.unitPrice),
      availableStock: m.inventory?.availableStock ?? 0,
      batches: m.batches.map((b) => ({
        ...b,
        purchasePrice: Number(b.purchasePrice)
      }))
    }))
  }
})
