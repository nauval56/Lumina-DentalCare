<script setup lang="ts">
import { formatRupiah, formatDateId, formatDateTimeId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const [
  { data, pending, refresh },
  { data: patientsData },
  { data: recordsData, refresh: refreshRecords }
] = await Promise.all([
  useFetch('/api/invoices'),
  useFetch('/api/patients', { query: { limit: 100 } }),
  useFetch('/api/medical-records')
])
const toast = useClinicToast()

const refreshingAll = ref(false)
async function refreshAllData() {
  refreshingAll.value = true
  try {
    await Promise.all([refresh(), refreshRecords()])
    toast.info('Data Disegarkan', 'Daftar treatment record dokter, pesanan obat, dan invoice telah diperbarui.')
  } finally {
    refreshingAll.value = false
  }
}

// 1. Treatment Record dari Dokter yang belum memiliki Invoice
const uninvoicedTreatmentRecords = computed(() =>
  (recordsData.value?.items || []).filter(
    (rec: { appointment?: { invoice?: unknown } | null }) => !rec.appointment?.invoice
  )
)

// 2. Pesanan Obat Pasien dari Klinik yang menunggu penyerahan Admin & pemotongan stok FEFO
const pendingClinicMedicineOrders = computed(() => {
  const orders: Array<Record<string, any>> = []
  for (const rec of recordsData.value?.items || []) {
    for (const rx of rec.prescriptions || []) {
      const notes = String(rx.notes || '')
      if (!rx.isDispensed && notes.includes('BELI_DI_KLINIK')) {
        orders.push({
          ...rx,
          patientName: rec.patient?.fullName,
          medicalRecordNo: rec.patient?.medicalRecordNo,
          doctorName: `${rec.doctor?.titlePrefix || ''} ${rec.doctor?.fullName || ''}`.trim(),
          visitDate: rec.visitDate
        })
      }
    }
  }
  return orders
})

function calculateRecordEstimate(rec: Record<string, any>) {
  const consultFee = Number(rec.doctor?.consultationFee || 150000)
  const treatmentsTotal = (rec.treatments || []).reduce(
    (sum: number, t: { fee: number }) => sum + Number(t.fee || 0),
    0
  )
  let medicineTotal = 0
  for (const rx of rec.prescriptions || []) {
    const notes = String(rx.notes || '')
    const isExternal = notes.includes('APOTEK_LUAR')
    if (rx.isDispensed || notes.includes('BELI_DI_KLINIK') || !isExternal) {
      for (const item of rx.items || []) {
        medicineTotal += Number(item.unitPrice || item.medicine?.unitPrice || 0) * Number(item.quantity || 1)
      }
    }
  }
  return {
    consultFee,
    treatmentsTotal,
    medicineTotal,
    grandTotal: consultFee + treatmentsTotal + medicineTotal
  }
}

const creatingFromRecordId = ref<string | null>(null)
async function createInvoiceFromTreatmentRecord(rec: Record<string, any>, dispenseNow: boolean) {
  creatingFromRecordId.value = String(rec.id)
  try {
    const res = await $fetch<{ message: string }>('/api/invoices', {
      method: 'POST',
      body: {
        medicalRecordId: rec.id,
        patientId: rec.patientId,
        appointmentId: rec.appointmentId,
        discount: 0,
        includeClinicPrescription: true,
        dispenseClinicPrescription: dispenseNow
      }
    })
    toast.success('Invoice Berhasil Diterbitkan', res.message)
    await Promise.all([refresh(), refreshRecords()])
  } catch (err: unknown) {
    toast.error(
      'Gagal Menerbitkan Invoice',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  } finally {
    creatingFromRecordId.value = null
  }
}

const dispensingRxId = ref<string | null>(null)
async function dispenseClinicPrescription(rxId: string) {
  dispensingRxId.value = rxId
  try {
    const res = await $fetch<{ message: string }>(`/api/prescriptions/${rxId}/purchase-choice`, {
      method: 'POST',
      body: { action: 'ADMIN_DISPENSE' }
    })
    toast.success('Obat Diserahkan & Stok FEFO Dipotong', res.message)
    await refreshRecords()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyerahkan Obat',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Periksa ketersediaan stok batch aktif.'
    )
  } finally {
    dispensingRxId.value = null
  }
}

const showModal = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  patientId: '',
  description: '',
  subtotal: 350000,
  discount: 0,
  status: 'UNPAID',
  notes: ''
})

