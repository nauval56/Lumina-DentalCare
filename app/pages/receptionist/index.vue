<script setup lang="ts">
import { formatRupiah, formatDateId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const [
  { data: patientsData },
  { data: apptData },
  { data: queueData },
  { data: invoicesData }
] = await Promise.all([
  useFetch('/api/patients'),
  useFetch('/api/appointments'),
  useFetch('/api/queues'),
  useFetch('/api/invoices')
])

const unpaidInvoices = computed(() =>
  (invoicesData.value?.items || []).filter((i: { status: string }) => i.status !== 'PAID')
)
</script>

<template>
  <div class="space-y-8">
    <!-- Hero Banner Portal Resepsionis selaras dengan Landing Page -->
    <div class="rounded-lg bg-[#EAF5F6] border border-[#D8E6E8] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div class="space-y-1.5">
        <span class="inline-flex items-center px-3.5 py-1 rounded-md bg-[#DFF1F2] text-[#137A7F] text-xs font-bold uppercase tracking-wider">
          Receptionist Portal · Front Desk, Check-In &amp; Antrean Dokter
        </span>
        <h1 class="font-heading font-bold text-2xl sm:text-3xl text-[#0B253A]">
          Dashboard Operasional <span class="text-[#137A7F]">Meja Depan &amp; Antrean</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 max-w-2xl">
          Kelola registrasi pasien walk-in, jadwal appointment harian, check-in kedatangan pasien ke antrean ruang periksa dokter, serta pencatatan pembayaran langsung di klinik.
        </p>
      </div>
      <div class="flex flex-wrap gap-2.5 shrink-0">
        <NuxtLink
          to="/receptionist/patients"
          class="px-5 py-2.5 min-h-11 inline-flex items-center rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          + Registrasi Pasien Walk-In
        </NuxtLink>
        <NuxtLink
          to="/receptionist/queues"
          class="px-5 py-2.5 min-h-11 inline-flex items-center rounded-md bg-white hover:bg-[#DFF1F2] text-[#137A7F] border border-[#D8E6E8] text-xs font-semibold transition-colors"
        >
          Check-In &amp; Nomor Antrean
        </NuxtLink>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <DashboardCard
        title="Total Pasien Terdaftar"
        :value="patientsData?.total ?? 0"
        subtitle="Database pasien aktif"
        icon="i-lucide-users"
        tone="sky"
      />
      <DashboardCard
        title="Appointment Aktif"
        :value="(apptData?.items || []).length"
        subtitle="Semua jadwal kunjungan"
        icon="i-lucide-calendar"
        tone="teal"
      />
      <DashboardCard
        title="Antrean Hari Ini"
        :value="(queueData?.items || []).length"
        :subtitle="formatDateId(new Date())"
        icon="i-lucide-list-ordered"
        tone="emerald"
      />
      <DashboardCard
        title="Menunggu Pembayaran"
        :value="unpaidInvoices.length"
        subtitle="Verifikasi kasir manual"
        icon="i-lucide-receipt"
        tone="amber"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Antrean Terkini -->
      <div class="lumina-card p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-heading font-bold text-lg text-[#0B253A]">Status Antrean Klinik</h2>
          <NuxtLink to="/receptionist/queues" class="text-xs font-semibold text-[#137A7F] hover:underline">
            Kelola Antrean →
          </NuxtLink>
        </div>

        <div v-if="(queueData?.items || []).length" class="space-y-2.5">
          <div
            v-for="q in (queueData?.items || []).slice(0, 6)"
            :key="q.id"
            class="p-3.5 rounded-md bg-[#F4F9F9] flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-3">
              <span class="px-3 py-1.5 rounded-lg bg-[#137A7F] text-white font-bold text-xs">
                {{ q.queueNumber }}
              </span>
              <div>
                <p class="font-semibold text-sm text-[#0B253A]">{{ q.patient?.fullName }}</p>
                <p class="text-xs text-[#475569]">
                  {{ q.doctor?.titlePrefix }} {{ q.doctor?.fullName }}
                </p>
              </div>
            </div>
            <CommonStatusBadge :status="q.status" kind="queue" />
          </div>
        </div>
        <p v-else class="text-xs text-[#475569]">Belum ada pasien check-in hari ini.</p>
      </div>

      <!-- Tagihan Menunggu Verifikasi Kasir -->
      <div class="lumina-card p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-heading font-bold text-lg text-[#0B253A]">Tagihan Belum Lunas</h2>
          <NuxtLink to="/receptionist/payments" class="text-xs font-semibold text-[#137A7F] hover:underline">
            Verifikasi Pembayaran →
          </NuxtLink>
        </div>

        <div v-if="unpaidInvoices.length" class="space-y-2.5">
          <div
            v-for="inv in unpaidInvoices.slice(0, 5)"
            :key="inv.id"
            class="p-3.5 rounded-md border border-[#D8E6E8] flex items-center justify-between gap-3"
          >
            <div>
              <span class="font-mono text-xs font-bold text-[#137A7F]">{{ inv.invoiceNumber }}</span>
              <p class="font-semibold text-sm text-[#0B253A]">{{ inv.patient?.fullName }}</p>
            </div>
            <div class="text-right">
              <strong class="text-sm font-bold text-[#0B253A] block">
                {{ formatRupiah(inv.totalAmount) }}
              </strong>
              <CommonStatusBadge :status="inv.status" kind="invoice" />
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-[#475569]">Seluruh tagihan sudah terverifikasi lunas.</p>
      </div>
    </div>
  </div>
</template>
