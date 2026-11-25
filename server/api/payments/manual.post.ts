import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const manualPaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Tagihan wajib dipilih'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS']).default('CASH'),
  amount: z.coerce.number().positive('Nominal pembayaran harus lebih dari 0').optional(),
  referenceNote: z.string().trim().max(255).optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['RECEPTIONIST', 'ADMIN'])
  const rawBody = await readBody(event)
  const parsed = manualPaymentSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data verifikasi pembayaran manual tidak valid.'
    })
  }

  const d = parsed.data
  const invoice = await prisma.invoice.findUnique({
    where: { id: d.invoiceId },
    include: { patient: true }
  })

  if (!invoice) {
    throw createError({ statusCode: 404, statusMessage: 'Tagihan tidak ditemukan.' })
  }

  if (invoice.status === 'PAID') {
    throw createError({ statusCode: 400, statusMessage: 'Tagihan ini sudah lunas.' })
  }

  const remainingAmount = Number(invoice.totalAmount) - Number(invoice.paidAmount)
  const payAmount = d.amount ? Math.min(d.amount, remainingAmount) : remainingAmount

  const paymentNumber = `PAY-MAN-${Date.now().toString().slice(-7)}`
  const receiptNumber = `KW-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        paymentNumber,
        invoiceId: invoice.id,
        method: d.method,
        status: 'SUCCESS',
        amount: payAmount,
        isManual: true,
        isSimulated: false,
        receiptNumber,
        referenceNote: d.referenceNote || 'Pembayaran langsung di kasir klinik (Diverifikasi Resepsionis)',
        verifiedById: actor.id,
        paidAt: new Date()
      }
    })

    const nextPaidAmount = Number(invoice.paidAmount) + payAmount
    const nextStatus = nextPaidAmount >= Number(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID'

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: nextPaidAmount,
        status: nextStatus
      }
    })

    if (invoice.patient.userId) {
      await tx.notification.create({
        data: {
          userId: invoice.patient.userId,
          type: 'PAYMENT',
          title: `Pembayaran Diverifikasi (${receiptNumber})`,
          message: `Pembayaran sejumlah Rp ${payAmount.toLocaleString('id-ID')} untuk tagihan #${invoice.invoiceNumber} telah diverifikasi oleh kasir klinik.`,
          linkUrl: '/patient/payments'
        }
      })
    }

    return { payment, updatedInvoice }
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'PAYMENT_MANUAL_VERIFY',
    entityType: 'Payment',
    entityId: result.payment.id,
    afterJson: {
      paymentNumber,
      receiptNumber,
      invoiceNumber: invoice.invoiceNumber,
      amount: payAmount,
      method: d.method
    }
  })

  return {
    success: true,
    message: `Pembayaran manual berhasil diverifikasi. Bukti pembayaran: ${receiptNumber}.`,
    payment: { ...result.payment, amount: Number(result.payment.amount) },
    invoice: {
      ...result.updatedInvoice,
      totalAmount: Number(result.updatedInvoice.totalAmount),
      paidAmount: Number(result.updatedInvoice.paidAmount)
    }
  }
})
