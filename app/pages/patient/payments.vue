<script setup lang="ts">
import { formatRupiah, formatDateId, formatDateTimeId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const { data, pending, refresh } = await useFetch('/api/invoices')
const toast = useClinicToast()

const selectedInvoice = ref<Record<string, unknown> | null>(null)
const selectedMethod = ref<'QRIS' | 'VIRTUAL_ACCOUNT' | 'BANK_TRANSFER' | 'EWALLET'>('QRIS')
const processingPayment = ref(false)
const activeReceipt = ref<Record<string, unknown> | null>(null)

async function payOnline() {
  if (!selectedInvoice.value) return
  processingPayment.value = true
  try {
    const res = await $fetch<{
      success: boolean
      message: string
      simulationDisclaimer?: string
      payment: Record<string, unknown>
    }>('/api/payments/online', {
      method: 'POST',
      body: {
        invoiceId: selectedInvoice.value.id,
        method: selectedMethod.value,
        autoSettleMock: true
      }
    })
    toast.success('Pembayaran Diproses', res.message)
    selectedInvoice.value = null
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Memproses Pembayaran',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  } finally {
    processingPayment.value = false
  }
}
</script>

<template>
  <!-- Figma 17. Patient Tagihan, Invoice & Struk Pembayaran (/patient/payments) -->
  <div class="flex flex-col gap-[22px]">
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col gap-1.5">
      <span class="text-[11px] font-bold uppercase text-[#137A7F]">
        KEUANGAN &amp; BUKTI PEMBAYARAN PASIEN
      </span>
      <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
        Tagihan Perawatan, Invoice &amp; Struk Pembayaran
      </h1>
      <p class="text-[13px] text-[#475569]">
        Rincian invoice resmi yang diterbitkan oleh Admin berdasarkan tindakan dokter dan pilihan obat klinik Anda.
      </p>
    </div>

    <!-- Banner Informasi Mode Simulasi Payment Gateway (PRD Bab 12 & 20) -->
    <div class="p-4 rounded-lg bg-[#FFFBEB] border border-[#D8E6E8] flex items-start gap-3 text-[12px] text-[#B45309]">
      <UIcon name="i-lucide-info" class="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <strong class="font-bold">Informasi Payment Gateway (Mock Development Adapter):</strong>
        Pembayaran online melalui portal ini menggunakan adapter simulasi development dan ditandai secara eksplisit bukan transaksi perbankan nyata hingga kredensial payment gateway produksi dihubungkan. Anda juga dapat membayar langsung di kasir klinik.
      </div>
    </div>

    <CommonLoadingSkeleton v-if="pending" :rows="3" />

    <CommonEmptyState
      v-else-if="!(data?.items || []).length"
      title="Belum Ada Tagihan"
      description="Tagihan perawatan gigi Anda akan ditampilkan di halaman ini."
    />

    <div v-else class="space-y-4">
      <div
        v-for="inv in data?.items || []"
        :key="inv.id"
        class="lumina-card p-6 space-y-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D8E6E8]">
          <div>
            <span class="font-mono text-xs font-bold text-[#137A7F]">{{ inv.invoiceNumber }}</span>
            <h2 class="font-heading font-bold text-base text-[#0B253A]">
              {{ inv.appointment?.service?.name || inv.notes || 'Tagihan Perawatan Gigi' }}
            </h2>
            <p class="text-xs text-[#475569]">
              Tanggal Terbit: {{ formatDateId(inv.createdAt) }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <CommonStatusBadge :status="inv.status" kind="invoice" />
            <strong class="font-heading font-bold text-lg text-[#0B253A]">
              {{ formatRupiah(inv.totalAmount) }}
            </strong>
          </div>
        </div>

        <!-- Rincian Item Tagihan -->
        <div class="space-y-1.5 text-xs">
          <div
            v-for="(item, idx) in (Array.isArray(inv.itemsJson) ? inv.itemsJson : [])"
            :key="idx"
            class="flex justify-between text-slate-600 py-1 border-b border-dashed border-[#D8E6E8]"
          >
            <span>{{ item.name }} (x{{ item.qty }})</span>
            <span class="font-medium text-[#0B253A]">{{ formatRupiah(item.subtotal) }}</span>
          </div>
        </div>

        <!-- Riwayat Pembayaran / Bukti Kwitansi -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div class="space-y-1">
            <div
              v-for="pay in inv.payments"
              :key="pay.id"
              class="inline-flex flex-wrap items-center gap-2 text-xs bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-200 mr-2"
            >
              <UIcon name="i-lucide-receipt" class="w-4 h-4 text-emerald-600" />
              <span>
                <strong>{{ pay.receiptNumber || pay.paymentNumber }}</strong> · {{ pay.method }} ·
                {{ formatRupiah(pay.amount) }}
                <span v-if="pay.isSimulated" class="text-amber-700 font-semibold">
                  [SIMULASI DEV]
                </span>
              </span>
              <button
                type="button"
                class="underline font-semibold text-[#137A7F] ml-1"
                @click="activeReceipt = { invoice: inv, payment: pay }"
              >
                Lihat Bukti
              </button>
            </div>
          </div>

          <button
            v-if="inv.status !== 'PAID'"
            type="button"
            class="inline-flex items-center gap-2 px-5 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[12px] font-semibold transition-colors"
            @click="selectedInvoice = inv"
          >
            <UIcon name="i-lucide-credit-card" class="w-4 h-4" />
            <span>Bayar Online Sekarang</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Pembayaran Online -->
    <div
      v-if="selectedInvoice"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="lumina-card max-w-md w-full p-6 space-y-5">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-xs font-bold text-[#137A7F]">Pembayaran Online</span>
            <h3 class="font-heading font-bold text-lg text-[#0B253A]">
              Tagihan {{ selectedInvoice.invoiceNumber }}
            </h3>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-700"
            @click="selectedInvoice = null"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <div class="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
          <strong>PENANDA SIMULASI:</strong> Transaksi ini menggunakan <code>MockPaymentGatewayAdapter</code>
          untuk keperluan pengujian development (bukan pembayaran uang sungguhan).
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-2">Pilih Metode Pembayaran</label>
          <div class="grid grid-cols-2 gap-2.5">
            <button
              v-for="m in [
                { code: 'QRIS', label: 'QRIS Instan' },
                { code: 'VIRTUAL_ACCOUNT', label: 'Virtual Account' },
                { code: 'BANK_TRANSFER', label: 'Transfer Bank' },
                { code: 'EWALLET', label: 'E-Wallet' }
              ]"
              :key="m.code"
              type="button"
              class="p-3 rounded-md border text-xs font-semibold text-left transition-all"
              :class="
                selectedMethod === m.code
                  ? 'border-[#137A7F] bg-[#EAF5F6] text-[#137A7F] ring-2 ring-[#137A7F]'
                  : 'border-[#D8E6E8] text-slate-700'
              "
              @click="selectedMethod = m.code as typeof selectedMethod"
            >
              {{ m.label }}
            </button>
          </div>
        </div>

        <div class="p-4 rounded-md bg-[#F4F9F9] flex items-center justify-between">
          <span class="text-xs text-[#475569]">Total Dibayarkan</span>
          <strong class="font-heading font-bold text-lg text-[#137A7F]">
            {{ formatRupiah(Number(selectedInvoice.totalAmount) - Number(selectedInvoice.paidAmount)) }}
          </strong>
        </div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2.5 rounded-md border border-[#D8E6E8] text-xs font-semibold text-slate-700"
            @click="selectedInvoice = null"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="processingPayment"
            class="px-5 py-2.5 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
            @click="payOnline"
          >
            {{ processingPayment ? 'Memproses...' : 'Konfirmasi Simulasi Bayar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Bukti Pembayaran / Kwitansi -->
    <div
      v-if="activeReceipt"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="lumina-card max-w-md w-full p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-[#D8E6E8] pb-3">
          <div>
            <span class="text-xs font-bold text-emerald-600">BUKTI PEMBAYARAN RESMI</span>
            <h3 class="font-heading font-bold text-lg text-[#0B253A]">Lumina Dental Care</h3>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-700"
            @click="activeReceipt = null"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-2 text-xs text-slate-700">
          <div class="flex justify-between">
            <span class="text-[#475569]">No. Kwitansi:</span>
            <strong class="font-mono">{{ (activeReceipt.payment as Record<string, unknown>).receiptNumber }}</strong>
          </div>
          <div class="flex justify-between">
            <span class="text-[#475569]">No. Invoice:</span>
            <strong class="font-mono">{{ (activeReceipt.invoice as Record<string, unknown>).invoiceNumber }}</strong>
          </div>
          <div class="flex justify-between">
            <span class="text-[#475569]">Metode:</span>
            <strong>{{ (activeReceipt.payment as Record<string, unknown>).method }}</strong>
          </div>
          <div class="flex justify-between">
            <span class="text-[#475569]">Waktu Bayar:</span>
            <strong>{{ formatDateTimeId(String((activeReceipt.payment as Record<string, unknown>).paidAt)) }}</strong>
          </div>
          <div class="flex justify-between pt-2 border-t border-[#D8E6E8] text-sm">
            <span class="font-semibold">Total Lunas:</span>
            <strong class="text-emerald-600 font-bold">
              {{ formatRupiah(Number((activeReceipt.payment as Record<string, unknown>).amount)) }}
            </strong>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button
            type="button"
            class="px-5 py-2 rounded-md bg-[#0B253A] text-white text-xs font-semibold"
            @click="activeReceipt = null"
          >
            Tutup Bukti Pembayaran
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
