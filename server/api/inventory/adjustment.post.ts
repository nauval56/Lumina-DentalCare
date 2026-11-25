import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const adjustmentSchema = z.object({
  medicineId: z.string().min(1, 'Obat wajib dipilih'),
  batchId: z.string().min(1, 'Batch wajib dipilih'),
  newBatchRemainingQty: z.coerce.number().int().min(0, 'Stok batch tidak boleh negatif'),
  reason: z.string().trim().min(3, 'Alasan penyesuaian stok wajib diisi').max(255)
})

const updateBatchActionSchema = z.object({
  action: z.literal('UPDATE_BATCH'),
  batchId: z.string().min(1, 'ID batch diperlukan'),
  batchNumber: z.string().trim().min(2, 'Nomor batch minimal 2 karakter').max(60).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal kedaluwarsa YYYY-MM-DD').optional(),
  remainingQty: z.coerce.number().int().min(0, 'Sisa stok tidak boleh negatif').optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  supplierName: z.string().trim().max(150).optional().nullable()
})

const deleteBatchActionSchema = z.object({
  action: z.literal('DELETE_BATCH'),
  batchId: z.string().min(1, 'ID batch diperlukan')
})

const deleteMedicineActionSchema = z.object({
  action: z.literal('DELETE_MEDICINE'),
  medicineId: z.string().min(1, 'ID obat diperlukan')
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const rawBody = await readBody(event)

  // 0. Aksi Hapus Master Obat
  if (rawBody?.action === 'DELETE_MEDICINE') {
    const parsedMedDel = deleteMedicineActionSchema.safeParse(rawBody)
    if (!parsedMedDel.success) {
      throw createError({ statusCode: 400, statusMessage: 'ID obat tidak valid.' })
    }
    const id = parsedMedDel.data.medicineId
    const existing = await prisma.medicine.findUnique({
      where: { id },
      include: {
        _count: { select: { prescriptionItems: true } }
      }
    })
    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'Data obat tidak ditemukan.' })
    }

    if (existing._count.prescriptionItems > 0) {
      await prisma.medicine.update({
        where: { id },
        data: { isActive: false }
      })
      return {
        success: true,
        message: `Obat "${existing.name}" memiliki riwayat resep sehingga telah dinonaktifkan dari daftar obat.`
      }
    }

    await prisma.$transaction([
      prisma.inventoryTransaction.deleteMany({ where: { medicineId: id } }),
      prisma.medicineBatch.deleteMany({ where: { medicineId: id } }),
      prisma.inventory.deleteMany({ where: { medicineId: id } }),
      prisma.medicine.delete({ where: { id } })
    ])

    await writeAuditLog(event, {
      actorId: actor.id,
      actorRole: actor.role,
      action: 'MEDICINE_DELETE',
      entityType: 'Medicine',
      entityId: id,
      beforeJson: { code: existing.code, name: existing.name }
    })

    return {
      success: true,
      message: `Obat "${existing.name}" berhasil dihapus.`
    }
  }

  // 1. Aksi Hapus Batch FEFO & Kedaluwarsa
  if (rawBody?.action === 'DELETE_BATCH') {
    const parsedDel = deleteBatchActionSchema.safeParse(rawBody)
    if (!parsedDel.success) {
      throw createError({ statusCode: 400, statusMessage: 'ID batch tidak valid.' })
    }
    const id = parsedDel.data.batchId
    const existing = await prisma.medicineBatch.findUnique({
      where: { id },
      include: { medicine: true }
    })
    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'Batch obat tidak ditemukan.' })
    }

    await prisma.$transaction(async (tx) => {
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
          availableStock: newTotalAvailable,
          reservedStock: 0
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
  }

  // 2. Aksi Edit Batch FEFO & Tanggal Kedaluwarsa
  if (rawBody?.action === 'UPDATE_BATCH') {
    const parsedUpd = updateBatchActionSchema.safeParse(rawBody)
    if (!parsedUpd.success) {
      throw createError({
        statusCode: 400,
        statusMessage: parsedUpd.error.issues[0]?.message || 'Data perubahan batch tidak valid.'
      })
    }
    const d = parsedUpd.data
    const id = d.batchId

    const existing = await prisma.medicineBatch.findUnique({
      where: { id },
      include: { medicine: true }
    })
    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'Batch obat tidak ditemukan.' })
    }

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

    const updatedBatch = await prisma.$transaction(async (tx) => {
      const batch = await tx.medicineBatch.update({
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
          availableStock: newTotalAvailable,
          reservedStock: 0
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
            referenceId: batch.batchNumber,
            notes: `Edit Batch FEFO ${batch.batchNumber} (ED: ${batch.expiryDate.toISOString().slice(0, 10)})`
          }
        })
      }

      return batch
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
        batchNumber: updatedBatch.batchNumber,
        remainingQty: updatedBatch.remainingQty,
        expiryDate: updatedBatch.expiryDate
      }
    })

    return {
      success: true,
      message: `Batch ${updatedBatch.batchNumber} berhasil diperbarui.`,
      batch: updatedBatch
    }
  }

  // 3. Aksi Penyesuaian Stok Opname Standar
  const parsed = adjustmentSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data penyesuaian stok tidak valid.'
    })
  }

  const d = parsed.data
  const result = await prisma.$transaction(async (tx) => {
    const batch = await tx.medicineBatch.findUnique({
      where: { id: d.batchId },
      include: { medicine: { include: { inventory: true } } }
    })

    if (!batch || batch.medicineId !== d.medicineId) {
      throw createError({ statusCode: 404, statusMessage: 'Batch obat tidak ditemukan.' })
    }

    const delta = d.newBatchRemainingQty - batch.remainingQty
    if (delta === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Tidak ada perubahan jumlah stok.' })
    }

    const balanceBefore = batch.medicine.inventory?.availableStock ?? 0
    const balanceAfter = balanceBefore + delta
    if (balanceAfter < 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Penyesuaian ditolak karena menyebabkan total stok menjadi negatif.'
      })
    }

    const updatedBatch = await tx.medicineBatch.update({
      where: { id: batch.id },
      data: { remainingQty: d.newBatchRemainingQty }
    })

    const updatedInventory = await tx.inventory.upsert({
      where: { medicineId: d.medicineId },
      update: { availableStock: balanceAfter },
      create: { medicineId: d.medicineId, availableStock: balanceAfter, reservedStock: 0 }
    })

    const txRecord = await tx.inventoryTransaction.create({
      data: {
        medicineId: d.medicineId,
        batchId: batch.id,
        actorId: actor.id,
        type: delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        quantity: delta,
        balanceBefore,
        balanceAfter,
        referenceType: 'STOCK_OPNAME',
        referenceId: batch.batchNumber,
        notes: d.reason
      }
    })

    return { updatedBatch, updatedInventory, txRecord }
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'INVENTORY_ADJUSTMENT',
    entityType: 'InventoryTransaction',
    entityId: result.txRecord.id,
    afterJson: {
      medicineId: d.medicineId,
      batchId: d.batchId,
      newBatchRemainingQty: d.newBatchRemainingQty,
      reason: d.reason
    }
  })

  return {
    success: true,
    message: 'Penyesuaian stok berhasil dicatat ke Inventory Ledger.',
    ...result
  }
})
