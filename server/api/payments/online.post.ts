import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/session'
import { getPaymentGatewayAdapter } from '../../services/paymentGatewayService'
import { writeAuditLog } from '../../utils/audit'

const onlinePaymentSchema = z.object({
  invoiceId: z.string().min(1, 'ID tagihan wajib diisi'),
  method: z.enum(['BANK_TRANSFER', 'QRIS', 'VIRTUAL_ACCOUNT', 'EWALLET']),
  idempotencyKey: z.string().trim().min(6).max(120).optional(),
  autoSettleMock: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const rawBody = await readBody(event)
  const parsed = onlinePaymentSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data pembayaran online tidak valid.'
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

  if (user.role === 'PATIENT' && invoice.patientId !== user.patientId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda hanya dapat membayar tagihan milik Anda sendiri.'
    })
  }

  if (invoice.status === 'PAID') {
    throw createError({ statusCode: 400, statusMessage: 'Tagihan ini sudah lunas.' })
  }

  const idempotencyKey = d.idempotencyKey || `IDEMP-${invoice.id}-${d.method}-${invoice.updatedAt.getTime()}`

  // Cek idempotency jika transaksi dengan key ini sudah pernah dibuat
  const existingTx = await prisma.paymentTransaction.findUnique({
    where: { idempotencyKey },
    include: { payment: true }
  })

  if (existingTx) {
    return {
      success: true,
      idempotentReplay: true,
      isSimulated: existingTx.payment.isSimulated,
      simulationDisclaimer:
        'TRANSAKSI SIMULASI DEVELOPMENT (MOCK ADAPTER) : Bukan pembayaran uang sungguhan.',
      message: 'Transaksi pembayaran online telah tersedia (Idempotent Replay).',
      payment: { ...existingTx.payment, amount: Number(existingTx.payment.amount) },
      transaction: { ...existingTx, amount: Number(existingTx.amount) }
    }
  }

  const amount = Number(invoice.totalAmount) - Number(invoice.paidAmount)
  const paymentNumber = `PAY-ONL-${Date.now().toString().slice(-7)}`
  const adapter = getPaymentGatewayAdapter()

  const gatewayResult = await adapter.createTransaction({
    paymentNumber,
    invoiceNumber: invoice.invoiceNumber,
    amount,
    method: d.method,
    customerName: invoice.patient.fullName,
    customerEmail: invoice.patient.email,
    idempotencyKey
  })

  const settleNow = adapter.isSimulated && d.autoSettleMock
  const receiptNumber = settleNow
    ? `KW-SIM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
    : null

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        paymentNumber,
        invoiceId: invoice.id,
        method: d.method,
        status: settleNow ? 'SUCCESS' : 'PENDING',
        amount,
        isManual: false,
        isSimulated: adapter.isSimulated,
        receiptNumber,
        referenceNote: adapter.isSimulated
          ? '[SIMULASI DEVELOPMENT - BUKAN TRANSAKSI NYATA] Pembayaran Online Mock Gateway'
          : 'Pembayaran Online Payment Gateway',
        paidAt: settleNow ? new Date() : null
      }
    })

    const paymentTx = await tx.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        provider: gatewayResult.provider,
        providerTransactionId: gatewayResult.providerTransactionId,
        idempotencyKey,
        paymentUrl: gatewayResult.paymentUrl,
        vaNumber: gatewayResult.vaNumber,
        qrString: gatewayResult.qrString,
        amount,
        status: settleNow ? 'SUCCESS' : 'PENDING',
        rawResponseJson: gatewayResult.rawResponse,
        expiresAt: gatewayResult.expiresAt
      }
    })

    if (settleNow) {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: invoice.totalAmount,
          status: 'PAID'
        }
      })

      if (invoice.patient.userId) {
        await tx.notification.create({
          data: {
            userId: invoice.patient.userId,
            type: 'PAYMENT',
            title: `[SIMULASI] Pembayaran Online Berhasil (${receiptNumber})`,
            message: `Simulasi pembayaran online (${d.method}) sebesar Rp ${amount.toLocaleString('id-ID')} untuk tagihan #${invoice.invoiceNumber} telah berhasil diproses.`,
            linkUrl: '/patient/payments'
          }
        })
      }
    }

    return { payment, paymentTx }
  })

  await writeAuditLog(event, {
    actorId: user.id,
    actorRole: user.role,
    action: 'PAYMENT_ONLINE_INITIATE',
    entityType: 'Payment',
    entityId: result.payment.id,
    afterJson: {
      paymentNumber,
      providerTransactionId: gatewayResult.providerTransactionId,
      isSimulated: adapter.isSimulated,
      method: d.method,
      status: result.payment.status
    }
  })

  return {
    success: true,
    isSimulated: adapter.isSimulated,
    simulationDisclaimer: gatewayResult.simulationBanner,
    message: settleNow
      ? 'Pembayaran online (Mode Simulasi Development) berhasil diselesaikan.'
      : 'Instruksi pembayaran online berhasil dibuat.',
    payment: { ...result.payment, amount: Number(result.payment.amount) },
    transaction: { ...result.paymentTx, amount: Number(result.paymentTx.amount) }
  }
})
