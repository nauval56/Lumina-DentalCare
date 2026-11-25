import { createError } from 'h3'
import type { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'

export interface FefoAllocationItem {
  batchId: string
  batchNumber: string
  expiryDate: Date
  deductedQty: number
}

/**
 * Pure helper untuk mengalokasikan pengeluaran stok menggunakan algoritma FEFO
 * (First Expired, First Out) dan mengabaikan batch yang sudah kedaluwarsa.
 */
export function allocateFefoBatches(
  batches: Array<{
    id: string
    batchNumber: string
    expiryDate: Date
    remainingQty: number
  }>,
  requestedQty: number,
  referenceDate: Date = new Date()
): FefoAllocationItem[] {
  if (requestedQty <= 0) {
    throw new Error('Jumlah pengeluaran stok harus lebih dari 0.')
  }

  const validBatches = batches
    .filter((b) => b.remainingQty > 0 && new Date(b.expiryDate) > referenceDate)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())

  const totalValidStock = validBatches.reduce((sum, b) => sum + b.remainingQty, 0)
  if (totalValidStock < requestedQty) {
    throw new Error(
      `Stok obat aktif (belum kedaluwarsa) tidak mencukupi. Tersedia: ${totalValidStock}, dibutuhkan: ${requestedQty}.`
    )
  }

  const allocations: FefoAllocationItem[] = []
  let remainingToDeduct = requestedQty

  for (const batch of validBatches) {
    if (remainingToDeduct <= 0) break
    const deduct = Math.min(batch.remainingQty, remainingToDeduct)
    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      deductedQty: deduct
    })
    remainingToDeduct -= deduct
  }

  return allocations
}

/**
 * Mencatat stok masuk (Stock In) beserta batch dan tanggal kedaluwarsa ke Inventory Ledger
 */
export async function recordStockIn(params: {
  medicineId: string
  batchNumber: string
  expiryDate: Date
  quantity: number
  purchasePrice: number
  supplierName?: string
  actorId?: string | null
  notes?: string
}) {
  if (params.quantity <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Jumlah stok masuk harus lebih dari 0.' })
  }
  if (params.expiryDate <= new Date()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tidak dapat memasukkan batch obat yang sudah kedaluwarsa.'
    })
  }

  return await prisma.$transaction(async (tx) => {
    const medicine = await tx.medicine.findUnique({
      where: { id: params.medicineId },
      include: { inventory: true }
    })

    if (!medicine) {
      throw createError({ statusCode: 404, statusMessage: 'Data obat tidak ditemukan.' })
    }

    const currentStock = medicine.inventory?.availableStock ?? 0
    const nextStock = currentStock + params.quantity

    const existingBatch = await tx.medicineBatch.findUnique({
      where: {
        medicineId_batchNumber: {
          medicineId: params.medicineId,
          batchNumber: params.batchNumber
        }
      }
    })

    const batch = existingBatch
      ? await tx.medicineBatch.update({
          where: { id: existingBatch.id },
          data: {
            initialQty: { increment: params.quantity },
            remainingQty: { increment: params.quantity },
            purchasePrice: params.purchasePrice,
            supplierName: params.supplierName ?? existingBatch.supplierName
          }
        })
      : await tx.medicineBatch.create({
          data: {
            medicineId: params.medicineId,
            batchNumber: params.batchNumber,
            expiryDate: params.expiryDate,
            initialQty: params.quantity,
            remainingQty: params.quantity,
            purchasePrice: params.purchasePrice,
            supplierName: params.supplierName ?? null
          }
        })

    const inventory = await tx.inventory.upsert({
      where: { medicineId: params.medicineId },
      update: {
        availableStock: nextStock,
        lastRestockAt: new Date()
      },
      create: {
        medicineId: params.medicineId,
        availableStock: nextStock,
        reservedStock: 0,
        lastRestockAt: new Date()
      }
    })

    const transaction = await tx.inventoryTransaction.create({
      data: {
        medicineId: params.medicineId,
        batchId: batch.id,
        actorId: params.actorId ?? null,
        type: 'STOCK_IN',
        quantity: params.quantity,
        balanceBefore: currentStock,
        balanceAfter: nextStock,
        referenceType: 'PURCHASE',
        referenceId: batch.batchNumber,
        notes: params.notes || `Stok masuk batch ${batch.batchNumber}`
      }
    })

    return { inventory, batch, transaction }
  })
}

