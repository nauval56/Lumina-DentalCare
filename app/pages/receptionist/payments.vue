<script setup lang="ts">
import { formatRupiah, formatDateId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const { data, pending, refresh } = await useFetch('/api/invoices')
const toast = useClinicToast()

const verifyingInvoice = ref<Record<string, unknown> | null>(null)
const manualForm = reactive({
  method: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'QRIS',
  referenceNote: 'Pembayaran langsung diterima di meja kasir klinik'
})
const submitting = ref(false)

async function verifyManualPayment() {
  if (!verifyingInvoice.value) return
  submitting.value = true
  try {
    const res = await $fetch<{ message: string }>('/api/payments/manual', {
      method: 'POST',
      body: {
        invoiceId: verifyingInvoice.value.id,
        method: manualForm.method,
        referenceNote: manualForm.referenceNote
      }
    })
    toast.success('Pembayaran Langsung Dicatat', res.message)
    verifyingInvoice.value = null
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Mencatat Pembayaran',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Hero Header Pencatatan Pembayaran Langsung Resepsionis (PRD Bab 9) -->
    <div class="rounded-lg bg-[#EAF5F6] border border-[#D8E6E8] p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div class="space-y-1.5">
        <span class="inline-flex items-center px-3.5 py-1 rounded-md bg-[#DFF1F2] text-[#137A7F] text-xs font-bold uppercase tracking-wider">
          Meja Depan &amp; Kasir Klinik · Pencatatan Pembayaran Langsung
        </span>
        <h1 class="font-heading font-bold text-2xl text-[#0B253A]">
          Pencatatan Pembayaran Langsung &amp; Penerbitan Kwitansi
        </h1>
        <p class="text-xs text-slate-600 max-w-2xl">
          Pembuatan invoice resmi dari treatment record dokter dan verifikasi pembayaran online dikelola oleh Administrator. Resepsionis membantu mencatat pembayaran tunai/EDC langsung di klinik untuk invoice yang telah diterbitkan Admin.
        </p>
      </div>
    </div>

    <CommonLoadingSkeleton v-if="pending" :rows="4" />

    <div v-else class="lumina-card overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-[#D8E6E8] text-xs text-slate-600 uppercase bg-[#EAF5F6]/50">
            <th class="py-3.5 px-4">No. Invoice (Dari Admin)</th>
            <th class="py-3.5 px-4">Pasien</th>
            <th class="py-3.5 px-4">Tanggal</th>
            <th class="py-3.5 px-4">Total Tagihan</th>
            <th class="py-3.5 px-4">Status</th>
            <th class="py-3.5 px-4 text-right">Pencatatan Kasir Langsung</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#D8E6E8]/60">
          <tr v-for="inv in data?.items || []" :key="inv.id">
            <td class="py-3.5 px-4 font-mono text-xs font-bold text-[#137A7F]">
              {{ inv.invoiceNumber }}
            </td>
            <td class="py-3.5 px-4">
              <div class="font-semibold text-[#0B253A]">{{ inv.patient?.fullName }}</div>
              <div class="text-xs text-slate-600">{{ inv.patient?.medicalRecordNo }}</div>
            </td>
            <td class="py-3.5 px-4 text-xs text-slate-600">{{ formatDateId(inv.createdAt) }}</td>
            <td class="py-3.5 px-4 font-bold text-[#0B253A]">
              {{ formatRupiah(inv.totalAmount) }}
            </td>
            <td class="py-3.5 px-4">
              <CommonStatusBadge :status="inv.status" kind="invoice" />
            </td>
            <td class="py-3.5 px-4 text-right">
              <button
                v-if="inv.status !== 'PAID'"
                type="button"
                class="px-4 py-2 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold transition-colors"
                @click="verifyingInvoice = inv"
              >
                Catat Bayar Langsung
              </button>
              <span v-else class="text-xs font-mono text-emerald-700 font-bold">
                {{ inv.payments?.[0]?.receiptNumber || 'LUNAS' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Pencatatan Pembayaran Langsung di Klinik -->
    <div
      v-if="verifyingInvoice"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
    >
      <form class="lumina-card max-w-md w-full p-6 space-y-4" @submit.prevent="verifyManualPayment">
        <h3 class="font-heading font-bold text-lg text-[#0B253A]">
          Catat Pembayaran Langsung (#{{ verifyingInvoice.invoiceNumber }})
        </h3>
        <div class="p-3.5 rounded-md bg-[#EAF5F6] border border-[#D8E6E8] text-xs space-y-1">
          <div class="flex justify-between">
            <span class="text-slate-600">Pasien:</span>
            <strong class="text-[#0B253A]">{{ (verifyingInvoice.patient as Record<string, unknown>)?.fullName }}</strong>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600">Total Tagihan:</span>
            <strong class="text-[#137A7F] font-bold">{{ formatRupiah(Number(verifyingInvoice.totalAmount)) }}</strong>
          </div>
        </div>

        <div>
          <label for="rec-pay-method" class="block text-xs font-semibold text-slate-700 mb-1">Metode Pembayaran Langsung di Klinik</label>
          <select
            id="rec-pay-method"
            v-model="manualForm.method"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm bg-white"
          >
            <option value="CASH">Tunai (Cash di Meja Kasir)</option>
            <option value="QRIS">QRIS EDC Klinik</option>
            <option value="BANK_TRANSFER">Debit / Transfer di Meja Kasir</option>
          </select>
        </div>

        <div>
          <label for="rec-pay-note" class="block text-xs font-semibold text-slate-700 mb-1">Catatan Referensi Kasir</label>
          <input
            id="rec-pay-note"
            v-model="manualForm.referenceNote"
            type="text"
            required
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs font-semibold"
            @click="verifyingInvoice = null"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="submitting"
            class="px-5 py-2 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
          >
            {{ submitting ? 'Menyimpan...' : 'Simpan & Terbitkan Kwitansi' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
