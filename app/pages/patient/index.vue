<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { formatRupiah, formatDateId, formatDateTimeId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const auth = useAuthStore()
const toast = useClinicToast()

const [
  { data: apptData },
  { data: invData },
  { data: recData, refresh: refreshRec },
  { data: notifData, refresh: refreshNotif }
] = await Promise.all([
  useFetch('/api/appointments'),
  useFetch('/api/invoices'),
  useFetch('/api/medical-records'),
  useFetch('/api/notifications')
])

const updatingRxId = ref<string | null>(null)
const patientPrescriptions = computed(() => {
  const list: Array<Record<string, unknown>> = []
  for (const r of recData.value?.items || []) {
    for (const rx of r.prescriptions || []) {
      list.push({
        ...rx,
        visitDate: r.visitDate,
        doctorName: `${r.doctor?.titlePrefix || ''} ${r.doctor?.fullName || ''}`.trim()
      })
    }
  }
  return list
})

function getRxChoiceStatus(notes?: string | null, isDispensed?: boolean) {
  if (isDispensed || (notes && notes.includes('BELI_DI_KLINIK_DISERAHKAN'))) {
    return { code: 'DISPENSED', label: 'Obat Klinik Diserahkan', badge: 'bg-[#ECFDF5] text-[#15803D] border-[#D8E6E8]' }
  }
  if (notes && notes.includes('BELI_DI_KLINIK')) {
    return { code: 'CLINIC', label: 'Dipesan dari Klinik', badge: 'bg-[#DFF1F2] text-[#137A7F] border-[#D8E6E8]' }
  }
  if (notes && notes.includes('APOTEK_LUAR')) {
    return { code: 'EXTERNAL', label: 'Apotek Luar', badge: 'bg-[#F4F9F9] text-[#475569] border-[#D8E6E8]' }
  }
  return { code: 'UNSELECTED', label: 'Pilih Tempat Pembelian', badge: 'bg-[#FFFBEB] text-[#B45309] border-[#D8E6E8]' }
}

async function selectRxChoice(rxId: string, action: 'CHOOSE_CLINIC' | 'CHOOSE_EXTERNAL') {
  updatingRxId.value = rxId
  try {
    const res = await $fetch<{ message: string }>(`/api/prescriptions/${rxId}/purchase-choice`, {
      method: 'POST',
      body: { action }
    })
    toast.success('Pilihan Pembelian Obat Tersimpan', res.message)
    await refreshRec()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Pilihan',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  } finally {
    updatingRxId.value = null
  }
}

const appointments = computed(() => apptData.value?.items || [])
const nextAppointment = computed(() =>
  appointments.value.find((a: { status: string }) =>
    ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_TREATMENT'].includes(a.status)
  )
)
const completedVisits = computed(() =>
  appointments.value.filter((a: { status: string }) => a.status === 'COMPLETED')
)

const unpaidInvoices = computed(() =>
  (invData.value?.items || []).filter((i: { status: string }) => i.status !== 'PAID')
)
const totalUnpaidAmount = computed(() =>
  unpaidInvoices.value.reduce(
    (sum: number, i: { totalAmount: number; paidAmount: number }) =>
      sum + (Number(i.totalAmount) - Number(i.paidAmount)),
    0
  )
)

async function markAllNotificationsRead() {
  await $fetch('/api/notifications/read', { method: 'POST', body: { all: true } })
  toast.info('Notifikasi Diperbarui', 'Seluruh notifikasi ditandai sudah dibaca.')
  await refreshNotif()
}
</script>

<template>
  <!-- Figma 14. Patient Dashboard (/patient) -->
  <div class="flex flex-col gap-[22px]">
    <!-- GreetingHero -->
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex flex-col gap-[6px]">
        <p class="text-[11px] font-bold text-[#137A7F]">
          PORTAL PASIEN LUMINA DENTAL CARE
        </p>
        <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
          Selamat Datang, {{ auth.user?.fullName || 'Pasien' }}
        </h1>
        <p class="text-[13px] text-[#475569] max-w-[680px]">
          Pantau jadwal kunjungan, hasil pemeriksaan dokter, pilihan pembelian resep obat, peta gigi Odontogram FDI, dan tagihan perawatan Anda.
        </p>
      </div>
      <NuxtLink
        to="/patient/appointments"
        class="bg-[#137A7F] hover:bg-[#0E5F63] rounded-full px-[22px] py-3 min-h-11 inline-flex items-center justify-center text-[13px] font-semibold text-white shrink-0 transition-colors"
      >
        Booking Appointment Baru
      </NuxtLink>
    </div>

    <!-- KpiRow -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <DashboardCard
        title="Appointment Berikutnya"
        :value="nextAppointment ? formatDateId(nextAppointment.appointmentDate) : 'Belum Ada'"
        :subtitle="nextAppointment ? `Pukul ${nextAppointment.startTime} WIB` : 'Jadwalkan kunjungan Anda'"
        icon="i-lucide-calendar-clock"
        tone="teal"
      />
      <DashboardCard
        title="Status Kunjungan Aktif"
        :value="nextAppointment ? nextAppointment.status : '-'"
        :subtitle="nextAppointment?.queue ? `Antrean: ${nextAppointment.queue.queueNumber}` : 'Verifikasi Otomatis'"
        icon="i-lucide-check-circle-2"
        tone="teal"
      />
      <DashboardCard
        title="Total Kunjungan Selesai"
        :value="completedVisits.length"
        subtitle="Pemeriksaan selesai"
        icon="i-lucide-file-heart"
        tone="emerald"
      />
      <DashboardCard
        title="Tagihan Belum Dibayar"
        :value="formatRupiah(totalUnpaidAmount)"
        :subtitle="`${unpaidInvoices.length} tagihan aktif`"
        icon="i-lucide-wallet"
        :tone="unpaidInvoices.length > 0 ? 'amber' : 'emerald'"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div class="lg:col-span-7 flex flex-col gap-5">
        <!-- NextAppointmentCard -->
        <div class="bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
              Jadwal Appointment Berikutnya
            </h2>
            <NuxtLink to="/patient/appointments" class="text-[12px] font-semibold text-[#137A7F] hover:underline">
              Kelola Jadwal
            </NuxtLink>
          </div>

          <div v-if="nextAppointment" class="p-5 rounded-md bg-[#EAF5F6] border border-[#D8E6E8] space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-[12px] font-bold text-[#137A7F]">
                Kode Booking: #{{ nextAppointment.bookingCode }}
              </span>
              <CommonStatusBadge :status="nextAppointment.status" kind="appointment" />
            </div>
            <div>
              <h3 class="font-heading font-bold text-[16px] text-[#0B253A]">
                {{ nextAppointment.service?.name }}
              </h3>
              <p class="text-[12px] text-[#475569] mt-0.5">
                Dokter: {{ nextAppointment.doctor?.titlePrefix }} {{ nextAppointment.doctor?.fullName }}
                ({{ nextAppointment.doctor?.specialization }})
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-4 text-[12px] text-[#0B253A] pt-2 border-t border-[#D8E6E8]">
              <span>{{ formatDateId(nextAppointment.appointmentDate) }}</span>
              <span>{{ nextAppointment.startTime }} - {{ nextAppointment.endTime }} WIB</span>
              <span
                v-if="nextAppointment.queue"
                class="px-3 py-0.5 rounded-md bg-[#137A7F] text-white font-semibold"
              >
                Antrean: {{ nextAppointment.queue.queueNumber }}
              </span>
            </div>
          </div>

          <CommonEmptyState
            v-else
            title="Belum Ada Appointment Mendatang"
            description="Buat jadwal konsultasi atau perawatan gigi bersama dokter spesialis pilihan Anda."
            action-label="Booking Appointment"
            action-to="/patient/appointments"
          />
        </div>

        <!-- Riwayat Kunjungan -->
        <div class="bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">Riwayat Kunjungan</h2>
            <NuxtLink to="/patient/medical-history" class="text-[12px] font-semibold text-[#137A7F] hover:underline">
              Lihat Rekam Medis
            </NuxtLink>
          </div>

          <div v-if="appointments.length" class="divide-y divide-[#D8E6E8]">
            <div
              v-for="item in appointments.slice(0, 5)"
              :key="item.id"
              class="py-3 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p class="font-semibold text-[13px] text-[#0B253A]">{{ item.service?.name }}</p>
                <p class="text-[12px] text-[#475569]">
                  {{ formatDateId(item.appointmentDate) }} · {{ item.startTime }} WIB ·
                  {{ item.doctor?.titlePrefix }} {{ item.doctor?.fullName }}
                </p>
              </div>
              <CommonStatusBadge :status="item.status" kind="appointment" />
            </div>
          </div>
          <p v-else class="text-[13px] text-[#475569]">Belum ada riwayat kunjungan.</p>
        </div>
      </div>

      <!-- Resep Obat & Notifikasi -->
      <div class="lg:col-span-5 flex flex-col gap-5">
        <div class="bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
              Resep Dokter &amp; Pilihan Obat
            </h2>
            <NuxtLink to="/patient/medical-history" class="text-[12px] font-semibold text-[#137A7F] hover:underline">
              Detail Resep
            </NuxtLink>
          </div>

          <div v-if="patientPrescriptions.length" class="space-y-3">
            <div
              v-for="rx in patientPrescriptions.slice(0, 3)"
              :key="String(rx.id)"
              class="p-4 rounded-md border border-[#D8E6E8] bg-[#EAF5F6]/50 text-[12px] space-y-2.5"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <strong class="text-[#0B253A]">{{ rx.prescriptionNumber }}</strong>
                <span
                  class="px-3 py-0.5 rounded-md border text-[11px] font-bold"
                  :class="getRxChoiceStatus(String(rx.notes || ''), Boolean(rx.isDispensed)).badge"
                >
                  {{ getRxChoiceStatus(String(rx.notes || ''), Boolean(rx.isDispensed)).label }}
                </span>
              </div>
              <p class="text-[#475569]">
                Dokter: {{ rx.doctorName }} · {{ formatDateId(String(rx.visitDate || '')) }}
              </p>
              <ul class="space-y-1 text-[#0B253A]">
                <li v-for="it in (rx.items as Array<Record<string, any>>)" :key="it.id">
                  • <strong>{{ it.medicine?.name }}</strong> ({{ it.quantity }} {{ it.medicine?.unit }}) · {{ it.dosage }}
                </li>
              </ul>
              <div v-if="!rx.isDispensed" class="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  :disabled="updatingRxId === String(rx.id)"
                  class="px-4 py-2 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[12px] font-semibold"
                  @click="selectRxChoice(String(rx.id), 'CHOOSE_CLINIC')"
                >
                  Beli dari Klinik
                </button>
                <button
                  type="button"
                  :disabled="updatingRxId === String(rx.id)"
                  class="px-4 py-2 min-h-11 rounded-md bg-white border border-[#D8E6E8] text-[#0B253A] hover:bg-[#EAF5F6] text-[12px] font-semibold"
                  @click="selectRxChoice(String(rx.id), 'CHOOSE_EXTERNAL')"
                >
                  Beli di Apotek Luar
                </button>
              </div>
            </div>
          </div>
          <p v-else class="text-[12px] text-[#475569]">Belum ada resep obat dari dokter.</p>
        </div>

        <div class="bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">Notifikasi Terbaru</h2>
            <button
              v-if="notifData?.unreadCount"
              type="button"
              class="text-[12px] font-semibold text-[#137A7F] hover:underline"
              @click="markAllNotificationsRead"
            >
              Tandai Dibaca ({{ notifData.unreadCount }})
            </button>
          </div>

          <div v-if="(notifData?.items || []).length" class="space-y-2.5">
            <div
              v-for="n in (notifData?.items || []).slice(0, 4)"
              :key="n.id"
              class="p-3.5 rounded-md border text-[12px] space-y-1"
              :class="n.isRead ? 'bg-white border-[#D8E6E8] text-[#475569]' : 'bg-[#EAF5F6] border-[#D8E6E8] text-[#0B253A]'"
            >
              <div class="flex items-center justify-between gap-2">
                <strong class="font-semibold text-[#0B253A]">{{ n.title }}</strong>
                <span class="text-[11px] text-[#475569]">{{ formatDateTimeId(n.createdAt) }}</span>
              </div>
              <p class="text-[#475569]">{{ n.message }}</p>
            </div>
          </div>
          <p v-else class="text-[12px] text-[#475569]">Belum ada notifikasi baru.</p>
        </div>
      </div>
    </div>
  </div>
</template>
