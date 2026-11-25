<script setup lang="ts">
import { formatDateId, formatRupiah } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const toast = useClinicToast()
const [{ data: recordsData, pending, refresh: refreshRecords }, { data: odontoData }] = await Promise.all([
  useFetch('/api/medical-records'),
  useFetch('/api/odontograms')
])

const updatingRxId = ref<string | null>(null)

function getPurchaseChoiceLabel(notes?: string | null, isDispensed?: boolean) {
  if (isDispensed || (notes && notes.includes('BELI_DI_KLINIK_DISERAHKAN'))) {
    return {
      code: 'DISPENSED',
      label: 'Dibeli dari Klinik (Obat Telah Diserahkan)',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    }
  }
  if (notes && notes.includes('BELI_DI_KLINIK')) {
    return {
      code: 'CLINIC',
      label: 'Pesanan Obat Klinik (Menunggu Penyerahan Admin)',
      badgeClass: 'bg-[#DFF1F2] text-[#137A7F] border-[#D8E6E8]'
    }
  }
  if (notes && notes.includes('APOTEK_LUAR')) {
    return {
      code: 'EXTERNAL',
      label: 'Tebus Sendiri di Apotek Luar (Tanpa Biaya Klinik)',
      badgeClass: 'bg-slate-100 text-slate-700 border-[#D8E6E8]'
    }
  }
  return {
    code: 'UNSELECTED',
    label: 'Belum Memilih Tempat Pembelian Obat',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
  }
}