function openCreateModal() {
  editingId.value = null
  form.patientId = ''
  form.description = 'Konsultasi & Tindakan Perawatan Gigi'
  form.subtotal = 350000
  form.discount = 0
  form.status = 'UNPAID'
  form.notes = ''
  showModal.value = true
}

function openEditModal(inv: Record<string, unknown>) {
  editingId.value = String(inv.id)
  form.patientId = String(inv.patientId || '')
  form.description = String(inv.notes || 'Tagihan Perawatan')
  form.subtotal = Number(inv.subtotal || 0)
  form.discount = Number(inv.discount || 0)
  form.status = String(inv.status || 'UNPAID')
  form.notes = String(inv.notes || '')
  showModal.value = true
}

async function saveInvoice() {
  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/invoices/${editingId.value}`, {
        method: 'PATCH',
        body: {
          subtotal: form.subtotal,
          discount: form.discount,
          status: form.status,
          notes: form.notes
        }
      })
      toast.success('Tagihan Diperbarui', 'Data invoice berhasil diperbarui.')
    } else {
      await $fetch('/api/invoices', {
        method: 'POST',
        body: form
      })
      toast.success('Tagihan Dibuat', 'Invoice baru berhasil diterbitkan.')
    }
    showModal.value = false
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Tagihan',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  } finally {
    saving.value = false
  }
}

async function deleteInvoice(inv: { id: string; invoiceNumber: string }) {
  if (import.meta.client && !window.confirm(`Hapus tagihan ${inv.invoiceNumber}?`)) {
    return
  }
  try {
    const res = await $fetch<{ message: string }>(`/api/invoices/${inv.id}`, {
      method: 'DELETE'
    })
    toast.success('Tagihan Dihapus', res.message)
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menghapus Tagihan',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Tidak dapat menghapus tagihan ini.'
    )
  }
}

async function quickVerifyCash(invoiceId: string) {
  try {
    const res = await $fetch<{ message: string }>('/api/payments/manual', {
      method: 'POST',
      body: {
        invoiceId,
        method: 'CASH',
        referenceNote: 'Diverifikasi langsung oleh Administrator'
      }
    })
    toast.success('Pembayaran Diverifikasi', res.message)
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Verifikasi',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}
</script>

<template>
  <!-- 5. Invoice Admin (Terhubung Langsung ke Database Treatment Record SOAP Dokter) -->
  <div class="flex flex-col gap-[22px]">
    <!-- Hero Header -->
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
      <div class="flex flex-col gap-1.5">
        <span class="self-start px-3.5 py-1 rounded-md bg-[#DFF1F2] border border-[#D8E6E8] text-[#137A7F] text-[11px] font-bold uppercase tracking-wider">
          Admin · Treatment Record Dokter, Pesanan Obat FEFO &amp; Invoice
        </span>
        <h1 class="font-heading font-bold text-[24px] sm:text-[26px] text-[#0B253A]">
          Verifikasi Treatment Record, <span class="text-[#137A7F]">Penyerahan Obat &amp; Invoice</span>
        </h1>
        <p class="text-[13px] text-[#475569] max-w-2xl">
          Periksa hasil pemeriksaan SOAP, diagnosis, dan tindakan dari dokter, kelola penyerahan pesanan obat klinik (FEFO), terbitkan invoice resmi, dan verifikasi pembayaran pasien.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2.5 shrink-0">
        <button
          type="button"
          :disabled="refreshingAll"
          class="inline-flex items-center gap-2 px-4 py-2.5 min-h-11 rounded-md bg-white border border-[#D8E6E8] hover:bg-[#DFF1F2] text-[#0B253A] text-xs font-semibold transition-colors"
          @click="refreshAllData"
        >
          <UIcon name="i-lucide-refresh-cw" class="w-4 h-4" />
          <span>{{ refreshingAll ? 'Menyegarkan...' : 'Segarkan Data' }}</span>
        </button>
        <button
          type="button"
          class="px-5 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold transition-colors"
          @click="openCreateModal"
        >
          + Buat Invoice Manual
        </button>
      </div>
    </div>

    <!-- BAGIAN 1: Treatment Record dari Dokter (Menunggu Pembuatan Invoice oleh Admin) -->
    <section class="bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D8E6E8]">
        <div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-[#137A7F] block">
            TAHAP 1 · KIRIMAN TREATMENT RECORD SOAP DARI DOKTER
          </span>
          <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
            Treatment Record Selesai Diperiksa (Menunggu Invoice Admin)
          </h2>
        </div>
        <span class="px-3.5 py-1 rounded-md bg-[#DFF1F2] border border-[#D8E6E8] text-[#137A7F] text-xs font-bold">
          {{ uninvoicedTreatmentRecords.length }} Menunggu Invoice
        </span>
      </div>

      <div v-if="uninvoicedTreatmentRecords.length" class="space-y-4">
        <div
          v-for="rec in uninvoicedTreatmentRecords"
          :key="rec.id"
          class="p-5 rounded-md bg-[#F4F9F9] border border-[#D8E6E8] space-y-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D8E6E8]">
            <div>
              <span class="font-mono text-xs font-bold text-[#137A7F]">
                Kode Booking: #{{ rec.appointment?.bookingCode || rec.id.slice(0, 8) }} · {{ formatDateId(rec.visitDate) }}
              </span>
              <h3 class="font-heading font-bold text-[16px] text-[#0B253A]">
                Pasien: {{ rec.patient?.fullName }} ({{ rec.patient?.medicalRecordNo }}) · Dokter: {{ rec.doctor?.titlePrefix }} {{ rec.doctor?.fullName }}
              </h3>
            </div>
            <span class="px-3 py-1 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#D8E6E8] text-xs font-bold">
              Siap Dibuatkan Invoice
            </span>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-md bg-white border border-[#D8E6E8] space-y-1.5">
              <strong class="text-[#137A7F] uppercase text-[11px] block">Ringkasan SOAP &amp; Tindakan Dokter</strong>
              <p class="text-[#475569]"><strong class="text-[#0B253A]">S:</strong> {{ rec.subjective || rec.chiefComplaint }}</p>
              <p v-if="rec.objective" class="text-[#475569]"><strong class="text-[#0B253A]">O:</strong> {{ rec.objective }}</p>
              <p class="text-[#475569]"><strong class="text-[#0B253A]">A:</strong> {{ rec.assessment }}</p>
              <p v-if="rec.plan" class="text-[#475569]"><strong class="text-[#0B253A]">P:</strong> {{ rec.plan }}</p>
              <ul class="space-y-1 pt-2 border-t border-[#D8E6E8]">
                <li v-for="tr in rec.treatments" :key="tr.id" class="flex justify-between font-medium text-[#0B253A]">
                  <span>• {{ tr.name }} <span v-if="tr.toothNumber">(Gigi {{ tr.toothNumber }})</span></span>
                  <span class="text-[#137A7F] font-bold">{{ formatRupiah(tr.fee) }}</span>
                </li>
              </ul>
            </div>

            <div class="p-3.5 rounded-md bg-white border border-[#D8E6E8] space-y-1.5">
              <strong class="text-[#0B253A] block">Status Resep &amp; Pilihan Pasien:</strong>
              <div v-if="rec.prescriptions && rec.prescriptions.length" class="space-y-2">
                <div v-for="rx in rec.prescriptions" :key="rx.id" class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-mono font-bold text-[#137A7F]">{{ rx.prescriptionNumber }}</span>
                    <span
                      class="px-2 py-0.5 rounded-md text-[10px] font-bold"
                      :class="
                        rx.notes?.includes('APOTEK_LUAR')
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-[#DFF1F2] text-[#137A7F]'
                      "
                    >
                      {{
                        rx.isDispensed
                          ? 'Obat Klinik Diserahkan'
                          : rx.notes?.includes('APOTEK_LUAR')
                            ? 'Beli di Apotek Luar (Rp 0)'
                            : 'Pesanan Obat Klinik'
                      }}
                    </span>
                  </div>
                  <p v-for="it in rx.items" :key="it.id" class="text-slate-600">
                    • {{ it.medicine?.name }} ({{ it.quantity }} {{ it.medicine?.unit }})
                  </p>
                </div>
              </div>
              <p v-else class="text-slate-600">Tidak ada resep obat pada kunjungan ini.</p>
            </div>

            <div class="p-3.5 rounded-md bg-white border border-[#D8E6E8] flex flex-col justify-between gap-3">
              <div class="space-y-1">
                <span class="text-slate-600 block">Estimasi Total Invoice:</span>
                <strong class="font-heading font-extrabold text-xl text-[#137A7F] block">
                  {{ formatRupiah(calculateRecordEstimate(rec).grandTotal) }}
                </strong>
                <span class="text-[11px] text-slate-600 block">
                  Konsultasi {{ formatRupiah(calculateRecordEstimate(rec).consultFee) }} + Tindakan {{ formatRupiah(calculateRecordEstimate(rec).treatmentsTotal) }} + Obat Klinik {{ formatRupiah(calculateRecordEstimate(rec).medicineTotal) }}
                </span>
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  :disabled="creatingFromRecordId === rec.id"
                  class="flex-1 py-2.5 px-3 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold transition-colors"
                  @click="createInvoiceFromTreatmentRecord(rec, false)"
                >
                  Terbitkan Invoice
                </button>
                <button
                  v-if="rec.prescriptions?.some((r: any) => !r.isDispensed && !r.notes?.includes('APOTEK_LUAR'))"
                  type="button"
                  :disabled="creatingFromRecordId === rec.id"
                  class="flex-1 py-2.5 px-3 min-h-11 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
                  @click="createInvoiceFromTreatmentRecord(rec, true)"
                >
                  Serahkan Obat FEFO &amp; Buat Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p v-else class="text-xs text-slate-600">
        Seluruh treatment record dari dokter sudah diterbitkan invoicenya oleh Admin.
      </p>
    </section>

    <!-- BAGIAN 2: Pesanan Obat Pasien dari Klinik (Penyerahan Obat & Pemotongan Stok FEFO) -->
    <section class="lumina-card p-6 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-[#137A7F] block">
            TAHAP 2 · FARMASI KLINIK (METODE FEFO)
          </span>
          <h2 class="font-heading font-bold text-lg text-[#0B253A]">
            Pesanan Obat Pasien dari Klinik (Siap Diserahkan &amp; Potong Stok FEFO)
          </h2>
        </div>
        <span class="px-3.5 py-1 rounded-md bg-[#DFF1F2] text-[#137A7F] text-xs font-bold">
          {{ pendingClinicMedicineOrders.length }} Pesanan Obat
        </span>
      </div>

      <div v-if="pendingClinicMedicineOrders.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="rx in pendingClinicMedicineOrders"
          :key="rx.id"
          class="p-4 rounded-md bg-[#EAF5F6]/50 border border-[#D8E6E8] text-xs space-y-3"
        >
          <div class="flex items-center justify-between">
            <strong class="font-mono text-sm text-[#0B253A]">{{ rx.prescriptionNumber }}</strong>
            <span class="px-2.5 py-0.5 rounded-md bg-[#DFF1F2] text-[#137A7F] font-bold">
              Memilih Beli dari Klinik
            </span>
          </div>
          <p class="text-slate-600">
            Pasien: <strong class="text-[#0B253A]">{{ rx.patientName }}</strong> ({{ rx.medicalRecordNo }}) · Dokter: {{ rx.doctorName }}
          </p>
          <ul class="space-y-1 text-[#0B253A]">
            <li v-for="item in rx.items" :key="item.id" class="flex justify-between">
              <span>• {{ item.medicine?.name }} ({{ item.quantity }} {{ item.medicine?.unit }})</span>
              <span class="font-bold text-[#137A7F]">{{ formatRupiah(Number(item.unitPrice || 0) * Number(item.quantity || 1)) }}</span>
            </li>
          </ul>
          <button
            type="button"
            :disabled="dispensingRxId === rx.id"
            class="w-full py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white font-semibold transition-colors"
            @click="dispenseClinicPrescription(rx.id)"
          >
            {{ dispensingRxId === rx.id ? 'Memproses FEFO...' : 'Serahkan Obat ke Pasien & Potong Stok FEFO' }}
          </button>
        </div>
      </div>

      <p v-else class="text-xs text-slate-600">
        Tidak ada antrean pesanan obat klinik yang menunggu penyerahan.
      </p>
    </section>

    <!-- BAGIAN 3: Tabel Daftar Invoice & Verifikasi Pembayaran -->
    <CommonLoadingSkeleton v-if="pending" :rows="4" />

    <section v-else class="lumina-card overflow-x-auto">
      <div class="p-6 pb-3 flex items-center justify-between">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-[#137A7F] block">
            TAHAP 3 · DAFTAR INVOICE &amp; VERIFIKASI PEMBAYARAN
          </span>
          <h2 class="font-heading font-bold text-lg text-[#0B253A]">
            Daftar Tagihan Resmi &amp; Status Pembayaran Pasien
          </h2>
        </div>
      </div>
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-y border-[#D8E6E8] text-xs text-slate-600 uppercase bg-[#EAF5F6]/50">
            <th class="py-3.5 px-4">No. Invoice</th>
            <th class="py-3.5 px-4">Pasien</th>
            <th class="py-3.5 px-4">Total Tagihan</th>
            <th class="py-3.5 px-4">Status</th>
            <th class="py-3.5 px-4">Detail Pembayaran / Provider</th>
            <th class="py-3.5 px-4 text-right">Verifikasi Pembayaran</th>
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
            <td class="py-3.5 px-4 font-bold text-[#0B253A]">
              {{ formatRupiah(inv.totalAmount) }}
            </td>
            <td class="py-3.5 px-4">
              <CommonStatusBadge :status="inv.status" kind="invoice" />
            </td>
            <td class="py-3.5 px-4 text-xs">
              <div v-if="inv.payments && inv.payments.length" class="space-y-1">
                <div v-for="p in inv.payments" :key="p.id">
                  <span class="font-mono font-semibold text-emerald-700">{{ p.receiptNumber || p.paymentNumber }}</span>
                  · {{ p.method }} · {{ formatDateTimeId(p.paidAt || p.createdAt) }}
                </div>
              </div>
              <span v-else class="text-[#475569]">Belum ada pembayaran</span>
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="inline-flex items-center justify-end gap-1.5">
                <button
                  v-if="inv.status !== 'PAID'"
                  type="button"
                  class="px-3.5 py-2 min-h-11 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold whitespace-nowrap"
                  @click="quickVerifyCash(inv.id)"
                >
                  Verifikasi Lunas
                </button>
                <span
                  v-else
                  class="px-3 py-1.5 rounded-md bg-[#ECFDF5] border border-[#D8E6E8] text-emerald-700 text-xs font-semibold whitespace-nowrap"
                >
                  Terverifikasi Lunas
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Modal Tambah / Edit Tagihan -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 backdrop-blur-xs p-4"
    >
      <form class="lumina-card max-w-lg w-full p-6 space-y-4" @submit.prevent="saveInvoice">
        <div class="flex items-center justify-between">
          <h3 class="font-heading font-bold text-lg text-[#0B253A]">
            {{ editingId ? 'Edit Data Tagihan (Invoice)' : 'Buat Tagihan (Invoice) Manual' }}
          </h3>
          <button type="button" class="text-[#475569] hover:text-[#0B253A]" @click="showModal = false">
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <div v-if="!editingId">
          <label for="inv-patient" class="block text-xs font-semibold text-slate-700 mb-1">Pilih Pasien *</label>
          <select
            id="inv-patient"
            v-model="form.patientId"
            required
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm bg-white"
          >
            <option value="">-- Pilih Pasien --</option>
            <option v-for="p in patientsData?.items || []" :key="p.id" :value="p.id">
              {{ p.medicalRecordNo }} · {{ p.fullName }}
            </option>
          </select>
        </div>

        <div v-if="!editingId">
          <label for="inv-desc" class="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Tindakan / Tagihan *</label>
          <input
            id="inv-desc"
            v-model="form.description"
            type="text"
            required
            placeholder="Deskripsi layanan"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label for="inv-sub" class="block text-xs font-semibold text-slate-700 mb-1">Subtotal (IDR) *</label>
            <input
              id="inv-sub"
              v-model.number="form.subtotal"
              type="number"
              min="0"
              required
              class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label for="inv-disc" class="block text-xs font-semibold text-slate-700 mb-1">Potongan / Diskon (IDR)</label>
            <input
              id="inv-disc"
              v-model.number="form.discount"
              type="number"
              min="0"
              class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
        </div>

        <div v-if="editingId">
          <label for="inv-status" class="block text-xs font-semibold text-slate-700 mb-1">Status Tagihan</label>
          <select
            id="inv-status"
            v-model="form.status"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm bg-white"
          >
            <option value="UNPAID">UNPAID (Belum Dibayar)</option>
            <option value="PARTIAL">PARTIAL (Sebagian)</option>
            <option value="PAID">PAID (Lunas)</option>
            <option value="CANCELLED">CANCELLED (Dibatalkan)</option>
          </select>
        </div>

        <div>
          <label for="inv-notes" class="block text-xs font-semibold text-slate-700 mb-1">Catatan Invoice</label>
          <input
            id="inv-notes"
            v-model="form.notes"
            type="text"
            placeholder="Catatan tambahan"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs font-semibold"
            @click="showModal = false"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-5 py-2 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
          >
            {{ saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Terbitkan Tagihan' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