/**
 * Mengeluarkan stok obat menggunakan prinsip FEFO (First Expired, First Out)
 * Mencegah stok negatif dan menolak pengeluaran obat kedaluwarsa.
 */
export async function recordStockOutFefo(
  params: {
    medicineId: string
    quantity: number
    actorId?: string | null
    type?: 'STOCK_OUT' | 'PRESCRIPTION_DISPENSE'
    referenceType?: string
    referenceId?: string
    notes?: string
  },
  externalTx?: Prisma.TransactionClient
) {
  const execute = async (tx: Prisma.TransactionClient) => {
    const medicine = await tx.medicine.findUnique({
      where: { id: params.medicineId },
      include: {
        inventory: true,
        batches: {
          where: { remainingQty: { gt: 0 } },
          orderBy: { expiryDate: 'asc' }
        }
      }
    })

    if (!medicine) {
      throw createError({ statusCode: 404, statusMessage: 'Obat tidak ditemukan.' })
    }

    const now = new Date()
    let allocations: FefoAllocationItem[]
    try {
      allocations = allocateFefoBatches(medicine.batches, params.quantity, now)
    } catch (err) {
      throw createError({
        statusCode: 400,
        statusMessage: `${medicine.name}: ${(err as Error).message}`
      })
    }

    let runningBalance = medicine.inventory?.availableStock ?? 0
    if (runningBalance < params.quantity) {
      throw createError({
        statusCode: 400,
        statusMessage: `Stok ${medicine.name} tidak mencukupi (tersedia ${runningBalance}, diminta ${params.quantity}).`
      })
    }

    const ledgerEntries = []

    for (const alloc of allocations) {
      const balanceBefore = runningBalance
      const balanceAfter = runningBalance - alloc.deductedQty
      runningBalance = balanceAfter

      await tx.medicineBatch.update({
        where: { id: alloc.batchId },
        data: {
          remainingQty: { decrement: alloc.deductedQty }
        }
      })

      const entry = await tx.inventoryTransaction.create({
        data: {
          medicineId: params.medicineId,
          batchId: alloc.batchId,
          actorId: params.actorId ?? null,
          type: params.type ?? 'STOCK_OUT',
          quantity: -alloc.deductedQty,
          balanceBefore,
          balanceAfter,
          referenceType: params.referenceType ?? 'MANUAL_OUT',
          referenceId: params.referenceId ?? alloc.batchNumber,
          notes:
            params.notes ||
            `Pengeluaran FEFO batch ${alloc.batchNumber} (ED: ${alloc.expiryDate.toISOString().slice(0, 10)})`
        }
      })
      ledgerEntries.push(entry)
    }

    const updatedInventory = await tx.inventory.update({
      where: { medicineId: params.medicineId },
      data: {
        availableStock: runningBalance
      }
    })

    return {
      medicine,
      inventory: updatedInventory,
      allocations,
      ledgerEntries
    }
  }

  if (externalTx) {
    return await execute(externalTx)
  }
  return await prisma.$transaction(execute)
}

/**
 * Mengambil jumlah stok aktif (belum kedaluwarsa) untuk satu obat
 */
export async function getMedicineAvailableStock(medicineId: string) {
  const medicine = await prisma.medicine.findUnique({
    where: { id: medicineId },
    include: {
      inventory: true,
      batches: {
        where: { remainingQty: { gt: 0 } }
      }
    }
  })

  if (!medicine) {
    return { availableStock: 0 }
  }

  const now = new Date()
  const activeBatchStock = medicine.batches
    .filter((b) => new Date(b.expiryDate) > now)
    .reduce((sum, b) => sum + b.remainingQty, 0)

  const invStock = medicine.inventory?.availableStock ?? activeBatchStock
  return {
    availableStock: Math.min(invStock, activeBatchStock > 0 ? activeBatchStock : invStock)
  }
}

