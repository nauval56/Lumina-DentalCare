import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])

  const [medicines, recentTransactions] = await Promise.all([
    prisma.medicine.findMany({
      include: {
        inventory: true,
        batches: { orderBy: { expiryDate: 'asc' } }
      },
      orderBy: { name: 'asc' }
    }),
    prisma.inventoryTransaction.findMany({
      include: {
        medicine: { select: { code: true, name: true, unit: true } },
        batch: { select: { batchNumber: true, expiryDate: true } },
        actor: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
  ])

  return {
    medicines: medicines.map((m) => ({
      ...m,
      unitPrice: Number(m.unitPrice),
      availableStock: m.inventory?.availableStock ?? 0
    })),
    recentTransactions
  }
})
