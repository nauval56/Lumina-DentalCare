<script setup lang="ts">
import { formatRupiah, formatDateId, formatDateTimeId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const { data, pending, refresh } = await useFetch('/api/reports/overview')

const adminModuleTabs = [
  { label: 'Ringkasan Eksekutif & KPI', to: '/admin' },
  { label: 'Treatment Record & Invoice', to: '/admin/payments' },
  { label: 'Inventaris Obat & Batch FEFO', to: '/admin/inventory' },
  { label: 'Jadwal Dokter & Appointment', to: '/admin/appointments' },
  { label: 'Audit Log & Laporan', to: '/admin/reports' }
]
const activeTab = ref(0)

const revenueCategories = computed(() => {
  const list = data.value?.charts?.revenueSeries || []
  return list.length ? list.map((r: { date: string }) => r.date) : ['Belum Ada Transaksi']
})

const revenueSeries = computed(() => {
  const list = data.value?.charts?.revenueSeries || []
  return [
    {
      name: 'Pendapatan Terverifikasi (IDR)',
      data: list.length ? list.map((r: { amount: number }) => r.amount) : [0]
    }
  ]
})

const visitsCategories = computed(() => {
  const list = data.value?.charts?.visitsSeries || []
  return list.length ? list.map((v: { date: string }) => v.date) : ['Belum Ada Kunjungan']
})

const visitsSeries = computed(() => {
  const list = data.value?.charts?.visitsSeries || []
  return [
    {
      name: 'Kunjungan Pasien',
      data: list.length ? list.map((v: { count: number }) => v.count) : [0]
    }
  ]
})

const serviceCategories = computed(() =>
  (data.value?.charts?.popularServices || []).slice(0, 5).map((s: { name: string }) => s.name)
)

const serviceSeries = computed(() => [
  {
    name: 'Jumlah Tindakan',
    data: (data.value?.charts?.popularServices || []).slice(0, 5).map((s: { usageCount: number }) => Math.max(s.usageCount, 1))
  }
])
</script>

<template>
  <!-- 4. Overview Analitik Admin (Rapi, nyaman dilihat & konsisten Figma 27) -->
  <div class="flex flex-col gap-[22px]">
    <!-- Section 1: Executive Hero Canvas + Today's Operational Summary -->
    <section class="rounded-lg bg-[#EAF5F6] border border-[#D8E6E8] p-[26px] space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <!-- Left Hero Content (7 cols) -->
        <div class="lg:col-span-7 space-y-4">
          <div class="pl-3.5 border-l-2 border-[#137A7F]">
            <p class="text-xs font-bold uppercase tracking-wider text-[#137A7F]">
              ADMIN DASHBOARD EKSEKUTIF · LUMINA DENTAL CARE
            </p>
          </div>

          <h1 class="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#0B253A] leading-tight">
            Pusat Kendali Operasional,<br>
            <span class="text-[#137A7F]">Treatment Record, Farmasi FEFO &amp; Invoice</span>
          </h1>

          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
            Pantau kinerja operasional klinik secara real-time, periksa treatment record yang dikirimkan dokter untuk penerbitan invoice, kelola penyerahan pesanan obat pasien dengan metode FEFO, dan verifikasi pembayaran.
          </p>

          <div class="flex flex-wrap items-center gap-3 pt-1">
            <!-- Pill CTA with white circle icon on right (matches Landing Page Hero CTA) -->
            <NuxtLink
              to="/admin/payments"
              class="inline-flex items-center gap-3 pl-5 pr-2 py-2 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs"
            >
              <span>Periksa Treatment Record &amp; Buat Invoice</span>
              <span class="w-7 h-7 rounded-full bg-white text-[#137A7F] inline-flex items-center justify-center shrink-0" aria-hidden="true">
                <UIcon name="i-lucide-file-check-2" class="w-4 h-4" />
              </span>
            </NuxtLink>

            <NuxtLink
              to="/admin/inventory"
              class="inline-flex items-center gap-2 px-5 py-2.5 min-h-11 rounded-md bg-white hover:bg-[#DFF1F2]/70 text-[#0B253A] border border-[#D8E6E8] font-semibold text-xs sm:text-sm transition-colors"
            >
              <span>Kelola Stok Obat &amp; Batch FEFO</span>
            </NuxtLink>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-11 rounded-md bg-white hover:bg-[#DFF1F2]/70 text-[#137A7F] border border-[#D8E6E8] font-semibold text-xs transition-colors"
              @click="refresh()"
            >
              <UIcon name="i-lucide-refresh-cw" class="w-4 h-4" aria-hidden="true" />
              <span>Segarkan Data</span>
            </button>
          </div>
        </div>

        <!-- Right Card: Ringkasan Operasional Klinik Hari Ini (5 cols) -->
        <div class="lg:col-span-5">
          <div class="rounded-lg bg-white border border-[#D8E6E8] p-5 sm:p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between gap-2">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-wider text-[#137A7F] block">
                  STATUS KLINIK HARI INI
                </span>
                <h2 class="font-heading font-bold text-base text-[#0B253A]">
                  Ringkasan Operasional &amp; Keuangan
                </h2>
              </div>
              <span class="px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                Sistem Aktif
              </span>
            </div>

            <div class="p-4 rounded-md bg-[#EAF5F6] border border-[#D8E6E8] flex items-center justify-between">
              <div>
                <span class="text-xs font-semibold text-slate-600 block">Total Pendapatan Terverifikasi</span>
                <strong class="font-heading font-extrabold text-xl sm:text-2xl text-[#137A7F]">
                  {{ formatRupiah(data?.kpi?.totalRevenue ?? 0) }}
                </strong>
              </div>
              <div class="w-11 h-11 rounded-full bg-white text-[#137A7F] flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-wallet" class="w-5 h-5" aria-hidden="true" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3.5 rounded-md bg-[#F4F9F9] border border-[#D8E6E8]">
                <span class="text-slate-600 block">Appointment Hari Ini</span>
                <strong class="text-base font-bold text-[#0B253A]">
                  {{ data?.kpi?.todayAppointments ?? 0 }} Kunjungan
                </strong>
              </div>
              <div class="p-3.5 rounded-md bg-[#F4F9F9] border border-[#D8E6E8]">
                <span class="text-slate-600 block">Transaksi Lunas</span>
                <strong class="text-base font-bold text-[#137A7F]">
                  {{ data?.kpi?.totalTransactions ?? 0 }} Invoice
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Floating 4-Pillar Operational Bar at Bottom of Hero (Matches Figma Screen 27 & Landing Page) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <div class="flex items-center gap-3.5 p-4 rounded-md bg-white/85 border border-[#D8E6E8]">
          <div class="w-10 h-10 rounded-full bg-[#DFF1F2] text-[#137A7F] flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-clipboard-check" class="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 class="font-heading font-bold text-xs sm:text-sm text-[#0B253A]">Verifikasi Treatment Record</h3>
            <p class="text-[11px] text-slate-600">Dokter kirim record → Admin buat invoice</p>
          </div>
        </div>

        <div class="flex items-center gap-3.5 p-4 rounded-md bg-white/85 border border-[#D8E6E8]">
          <div class="w-10 h-10 rounded-full bg-[#DFF1F2] text-[#137A7F] flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-package-check" class="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 class="font-heading font-bold text-xs sm:text-sm text-[#0B253A]">Kontrol Farmasi FEFO</h3>
            <p class="text-[11px] text-slate-600">Stok berkurang saat obat diserahkan</p>
          </div>
        </div>

        <div class="flex items-center gap-3.5 p-4 rounded-md bg-white/85 border border-[#D8E6E8]">
          <div class="w-10 h-10 rounded-full bg-[#DFF1F2] text-[#137A7F] flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-receipt" class="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 class="font-heading font-bold text-xs sm:text-sm text-[#0B253A]">Rekonsiliasi Pembayaran</h3>
            <p class="text-[11px] text-slate-600">Verifikasi pembayaran pasien &amp; kwitansi</p>
          </div>
        </div>

        <div class="flex items-center gap-3.5 p-4 rounded-md bg-white/85 border border-[#D8E6E8]">
          <div class="w-10 h-10 rounded-full bg-[#DFF1F2] text-[#137A7F] flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-shield-alert" class="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 class="font-heading font-bold text-xs sm:text-sm text-[#0B253A]">Audit Log Terintegrasi</h3>
            <p class="text-[11px] text-slate-600">Jejak perubahan rekam medis &amp; transaksi</p>
          </div>
        </div>
      </div>
    </section>

    <CommonLoadingSkeleton v-if="pending" :rows="4" />

    <!-- Section 2: White Rounded Content Sheet -->
    <section class="rounded-lg bg-white border border-[#D8E6E8] p-6 space-y-6">
      <!-- 5-Module Tab Strip with #137A7F 3px active underline -->
      <div class="border-b border-[#D8E6E8] overflow-x-auto">
        <div class="flex items-center justify-between min-w-max gap-4">
          <NuxtLink
            v-for="(tab, idx) in adminModuleTabs"
            :key="tab.label"
            :to="tab.to"
            class="px-4 py-3 min-h-11 inline-flex items-center text-xs sm:text-sm transition-colors border-b-[3px] whitespace-nowrap"
            :class="
              activeTab === idx
                ? 'border-[#137A7F] text-[#137A7F] font-bold'
                : 'border-transparent text-slate-600 hover:text-[#0B253A] font-medium'
            "
            @click="activeTab = idx"
          >
            {{ tab.label }}
          </NuxtLink>
        </div>
      </div>

      <!-- 8 KPI Statistik Wajib (PRD Bab 10) dengan gaya Circular Mint Icon -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Pasien"
          :value="data?.kpi?.totalPatients ?? 0"
          subtitle="Pasien terdaftar aktif"
          icon="i-lucide-users"
          tone="teal"
        />
        <DashboardCard
          title="Total Dokter Aktif"
          :value="data?.kpi?.totalDoctors ?? 0"
          subtitle="Spesialis & dokter umum"
          icon="i-lucide-stethoscope"
          tone="teal"
        />
        <DashboardCard
          title="Appointment Hari Ini"
          :value="data?.kpi?.todayAppointments ?? 0"
          :subtitle="`${data?.kpi?.upcomingAppointments ?? 0} jadwal mendatang`"
          icon="i-lucide-calendar-check"
          tone="teal"
        />
        <DashboardCard
          title="Total Pendapatan"
          :value="formatRupiah(data?.kpi?.totalRevenue ?? 0)"
          :subtitle="`${data?.kpi?.totalTransactions ?? 0} transaksi lunas`"
          icon="i-lucide-wallet"
          tone="emerald"
        />
        <DashboardCard
          title="Appointment Mendatang"
          :value="data?.kpi?.upcomingAppointments ?? 0"
          subtitle="Status Confirmed & Checked-In"
          icon="i-lucide-calendar-clock"
          tone="teal"
        />
        <DashboardCard
          title="Jumlah Transaksi"
          :value="data?.kpi?.totalTransactions ?? 0"
          subtitle="Pembayaran terverifikasi"
          icon="i-lucide-receipt"
          tone="emerald"
        />
        <DashboardCard
          title="Obat Stok Rendah"
          :value="data?.kpi?.lowStockCount ?? 0"
          subtitle="Di bawah batas stok minimum"
          icon="i-lucide-alert-triangle"
          :tone="(data?.kpi?.lowStockCount ?? 0) > 0 ? 'amber' : 'emerald'"
        />
        <DashboardCard
          title="Mendekati Kedaluwarsa"
          :value="data?.kpi?.nearExpiryCount ?? 0"
          subtitle="Prioritas FEFO (< 60 hari)"
          icon="i-lucide-clock-alert"
          :tone="(data?.kpi?.nearExpiryCount ?? 0) > 0 ? 'rose' : 'emerald'"
        />
      </div>

      <!-- Split 2-Card Asymmetric Section (Matches Figma Screen 27 & Landing Page Split Section) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <!-- Left Card: Analitik Kinerja & Kepatuhan Alur Operasional (7 cols) -->
        <div class="lg:col-span-7 rounded-lg bg-[#EAF5F6] border border-[#D8E6E8] p-6 sm:p-7 flex flex-col justify-between gap-6">
          <div class="space-y-3">
            <span class="text-xs font-bold uppercase tracking-wider text-[#137A7F] block">
              ANALITIK EKSEKUTIF &amp; ALUR PELAYANAN
            </span>
            <h2 class="font-heading font-extrabold text-xl sm:text-2xl text-[#0B253A]">
              Integrasi Pemeriksaan Dokter, Farmasi FEFO &amp; Invoice Admin
            </h2>
            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Seluruh transaksi medis dan farmasi di Lumina Dental Care mengikuti pemisahan wewenang klinis dan administratif sesuai standar operasional PRD.
            </p>

            <ul class="space-y-2.5 text-xs text-[#0B253A] pt-2">
              <li class="flex items-center gap-2.5 font-medium">
                <span class="w-5 h-5 rounded-full bg-[#137A7F] text-white inline-flex items-center justify-center text-[11px] font-bold shrink-0">✓</span>
                <span>Dokter mencatat pemeriksaan SOAP, diagnosis, tindakan &amp; mengirim treatment record ke Admin</span>
              </li>
              <li class="flex items-center gap-2.5 font-medium">
                <span class="w-5 h-5 rounded-full bg-[#137A7F] text-white inline-flex items-center justify-center text-[11px] font-bold shrink-0">✓</span>
                <span>Pasien bebas memilih beli obat dari klinik atau tebus sendiri di apotek luar</span>
              </li>
              <li class="flex items-center gap-2.5 font-medium">
                <span class="w-5 h-5 rounded-full bg-[#137A7F] text-white inline-flex items-center justify-center text-[11px] font-bold shrink-0">✓</span>
                <span>Admin menerbitkan invoice, menyerahkan obat klinik (FEFO) &amp; memverifikasi pembayaran</span>
              </li>
            </ul>
          </div>

          <div class="pt-4 border-t border-[#D8E6E8] flex flex-wrap items-center justify-between gap-3">
            <NuxtLink
              to="/admin/payments"
              class="inline-flex items-center gap-2 px-5 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold transition-colors"
            >
              <span>Buka Modul Invoice &amp; Pesanan Obat</span>
              <UIcon name="i-lucide-arrow-right" class="w-4 h-4" aria-hidden="true" />
            </NuxtLink>
            <NuxtLink
              to="/admin/reports"
              class="inline-flex items-center gap-2 px-4 py-2.5 min-h-11 rounded-md bg-white hover:bg-[#DFF1F2] text-[#0B253A] border border-[#D8E6E8] text-xs font-semibold transition-colors"
            >
              <span>Ekspor Laporan CSV / Excel</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Right Card: Peringatan Stok Obat FEFO & White Overlay Card (5 cols) -->
        <div class="lg:col-span-5 rounded-lg bg-[#DFF1F2] border border-[#D8E6E8] p-6 flex flex-col justify-between gap-5">
          <div class="flex items-center justify-between gap-2">
            <div>
              <span class="inline-block px-3 py-1 rounded-md bg-white text-[#137A7F] text-[11px] font-bold">
                PENGAWASAN FARMASI FEFO
              </span>
              <h2 class="font-heading font-bold text-lg text-[#0B253A] mt-2">
                Peringatan Stok Rendah &amp; Kedaluwarsa Batch
              </h2>
            </div>
            <NuxtLink to="/admin/inventory" class="text-xs font-bold text-[#137A7F] hover:underline">
              Kelola Stok
            </NuxtLink>
          </div>

          <div class="rounded-md bg-white border border-[#D8E6E8] p-4 space-y-2.5 text-xs shadow-xs">
            <div
              v-for="med in (data?.alerts?.lowStockMedicines || []).slice(0, 2)"
              :key="med.id"
              class="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between"
            >
              <div>
                <strong class="text-amber-950 block">{{ med.name }}</strong>
                <span class="text-amber-800">Stok minimum: {{ med.minimumStock }} {{ med.unit }}</span>
              </div>
              <span class="px-2.5 py-1 rounded-md bg-amber-200/70 text-amber-900 font-bold">
                Sisa: {{ med.availableStock }} {{ med.unit }}
              </span>
            </div>

            <div
              v-for="med in (data?.alerts?.nearExpiryMedicines || []).slice(0, 2)"
              :key="`exp-${med.id}`"
              class="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between"
            >
              <div>
                <strong class="text-rose-950 block">{{ med.name }}</strong>
                <span class="text-rose-800">Prioritas FEFO Mendekati ED</span>
              </div>
              <span class="px-2.5 py-1 rounded-md bg-rose-200/70 text-rose-900 font-bold">
                ED: {{ formatDateId(med.earliestExpiry) }}
              </span>
            </div>

            <p
              v-if="!(data?.alerts?.lowStockMedicines?.length) && !(data?.alerts?.nearExpiryMedicines?.length)"
              class="text-slate-600 py-2"
            >
              Seluruh stok obat aktif berada di atas batas minimum dan aman dari tanggal kedaluwarsa.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3: Grafik ApexCharts Analitik Klinik -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DashboardRevenueChart
        title="Berapa Pendapatan Terverifikasi per Tanggal (IDR)?"
        subtitle="Akumulasi transaksi pembayaran lunas dari database klinik"
        type="area"
        :categories="revenueCategories"
        :series="revenueSeries"
      />
      <DashboardRevenueChart
        title="Berapa Jumlah Kunjungan & Appointment Pasien per Hari?"
        subtitle="Volume penjadwalan pasien aktual berdasarkan tanggal kunjungan"
        type="bar"
        :categories="visitsCategories"
        :series="visitsSeries"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-5">
        <DashboardRevenueChart
          title="Layanan Perawatan Gigi Paling Populer"
          subtitle="5 tindakan klinis dengan frekuensi tertinggi"
          type="bar"
          :categories="serviceCategories"
          :series="serviceSeries"
        />
      </div>

      <!-- Jejak Audit Log Terbaru -->
      <div class="lg:col-span-7 lumina-card p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-heading font-bold text-lg text-[#0B253A]">
            Audit Log Keamanan &amp; Perubahan Penting Sistem
          </h2>
          <span class="px-3 py-1 rounded-md bg-[#EAF5F6] text-[#137A7F] text-xs font-semibold">
            10 Aktivitas Terakhir
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-[#D8E6E8] text-slate-600 uppercase bg-[#EAF5F6]/50">
                <th class="py-2.5 px-3">Waktu</th>
                <th class="py-2.5 px-3">Pengguna / Role</th>
                <th class="py-2.5 px-3">Aksi</th>
                <th class="py-2.5 px-3">Entitas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#D8E6E8]/60">
              <tr v-for="log in (data?.auditLogs || []).slice(0, 8)" :key="log.id">
                <td class="py-2.5 px-3 text-slate-600">{{ formatDateTimeId(log.createdAt) }}</td>
                <td class="py-2.5 px-3 font-semibold text-[#0B253A]">
                  {{ log.actor?.fullName || 'System' }}
                  <span v-if="log.actorRole" class="text-[#137A7F]">({{ log.actorRole }})</span>
                </td>
                <td class="py-2.5 px-3 font-mono font-semibold text-[#137A7F]">{{ log.action }}</td>
                <td class="py-2.5 px-3 text-slate-600">{{ log.entityType }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
