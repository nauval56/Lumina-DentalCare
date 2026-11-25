import { z } from 'zod'
import { readBody, createError } from 'h3'
import { requireRole } from '../../utils/session'
import { recordStockIn } from '../../services/inventoryLedgerService'
import { writeAuditLog } from '../../utils/audit'

const stockInSchema = z.object({
  medicineId: z.string().min(1, 'Obat wajib dipilih'),
  batchNumber: z.string().trim().min(2, 'Nomor batch wajib diisi').max(60),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal kedaluwarsa harus YYYY-MM-DD'),
  quantity: z.coerce.number().int().min(1, 'Jumlah stok masuk minimal 1'),
  purchasePrice: z.coerce.number().min(0).default(0),
  supplierName: z.string().trim().max(150).optional(),
  notes: z.string().trim().max(255).optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const rawBody = await readBody(event)
  const parsed = stockInSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data stok masuk tidak valid.'
    })
  }

  const d = parsed.data
  const result = await recordStockIn({
    medicineId: d.medicineId,
    batchNumber: d.batchNumber.toUpperCase(),
    expiryDate: new Date(`${d.expiryDate}T00:00:00.000Z`),
    quantity: d.quantity,
    purchasePrice: d.purchasePrice,
    supplierName: d.supplierName,
    actorId: actor.id,
    notes: d.notes
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'INVENTORY_STOCK_IN',
    entityType: 'InventoryTransaction',
    entityId: result.transaction.id,
    afterJson: {
      medicineId: d.medicineId,
      batchNumber: d.batchNumber,
      quantity: d.quantity,
      balanceAfter: result.inventory.availableStock
    }
  })

  return {
    success: true,
    message: `Stok masuk sebanyak ${d.quantity} unit (Batch ${d.batchNumber}) berhasil dicatat ke Inventory Ledger.`,
    ...result
  }
})
