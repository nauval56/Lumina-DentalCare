import { z } from 'zod'
import { readBody, createError } from 'h3'
import { requireRole } from '../../utils/session'
import { recordStockOutFefo } from '../../services/inventoryLedgerService'
import { writeAuditLog } from '../../utils/audit'

const stockOutSchema = z.object({
  medicineId: z.string().min(1, 'Obat wajib dipilih'),
  quantity: z.coerce.number().int().min(1, 'Jumlah stok keluar minimal 1'),
  notes: z.string().trim().min(3, 'Catatan pengeluaran stok wajib diisi').max(255)
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN', 'DOCTOR'])
  const rawBody = await readBody(event)
  const parsed = stockOutSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data stok keluar tidak valid.'
    })
  }

  const d = parsed.data
  const result = await recordStockOutFefo({
    medicineId: d.medicineId,
    quantity: d.quantity,
    actorId: actor.id,
    type: 'STOCK_OUT',
    referenceType: 'MANUAL_OUT',
    notes: d.notes
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'INVENTORY_STOCK_OUT_FEFO',
    entityType: 'Inventory',
    entityId: result.inventory.id,
    afterJson: {
      medicineId: d.medicineId,
      quantity: d.quantity,
      allocations: result.allocations,
      balanceAfter: result.inventory.availableStock
    }
  })

  return {
    success: true,
    message: `Stok keluar sebanyak ${d.quantity} unit berhasil diproses dengan metode FEFO.`,
    allocations: result.allocations,
    availableStock: result.inventory.availableStock
  }
})