async function choosePrescriptionPurchase(rxId: string, action: 'CHOOSE_CLINIC' | 'CHOOSE_EXTERNAL') {
  updatingRxId.value = rxId
  try {
    const res = await $fetch<{ message: string }>(`/api/prescriptions/${rxId}/purchase-choice`, {
      method: 'POST',
      body: { action }
    })
    toast.success('Pilihan Pembelian Obat Tersimpan', res.message)
    await refreshRecords()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Pilihan',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  } finally {
    updatingRxId.value = null
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Hero Banner Riwayat Medis & Odontogram selaras dengan Landing Page -->
    <div class="rounded-lg bg-[#EAF5F6] border border-[#D8E6E8] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div class="space-y-2">
        <span class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#DFF1F2] text-[#137A7F] text-xs font-bold uppercase tracking-wider">
          Rekam Medis, Peta Gigi FDI & Pilihan Pembelian Resep
        </span>
        <h1 class="font-heading font-bold text-2xl sm:text-3xl text-[#0B253A]">
          Riwayat Pemeriksaan, Resep Obat &<br>
          <span class="text-[#137A7F]">Peta Odontogram Standar FDI</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 max-w-2xl">
          Pantau kondisi 52 gigi permanen & gigi susu Anda, lihat riwayat diagnosis serta tindakan dokter, dan pilih apakah resep obat ingin dibeli dari klinik atau ditebus sendiri di apotek luar.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3 shrink-0">
        <div class="p-4 rounded-md bg-white border border-[#D8E6E8] flex items-center gap-3">
          <div class="w-11 h-11 rounded-full bg-[#DFF1F2] text-[#137A7F] flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-file-heart" class="w-5 h-5" />
          </div>
          <div>
            <span class="text-[11px] font-bold text-[#137A7F] uppercase block">Kunjungan</span>
            <strong class="font-heading font-bold text-lg text-[#0B253A]">
              {{ (recordsData?.items || []).length }} Riwayat
            </strong>
          </div>
        </div>
        <div class="p-4 rounded-md bg-white border border-[#D8E6E8] flex items-center gap-3">
          <div class="w-11 h-11 rounded-full bg-[#DFF1F2] text-[#137A7F] flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-shield-check" class="w-5 h-5" />
          </div>
          <div>
            <span class="text-[11px] font-bold text-[#137A7F] uppercase block">Standar Peta</span>
            <strong class="font-heading font-bold text-lg text-[#0B253A]">52 Gigi FDI</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Peta Odontogram Readonly Pasien -->
    <OdontogramFdiOdontogramChart
      v-if="odontoData"
      :teeth-catalog="odontoData.teethCatalog || []"
      :latest-by-fdi="odontoData.latestByFdi || {}"
      :history="odontoData.history || []"
      :patient-date-of-birth="odontoData.patient?.dateOfBirth || null"
      :patient-name="odontoData.patient?.fullName || ''"
      readonly
    />

    <!-- Daftar Riwayat Rekam Medis & Pilihan Pembelian Resep Obat -->
    <div class="space-y-4">
      <h2 class="font-heading font-bold text-xl text-[#0B253A]">
        Riwayat Pemeriksaan, Tindakan & Pilihan Pembelian Resep Obat
      </h2>

      <CommonLoadingSkeleton v-if="pending" :rows="3" />

      <CommonEmptyState
        v-else-if="!(recordsData?.items || []).length"
        title="Belum Ada Riwayat Rekam Medis"
        description="Rekam medis akan otomatis muncul setelah dokter menyelesaikan pemeriksaan kunjungan Anda."
      />

      <div v-else class="space-y-5">
        <div
          v-for="rec in recordsData?.items || []"
          :key="rec.id"
          class="lumina-card p-6 space-y-5 border-[#D8E6E8]"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D8E6E8]">
            <div>
              <span class="text-xs font-bold text-[#137A7F]">
                Kunjungan: {{ formatDateId(rec.visitDate) }}
              </span>
              <h3 class="font-heading font-bold text-base text-[#0B253A]">
                Dokter Pemeriksa: {{ rec.doctor?.titlePrefix }} {{ rec.doctor?.fullName }}
                ({{ rec.doctor?.specialization }})
              </h3>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="rec.appointment?.invoice"
                class="px-3 py-1 rounded-md bg-[#ECFDF5] text-[#15803D] border border-[#D8E6E8] text-xs font-bold"
              >
                Invoice: {{ rec.appointment.invoice.invoiceNumber }} ({{ rec.appointment.invoice.status }})
              </span>
              <span
                v-else
                class="px-3 py-1 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#D8E6E8] text-xs font-bold"
              >
                Menunggu Invoice Admin
              </span>
              <span class="px-3.5 py-1 rounded-md bg-[#EAF5F6] text-[#137A7F] text-xs font-semibold">
                Revisi #{{ rec.revisionNumber }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div class="p-4 rounded-md bg-[#F4F9F9] border border-[#D8E6E8] space-y-1">
              <span class="text-xs font-bold text-[#137A7F] uppercase block">S · Keluhan Utama / Subjective</span>
              <p class="text-[#0B253A]">{{ rec.subjective || rec.chiefComplaint }}</p>
              <p v-if="rec.objective" class="text-xs text-[#475569] pt-1">
                <strong class="text-[#0B253A]">O · Pemeriksaan Intraoral:</strong> {{ rec.objective }}
              </p>
            </div>
            <div class="p-4 rounded-md bg-[#EAF5F6]/70 border border-[#D8E6E8] space-y-1">
              <span class="text-xs font-bold text-[#137A7F] uppercase block">A · Assessment / Diagnosis Dokter</span>
              <p class="text-[#0B253A] font-medium">{{ rec.assessment }}</p>
              <p v-if="rec.plan" class="text-xs text-[#475569] pt-1">
                <strong class="text-[#0B253A]">P · Rencana Perawatan:</strong> {{ rec.plan }}
              </p>
            </div>
          </div>

          <!-- Tindakan & Resep dengan Pilihan Pembelian Obat -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                Tindakan Medis yang Dilakukan
              </h4>
              <ul class="space-y-2 text-xs">
                <li
                  v-for="tr in rec.treatments"
                  :key="tr.id"
                  class="flex items-center justify-between p-3 rounded-md border border-[#D8E6E8] bg-white"
                >
                  <span>
                    <strong class="text-[#0B253A]">{{ tr.name }}</strong>
                    <span v-if="tr.toothNumber" class="text-slate-600"> (Gigi #{{ tr.toothNumber }})</span>
                  </span>
                  <span class="font-bold text-[#137A7F]">{{ formatRupiah(tr.fee) }}</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                Resep Obat & Pilihan Tempat Pembelian
              </h4>
              <div v-if="rec.prescriptions && rec.prescriptions.length" class="space-y-3">
                <div
                  v-for="rx in rec.prescriptions"
                  :key="rx.id"
                  class="p-4 rounded-md border border-[#D8E6E8] bg-[#EAF5F6]/40 text-xs space-y-3"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="font-bold text-[#0B253A]">No. Resep: {{ rx.prescriptionNumber }}</div>
                    <span
                      class="px-3 py-1 rounded-md border text-[11px] font-bold"
                      :class="getPurchaseChoiceLabel(rx.notes, rx.isDispensed).badgeClass"
                    >
                      {{ getPurchaseChoiceLabel(rx.notes, rx.isDispensed).label }}
                    </span>
                  </div>

                  <ul class="space-y-1.5">
                    <li v-for="item in rx.items" :key="item.id" class="text-slate-700 flex items-center justify-between gap-2">
                      <span>
                        • <strong>{{ item.medicine?.name }}</strong> ({{ item.quantity }} {{ item.medicine?.unit }}):
                        {{ item.dosage }}, {{ item.frequency }}, {{ item.duration }}
                      </span>
                      <span class="font-semibold text-[#137A7F] shrink-0">
                        {{ formatRupiah(Number(item.unitPrice || 0) * Number(item.quantity || 1)) }}
                      </span>
                    </li>
                  </ul>

                  <!-- Pilihan Pasien: Beli dari Klinik vs Tebus Sendiri di Apotek Luar -->
                  <div v-if="!rx.isDispensed" class="pt-2 border-t border-[#D8E6E8] space-y-2">
                    <p class="text-[11px] text-slate-600">
                      Anda tidak diwajibkan membeli obat dari klinik. Pilih tempat pembelian obat resep Anda:
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <button
                        type="button"
                        :disabled="updatingRxId === rx.id"
                        class="px-4 py-2 min-h-11 rounded-md text-xs font-semibold transition-all"
                        :class="
                          getPurchaseChoiceLabel(rx.notes, rx.isDispensed).code === 'CLINIC'
                            ? 'bg-[#137A7F] text-white shadow-xs'
                            : 'bg-white border border-[#137A7F] text-[#137A7F] hover:bg-[#EAF5F6]'
                        "
                        @click="choosePrescriptionPurchase(rx.id, 'CHOOSE_CLINIC')"
                      >
                        Beli Obat dari Klinik
                      </button>
                      <button
                        type="button"
                        :disabled="updatingRxId === rx.id"
                        class="px-4 py-2 min-h-11 rounded-md text-xs font-semibold transition-all"
                        :class="
                          getPurchaseChoiceLabel(rx.notes, rx.isDispensed).code === 'EXTERNAL'
                            ? 'bg-[#0B253A] text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        "
                        @click="choosePrescriptionPurchase(rx.id, 'CHOOSE_EXTERNAL')"
                      >
                        Beli Sendiri di Apotek Luar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p v-else class="text-xs text-slate-600">Tidak ada resep obat pada kunjungan ini.</p>
            </div>
          </div>

          <div v-if="rec.clinicalNotes" class="pt-3 border-t border-[#D8E6E8] text-xs text-slate-600">
            <strong>Catatan Edukasi Dokter:</strong> {{ rec.clinicalNotes }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
