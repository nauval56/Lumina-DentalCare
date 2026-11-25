import { z } from 'zod'
import { readBody, getHeader, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { getPaymentGatewayAdapter } from '../../services/paymentGatewayService'
import { enforceRateLimit } from '../../utils/rateLimit'
import { writeAuditLog } from '../../utils/audit'

const webhookPayloadSchema = z.object({
  eventKey: z.string().trim().min(5, 'eventKey wajib ada untuk idempotency'),
  eventType: z.string().trim().default('payment.settlement'),
  providerTransactionId: z.string().trim().min(3),
  status: z.enum(['SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED'])
})

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'payment:webhook', 60, 60_000)

  const config = useRuntimeConfig()
  const rawBodyObj = await readBody(event)
  const parsed = webhookPayloadSchema.safeParse(rawBodyObj)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Payload webhook tidak valid.'
    })
  }

  const payload = parsed.data
  const canonicalString = `${payload.eventKey}:${payload.providerTransactionId}:${payload.status}`
  const signature = getHeader(event, 'x-lumina-signature') || ''
  const adapter = getPaymentGatewayAdapter()
  const signatureValid = adapter.verifyWebhook(
    canonicalString,
    signature,
    config.paymentWebhookSecret || 'dev-webhook-secret'
  )

  if (!signatureValid) {
    await prisma.paymentGatewayEvent.upsert({
      where: { eventKey: payload.eventKey },
      update: {},
      create: {
        provider: adapter.providerName,
        eventKey: payload.eventKey,
        eventType: payload.eventType,
        signatureValid: false,
        payloadJson: rawBodyObj,
        processed: false,
        errorMessage: 'Invalid webhook signature'
      }
    })
    throw createError({
      statusCode: 401,
      statusMessage: 'Verifikasi signature webhook gagal.'
    })
  }

  // Idempotency Check: Jika eventKey sudah diproses, kembalikan 200 OK tanpa proses ulang
  const existingEvent = await prisma.paymentGatewayEvent.findUnique({
    where: { eventKey: payload.eventKey }
  })
  if (existingEvent && existingEvent.processed) {
    return {
      success: true,
      idempotentReplay: true,
      message: 'Webhook event sudah diproses sebelumnya.'
    }
  }

  const paymentTx = await prisma.paymentTransaction.findUnique({
    where: { providerTransactionId: payload.providerTransactionId },
    include: {
      payment: {
        include: { invoice: true }
      }
    }
  })

  if (!paymentTx) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Transaksi provider tidak ditemukan.'
    })
  }

  const receiptNumber =
    payload.status === 'SUCCESS'
      ? paymentTx.payment.receiptNumber || `KW-WH-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
      : paymentTx.payment.receiptNumber

  await prisma.$transaction(async (tx) => {
    await tx.paymentGatewayEvent.upsert({
      where: { eventKey: payload.eventKey },
      update: {
        signatureValid: true,
        processed: true,
        processedAt: new Date()
      },
      create: {
        provider: adapter.providerName,
        eventKey: payload.eventKey,
        eventType: payload.eventType,
        signatureValid: true,
        payloadJson: rawBodyObj,
        processed: true,
        processedAt: new Date()
      }
    })

    await tx.paymentTransaction.update({
      where: { id: paymentTx.id },
      data: { status: payload.status }
    })

    await tx.payment.update({
      where: { id: paymentTx.paymentId },
      data: {
        status: payload.status,
        receiptNumber,
        paidAt: payload.status === 'SUCCESS' ? new Date() : paymentTx.payment.paidAt
      }
    })

    if (payload.status === 'SUCCESS') {
      await tx.invoice.update({
        where: { id: paymentTx.payment.invoiceId },
        data: {
          paidAmount: paymentTx.payment.invoice.totalAmount,
          status: 'PAID'
        }
      })
    }
  })

  await writeAuditLog(event, {
    action: 'PAYMENT_WEBHOOK_PROCESSED',
    entityType: 'PaymentTransaction',
    entityId: paymentTx.id,
    afterJson: {
      eventKey: payload.eventKey,
      providerTransactionId: payload.providerTransactionId,
      status: payload.status
    }
  })

  return {
    success: true,
    message: 'Webhook pembayaran berhasil divalidasi dan direkonsiliasi.'
  }
})
