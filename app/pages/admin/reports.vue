<script setup lang="ts">
import { formatRupiah, formatDateId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const activeTab = ref<'REVENUE' | 'APPOINTMENTS' | 'PATIENTS' | 'INVENTORY'>('REVENUE')
const toast = useClinicToast()

const [
  { data: revData },
  { data: apptData },
  { data: patData },
  { data: invData }
] = await Promise.all([
  useFetch('/api/reports/revenue'),
  useFetch('/api/reports/appointments'),
  useFetch('/api/reports/patients'),
  useFetch('/api/reports/inventory')
])

function exportCurrentReportCsv() {
  if (!import.meta.client) return
  let rows: string[][] = []
  if (activeTab.value === 'REVENUE') {
    rows = [
      ['No Kwitansi', 'No Invoice', 'Pasien', 'Metode', 'Nominal IDR', 'Tanggal'],
      ...(revData.value?.items || []).map((p: Record<string, unknown>) => [
        String(p.receiptNumber || p.paymentNumber),
        String((p.invoice as Record<string, unknown>)?.invoiceNumber || ''),
        String(((p.invoice as Record<string, unknown>)?.patient as Record<string, unknown>)?.fullName || ''),
        String(p.method),
        String(p.amount),
        String(p.createdAt)
      ])
    ]
  } else if (activeTab.value === 'APPOINTMENTS') {
    rows = [
      ['Kode Booking', 'Pasien', 'Dokter', 'Layanan', 'Tanggal', 'Status'],
      ...(apptData.value?.items || []).map((a: Record<string, unknown>) => [
        String(a.bookingCode),
        String((a.patient as Record<string, unknown>)?.fullName || ''),
        String((a.doctor as Record<string, unknown>)?.fullName || ''),
        String((a.service as Record<string, unknown>)?.name || ''),
        String(a.appointmentDate),
        String(a.status)
      ])
    ]
  } else if (activeTab.value === 'PATIENTS') {
    rows = [
      ['No RM', 'Nama Pasien', 'Telepon', 'Total Appointment'],
      ...(patData.value?.items || []).map((p: Record<string, unknown>) => [
        String(p.medicalRecordNo),
        String(p.fullName),
        String(p.phone),
        String((p._count as Record<string, unknown>)?.appointments ?? 0)
      ])
    ]
  } else {
    rows = [
      ['Kode Obat', 'Nama Obat', 'Kategori', 'Satuan', 'Stok Tersedia', 'Stok Minimum'],
      ...(invData.value?.medicines || []).map((m: Record<string, unknown>) => [
        String(m.code),
        String(m.name),
        String(m.category),
        String(m.unit),
        String(m.availableStock),
        String(m.minimumStock)
      ])
    ]
  }

  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-${activeTab.value.toLowerCase()}-lumina.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Laporan Diunduh', `File CSV laporan ${activeTab.value} berhasil diunduh.`)
}
</script>

<template>
  <!-- Figma 35. Admin Laporan Operasional (/admin/reports) -->
  <div class="flex flex-col gap-[22px]">
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold uppercase text-[#137A7F]">
          ADMIN · LAPORAN OPERASIONAL &amp; KEUANGAN KLINIK
        </span>
        <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
          Pusat Laporan &amp; Export Data
        </h1>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-5 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold transition-colors"
        @click="exportCurrentReportCsv"
      >
        <UIcon name="i-lucide-download" class="w-4 h-4" />
        <span>Export Laporan CSV</span>
      </button>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="tab in [
          { code: 'REVENUE', label: 'Laporan Pendapatan & Pembayaran' },
          { code: 'APPOINTMENTS', label: 'Laporan Appointment & Kunjungan' },
          { code: 'PATIENTS', label: 'Laporan Pasien' },
          { code: 'INVENTORY', label: 'Laporan Persediaan Obat' }
        ]"
        :key="tab.code"
        type="button"
        class="px-4 py-2.5 min-h-11 rounded-md text-[12px] font-semibold transition-colors"
        :class="
          activeTab === tab.code
            ? 'bg-[#137A7F] text-white'
            : 'bg-white border border-[#D8E6E8] text-[#0B253A] hover:bg-[#EAF5F6]'
        "
        @click="activeTab = tab.code as typeof activeTab"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Pendapatan -->
    <div v-if="activeTab === 'REVENUE'" class="lumina-card p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="font-heading font-bold text-base text-[#0B253A]">
          Rincian Pendapatan Terverifikasi
        </h2>
        <strong class="font-heading font-bold text-lg text-emerald-600">
          Total: {{ formatRupiah(revData?.totalRevenue ?? 0) }}
        </strong>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase">
              <th class="py-3 px-3">No. Kwitansi</th>
              <th class="py-3 px-3">Pasien</th>
              <th class="py-3 px-3">Metode</th>
              <th class="py-3 px-3">Tanggal</th>
              <th class="py-3 px-3 text-right">Nominal (IDR)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D8E6E8]/60">
            <tr v-for="p in revData?.items || []" :key="p.id">
              <td class="py-3 px-3 font-mono text-xs font-bold text-[#137A7F]">
                {{ p.receiptNumber || p.paymentNumber }}
              </td>
              <td class="py-3 px-3 font-medium">{{ p.invoice?.patient?.fullName }}</td>
              <td class="py-3 px-3 text-xs">{{ p.method }}</td>
              <td class="py-3 px-3 text-xs text-[#475569]">{{ formatDateId(p.createdAt) }}</td>
              <td class="py-3 px-3 text-right font-bold text-[#0B253A]">{{ formatRupiah(p.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab Appointment -->
    <div v-else-if="activeTab === 'APPOINTMENTS'" class="lumina-card p-6 space-y-4">
      <h2 class="font-heading font-bold text-base text-[#0B253A]">
        Laporan Kunjungan & Appointment ({{ apptData?.total ?? 0 }})
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase">
              <th class="py-3 px-3">Kode Booking</th>
              <th class="py-3 px-3">Tanggal</th>
              <th class="py-3 px-3">Pasien</th>
              <th class="py-3 px-3">Dokter</th>
              <th class="py-3 px-3">Layanan</th>
              <th class="py-3 px-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D8E6E8]/60">
            <tr v-for="a in apptData?.items || []" :key="a.id">
              <td class="py-3 px-3 font-mono text-xs font-bold text-[#137A7F]">{{ a.bookingCode }}</td>
              <td class="py-3 px-3 text-xs">{{ formatDateId(a.appointmentDate) }}</td>
              <td class="py-3 px-3 font-medium">{{ a.patient?.fullName }}</td>
              <td class="py-3 px-3 text-xs">{{ a.doctor?.titlePrefix }} {{ a.doctor?.fullName }}</td>
              <td class="py-3 px-3 text-xs">{{ a.service?.name }}</td>
              <td class="py-3 px-3"><CommonStatusBadge :status="a.status" kind="appointment" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab Pasien -->
    <div v-else-if="activeTab === 'PATIENTS'" class="lumina-card p-6 space-y-4">
      <h2 class="font-heading font-bold text-base text-[#0B253A]">
        Rekapitulasi Pasien ({{ patData?.total ?? 0 }})
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase">
              <th class="py-3 px-3">No. RM</th>
              <th class="py-3 px-3">Nama Pasien</th>
              <th class="py-3 px-3">Telepon</th>
              <th class="py-3 px-3">Jumlah Kunjungan</th>
              <th class="py-3 px-3">Rekam Medis</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D8E6E8]/60">
            <tr v-for="p in patData?.items || []" :key="p.id">
              <td class="py-3 px-3 font-mono text-xs font-bold text-[#137A7F]">{{ p.medicalRecordNo }}</td>
              <td class="py-3 px-3 font-medium">{{ p.fullName }}</td>
              <td class="py-3 px-3 text-xs">{{ p.phone }}</td>
              <td class="py-3 px-3 text-xs">{{ p._count?.appointments ?? 0 }}x</td>
              <td class="py-3 px-3 text-xs">{{ p._count?.medicalRecords ?? 0 }} Dokumen</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab Persediaan Obat -->
    <div v-else class="lumina-card p-6 space-y-4">
      <h2 class="font-heading font-bold text-base text-[#0B253A]">
        Laporan Persediaan Obat & Mutasi Stok
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase">
              <th class="py-3 px-3">Kode</th>
              <th class="py-3 px-3">Nama Obat</th>
              <th class="py-3 px-3">Kategori</th>
              <th class="py-3 px-3">Stok Tersedia</th>
              <th class="py-3 px-3">Stok Minimum</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D8E6E8]/60">
            <tr v-for="m in invData?.medicines || []" :key="m.id">
              <td class="py-3 px-3 font-mono text-xs font-bold text-[#137A7F]">{{ m.code }}</td>
              <td class="py-3 px-3 font-medium">{{ m.name }}</td>
              <td class="py-3 px-3 text-xs">{{ m.category }}</td>
              <td class="py-3 px-3 font-bold">{{ m.availableStock }} {{ m.unit }}</td>
              <td class="py-3 px-3 text-xs text-[#475569]">{{ m.minimumStock }} {{ m.unit }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
