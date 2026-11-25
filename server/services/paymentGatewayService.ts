import type { PaymentMethod, PaymentStatus } from '@prisma/client'
import { createWebhookSignature, verifyWebhookSignature } from '../utils/crypto'

export interface OnlinePaymentInitiationInput {
  paymentNumber: string
  invoiceNumber: string
  amount: number
  method: PaymentMethod
  customerName: string
  customerEmail?: string | null
  idempotencyKey: string
}

export interface OnlinePaymentInitiationOutput {
  provider: string
  isSimulated: boolean
  providerTransactionId: string
  paymentUrl: string
  vaNumber: string | null
  qrString: string | null
  status: PaymentStatus
  expiresAt: Date
  simulationBanner: string | null
  rawResponse: Record<string, unknown>
}

export interface PaymentGatewayAdapter {
  providerName: string
  isSimulated: boolean
  createTransaction(input: OnlinePaymentInitiationInput): Promise<OnlinePaymentInitiationOutput>
  verifyWebhook(rawBody: string, signature: string, secret: string): boolean
}

/**
 * Mock Payment Gateway Adapter untuk development & pengujian.
 * Ditandai secara eksplisit bahwa transaksi ini adalah SIMULASI DEVELOPMENT
 * sesuai PRD Bab 12 & 20.
 */
export class MockPaymentGatewayAdapter implements PaymentGatewayAdapter {
  providerName = 'LUMINA_MOCK_GATEWAY'
  isSimulated = true

  async createTransaction(input: OnlinePaymentInitiationInput): Promise<OnlinePaymentInitiationOutput> {
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 jam
    const suffix = input.paymentNumber.replace(/[^A-Z0-9]/gi, '').slice(-8).toUpperCase()
    const providerTransactionId = `MOCK-TX-${Date.now()}-${suffix}`

    let vaNumber: string | null = null
    let qrString: string | null = null

    if (input.method === 'VIRTUAL_ACCOUNT' || input.method === 'BANK_TRANSFER') {
      vaNumber = `8808${Math.floor(1000000000 + Math.random() * 8999999999)}`
    } else if (input.method === 'QRIS' || input.method === 'EWALLET') {
      qrString = `00020101021226660014ID.CO.LUMINA.MOCK011893600918${suffix}520454115303360540${Math.round(input.amount)}5802ID5918LUMINA DENTAL CARE6009PONTIANAK6304MOCK`
    }

    const simulationBanner =
      'TRANSAKSI SIMULASI DEVELOPMENT (MOCK ADAPTER) : Bukan pembayaran uang sungguhan. Kredensial payment gateway eksternal belum dikonfigurasi.'

    return {
      provider: this.providerName,
      isSimulated: true,
      providerTransactionId,
      paymentUrl: `/patient/payments?simulate=${encodeURIComponent(providerTransactionId)}`,
      vaNumber,
      qrString,
      status: 'PENDING',
      expiresAt,
      simulationBanner,
      rawResponse: {
        mode: 'MOCK_DEVELOPMENT',
        disclaimer: simulationBanner,
        providerTransactionId,
        invoiceNumber: input.invoiceNumber,
        amount: input.amount,
        method: input.method,
        vaNumber,
        qrString
      }
    }
  }

  verifyWebhook(rawBody: string, signature: string, secret: string): boolean {
    return verifyWebhookSignature(rawBody, signature, secret)
  }
}

export function getPaymentGatewayAdapter(): PaymentGatewayAdapter {
  // Adapter pattern memungkinkan penggantian ke Midtrans/Xendit tanpa mengubah logika bisnis
  return new MockPaymentGatewayAdapter()
}

export { createWebhookSignature, verifyWebhookSignature }
