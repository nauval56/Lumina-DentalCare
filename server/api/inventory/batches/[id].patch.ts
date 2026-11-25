import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '../../../utils/prisma'
import { requireRole } from '../../../utils/session'
import { writeAuditLog } from '../../../utils/audit'

const updateBatchSchema = z.object({
  batchNumber: z.string().trim().min(2, 'Nomor batch minimal 2 karakter').max(60).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal kedaluwarsa YYYY-MM-DD').optional(),
  remainingQty: z.coerce.number().int().min(0, 'Sisa stok tidak boleh negatif').optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  supplierName: z.string().trim().max(150).optional().nullable()
})

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

  const body = await readBody(event)
  const parsed = updateBatchSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data perubahan batch tidak valid.'
    })
  }

  const d = parsed.data
  if (d.batchNumber && d.batchNumber !== existing.batchNumber) {
    const dup = await prisma.medicineBatch.findFirst({
      where: {
        medicineId: existing.medicineId,
        batchNumber: d.batchNumber,
        id: { not: id }
      }
    })
    if (dup) {
      throw createError({
        statusCode: 409,
        statusMessage: `Nomor batch ${d.batchNumber} sudah digunakan pada obat ini.`
      })
    }
  }

  const nextRemaining = d.remainingQty !== undefined ? d.remainingQty : existing.remainingQty
  const nextInitial = Math.max(existing.initialQty, nextRemaining)
  const nextExpiry = d.expiryDate ? new Date(`${d.expiryDate}T00:00:00.000Z`) : existing.expiryDate

  const result = await prisma.$transaction(async (tx) => {
    const updatedBatch = await tx.medicineBatch.update({
      where: { id },
      data: {
        batchNumber: d.batchNumber ?? existing.batchNumber,
        expiryDate: nextExpiry,
        remainingQty: nextRemaining,
        initialQty: nextInitial,
        purchasePrice: d.purchasePrice !== undefined ? d.purchasePrice : existing.purchasePrice,
        supplierName: d.supplierName !== undefined ? d.supplierName : existing.supplierName
      }
    })

    const allBatches = await tx.medicineBatch.findMany({
      where: { medicineId: existing.medicineId }
    })
    const now = new Date()
    const newTotalAvailable = allBatches
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
          batchId: id,
          actorId: actor.id,
          type: diff >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity: diff,
          balanceBefore,
          balanceAfter: newTotalAvailable,
          referenceType: 'BATCH_EDIT',
          referenceId: updatedBatch.batchNumber,
          notes: `Edit Batch FEFO ${updatedBatch.batchNumber} (ED: ${updatedBatch.expiryDate.toISOString().slice(0, 10)})`
        }
      })
    }

    return updatedBatch
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'MEDICINE_BATCH_UPDATE',
    entityType: 'MedicineBatch',
    entityId: id,
    beforeJson: {
      batchNumber: existing.batchNumber,
      remainingQty: existing.remainingQty,
      expiryDate: existing.expiryDate
    },
    afterJson: {
      batchNumber: result.batchNumber,
      remainingQty: result.remainingQty,
      expiryDate: result.expiryDate
    }
  })

  return {
    success: true,
    message: `Batch ${result.batchNumber} berhasil diperbarui.`,
    batch: result
  }
})
