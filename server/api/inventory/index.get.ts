import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN', 'DOCTOR'])

  const now = new Date()
  const nearExpiryThreshold = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60) // 60 hari

  const medicines = await prisma.medicine.findMany({
    where: { isActive: true },
    include: {
      inventory: true,
      batches: {
        orderBy: { expiryDate: 'asc' }
      }
    },
    orderBy: { name: 'asc' }
  })

  const items = medicines.map((m) => {
    const availableStock = m.inventory?.availableStock ?? 0
    const isLowStock = availableStock <= m.minimumStock
    const activeBatches = m.batches.filter((b) => b.remainingQty > 0)
    const expiredBatches = activeBatches.filter((b) => new Date(b.expiryDate) <= now)
    const nearExpiryBatches = activeBatches.filter(
      (b) => new Date(b.expiryDate) > now && new Date(b.expiryDate) <= nearExpiryThreshold
    )

    return {
      id: m.id,
      code: m.code,
      name: m.name,
      genericName: m.genericName,
      category: m.category,
      unit: m.unit,
      unitPrice: Number(m.unitPrice),
      minimumStock: m.minimumStock,
      availableStock,
      lastRestockAt: m.inventory?.lastRestockAt ?? null,
      isLowStock,
      hasNearExpiry: nearExpiryBatches.length > 0,
      hasExpired: expiredBatches.length > 0,
      nextExpiryDate: activeBatches[0]?.expiryDate ?? null,
      batches: m.batches.map((b) => ({
        ...b,
        purchasePrice: Number(b.purchasePrice),
        isExpired: new Date(b.expiryDate) <= now,
        isNearExpiry:
          new Date(b.expiryDate) > now && new Date(b.expiryDate) <= nearExpiryThreshold
      }))
    }
  })

  return {
    summary: {
      totalMedicines: items.length,
      lowStockCount: items.filter((i) => i.isLowStock).length,
      nearExpiryCount: items.filter((i) => i.hasNearExpiry).length,
      expiredCount: items.filter((i) => i.hasExpired).length
    },
    items
  }
})
