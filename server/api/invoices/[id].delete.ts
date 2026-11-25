import { getRouterParam, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID invoice diperlukan.' })
  }

  const existing = await prisma.invoice.findUnique({
    where: { id },
    include: { _count: { select: { payments: true } } }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Invoice tidak ditemukan.' })
  }

  if (existing.status === 'PAID' || existing._count.payments > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tagihan yang sudah memiliki transaksi pembayaran tidak dapat dihapus.'
    })
  }

  await prisma.invoice.delete({ where: { id } })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'INVOICE_DELETE',
    entityType: 'Invoice',
    entityId: id,
    beforeJson: { invoiceNumber: existing.invoiceNumber, totalAmount: Number(existing.totalAmount) }
  })

  return {
    success: true,
    message: 'Tagihan berhasil dihapus.'
  }
})
