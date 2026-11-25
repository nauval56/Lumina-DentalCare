import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const updateInvoiceSchema = z.object({
  subtotal: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
  status: z.enum(['UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'REFUNDED']).optional(),
  notes: z.string().trim().max(500).optional().nullable()
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN', 'RECEPTIONIST'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID invoice diperlukan.' })
  }

  const existing = await prisma.invoice.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Invoice tidak ditemukan.' })
  }

  const body = await readBody(event)
  const parsed = updateInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Data perubahan invoice tidak valid.' })
  }

  const d = parsed.data
  const nextSubtotal = d.subtotal !== undefined ? d.subtotal : Number(existing.subtotal)
  const nextDiscount = d.discount !== undefined ? d.discount : Number(existing.discount)
  const nextTotal = Math.max(0, nextSubtotal - nextDiscount + Number(existing.tax))

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      subtotal: nextSubtotal,
      discount: nextDiscount,
      totalAmount: nextTotal,
      status: d.status ?? existing.status,
      notes: d.notes !== undefined ? d.notes : existing.notes
    }
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'INVOICE_UPDATE',
    entityType: 'Invoice',
    entityId: id,
    beforeJson: { totalAmount: Number(existing.totalAmount), status: existing.status },
    afterJson: { totalAmount: Number(updated.totalAmount), status: updated.status }
  })

  return {
    success: true,
    message: 'Data tagihan berhasil diperbarui.',
    invoice: updated
  }
})
