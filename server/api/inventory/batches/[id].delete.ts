import { getRouterParam, createError } from 'h3'
import { prisma } from '../../../utils/prisma'
import { requireRole } from '../../../utils/session'
import { writeAuditLog } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID batch diperlukan.' })
  }

  const existing = await prisma.medicineBatch.findUnique({
    where: { id },
    include: { medicine: true }
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Batch obat tidak ditemukan.' })
  }

  await prisma.$transaction(async (tx) => {
    // Lepaskan relasi batchId pada histori transaksi sebelum menghapus batch
    await tx.inventoryTransaction.updateMany({
      where: { batchId: id },
      data: { batchId: null }
    })

    await tx.medicineBatch.delete({ where: { id } })

    const remainingBatches = await tx.medicineBatch.findMany({
      where: { medicineId: existing.medicineId }
    })
    const now = new Date()
    const newTotalAvailable = remainingBatches
      .filter((b) => new Date(b.expiryDate) > now && b.remainingQty > 0)
      .reduce((sum, b) => sum + b.remainingQty, 0)

    const inv = await tx.inventory.findUnique({
      where: { medicineId: existing.medicineId }
    })
    const balanceBefore = inv?.availableStock ?? 0
    const diff = newTotalAvailable - balanceBefore

    await tx.inventory.upsert({
      where: { medicineId: existing.medicineId },
      update: { availableStock: newTotalAvailable },
      create: {
        medicineId: existing.medicineId,
        availableStock: newTotalAvailable
      }
    })

    if (diff !== 0) {
      await tx.inventoryTransaction.create({
        data: {
          medicineId: existing.medicineId,
          actorId: actor.id,
          type: diff >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity: diff,
          balanceBefore,
          balanceAfter: newTotalAvailable,
          referenceType: 'BATCH_DELETE',
          referenceId: existing.batchNumber,
          notes: `Hapus Batch FEFO ${existing.batchNumber} (${existing.medicine.name})`
        }
      })
    }
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'MEDICINE_BATCH_DELETE',
    entityType: 'MedicineBatch',
    entityId: id,
    beforeJson: {
      batchNumber: existing.batchNumber,
      remainingQty: existing.remainingQty,
      expiryDate: existing.expiryDate
    }
  })

  return {
    success: true,
    message: `Batch ${existing.batchNumber} berhasil dihapus dan stok telah disinkronkan.`
  }
})
