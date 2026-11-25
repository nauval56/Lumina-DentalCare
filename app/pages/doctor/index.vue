<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import {
  formatDateId,
  formatDayAndDateId,
  getDateStringForDayOfWeek,
  formatScheduleDayAndDate
} from '~/utils/format'

definePageMeta({ layout: 'portal' })

const auth = useAuthStore()
const toast = useClinicToast()

const [
  { data: apptData, refresh: refreshAppt },
  { data: queueData, refresh: refreshQueue },
  { data: schedulesData, refresh: refreshSchedules }
] = await Promise.all([
  useFetch('/api/appointments'),
  useFetch('/api/queues'),
  useFetch('/api/schedules', {
    query: computed(() => (auth.user?.doctorId ? { doctorId: auth.user.doctorId } : {}))
  })
])

const showDoctorScheduleForm = ref(false)
const savingSchedule = ref(false)
const doctorScheduleForm = reactive({
  offDate: getDateStringForDayOfWeek(0),
  offDayOfWeek: 0,
  startTime: '09:00',
  endTime: '17:00',
  slotDurationMin: 30,
  maxPatients: 12
})

watch(
  () => doctorScheduleForm.offDate,
  (val) => {
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const d = new Date(`${val}T00:00:00`)
      if (!Number.isNaN(d.getTime())) {
        doctorScheduleForm.offDayOfWeek = d.getDay()
      }
    }
  }
)

async function saveMyWeeklySchedule() {
  if (!auth.user?.doctorId) {
    toast.error('Akses Khusus Dokter', 'Silakan masuk menggunakan akun Dokter Gigi.')
    return
  }
  savingSchedule.value = true
  try {
    const res = await $fetch<{ message: string }>('/api/schedules', {
      method: 'POST',
      body: {
        mode: 'WEEKLY_WITH_OFF_DAY',
        doctorId: auth.user.doctorId,
        offDayOfWeek: doctorScheduleForm.offDayOfWeek,
        startTime: doctorScheduleForm.startTime,
        endTime: doctorScheduleForm.endTime,
        slotDurationMin: doctorScheduleForm.slotDurationMin,
        maxPatients: doctorScheduleForm.maxPatients
      }
    })
    toast.success(
      'Jadwal & Hari Libur Disimpan',
      `${res.message} (Libur: ${formatDayAndDateId(doctorScheduleForm.offDate)})`
    )
    showDoctorScheduleForm.value = false
    await refreshSchedules()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Jadwal',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Periksa kembali input jam.'
    )
  } finally {
    savingSchedule.value = false
  }
}

const todayStr = new Date().toISOString().slice(0, 10)
const appointments = computed(() => apptData.value?.items || [])
const todayAppointments = computed(() =>
  appointments.value.filter(
    (a: { appointmentDate: string }) => String(a.appointmentDate).slice(0, 10) === todayStr
  )
)
const completedCount = computed(() =>
  appointments.value.filter((a: { status: string }) => a.status === 'COMPLETED').length
)
const upcomingAppointments = computed(() =>
  appointments.value.filter((a: { status: string }) =>
    ['CONFIRMED', 'CHECKED_IN', 'IN_TREATMENT'].includes(a.status)
  )
)

async function updateQueueStatus(queueId: string, status: string) {
  try {
    await $fetch(`/api/queues/${queueId}`, {
      method: 'PATCH',
      body: { status }
    })
    toast.success('Antrean Diperbarui', `Status antrean diubah menjadi ${status}.`)
    await Promise.all([refreshQueue(), refreshAppt()])
  } catch (err: unknown) {
    toast.error(
      'Gagal Memperbarui Antrean',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}
</script>

<template>
  <!-- 3. Dashboard Dokter (Rapi & Konsisten UI Figma 19) -->
  <div class="flex flex-col gap-[22px]">
    <!-- Hero Banner -->
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
      <div class="flex flex-col gap-1.5">
        <span class="self-start px-3.5 py-1 rounded-md bg-[#DFF1F2] border border-[#D8E6E8] text-[#137A7F] text-[11px] font-bold uppercase tracking-wider">
          Doctor Portal · Pemeriksaan, Diagnosis &amp; Treatment Record
        </span>
        <h1 class="font-heading font-bold text-[24px] sm:text-[26px] text-[#0B253A]">
          Selamat Bertugas, <span class="text-[#137A7F]">{{ auth.user?.fullName }}</span>
        </h1>
        <p class="text-[13px] text-[#475569] max-w-2xl">
          Kelola antrean pasien ruang periksa, catat hasil pemeriksaan SOAP, diagnosis ICD-10, tindakan medis, peta gigi Odontogram FDI, dan resep obat untuk diteruskan ke Admin.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 shrink-0">
        <NuxtLink
          to="/doctor/medical-records"
          class="inline-flex items-center gap-2 px-5 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold transition-colors"
        >
          <UIcon name="i-lucide-file-plus-2" class="w-4 h-4" />
          <span>Catat Treatment Record</span>
        </NuxtLink>
        <NuxtLink
          to="/doctor/odontogram"
          class="inline-flex items-center gap-2 px-5 py-2.5 min-h-11 rounded-md bg-white hover:bg-[#DFF1F2] text-[#137A7F] border border-[#D8E6E8] text-[13px] font-semibold transition-colors"
        >
          <UIcon name="i-lucide-heart-pulse" class="w-4 h-4" />
          <span>Peta Odontogram FDI</span>
        </NuxtLink>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <DashboardCard
        title="Appointment Hari Ini"
        :value="todayAppointments.length"
        :subtitle="formatDateId(new Date())"
        icon="i-lucide-calendar-check"
        tone="teal"
      />
      <DashboardCard
        title="Pasien Selesai Diperiksa"
        :value="completedCount"
        subtitle="Total treatment record selesai"
        icon="i-lucide-user-check"
        tone="emerald"
      />
      <DashboardCard
        title="Antrean Hari Ini"
        :value="(queueData?.items || []).length"
        subtitle="Pasien sudah check-in"
        icon="i-lucide-list-ordered"
        tone="teal"
      />
      <DashboardCard
        title="Appointment Aktif"
        :value="upcomingAppointments.length"
        subtitle="Menunggu tindakan medis"
        icon="i-lucide-clock"
        tone="amber"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <!-- Antrean Pasien Ruang Periksa -->
      <div class="lg:col-span-7 bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#D8E6E8]">
          <div>
            <span class="text-[11px] font-bold uppercase text-[#137A7F]">RUANG PERIKSA HARI INI</span>
            <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
              Antrean Pasien Dokter
            </h2>
          </div>
          <NuxtLink to="/doctor/appointments" class="text-[12px] font-semibold text-[#137A7F] hover:underline">
            Semua Appointment →
          </NuxtLink>
        </div>

        <div v-if="(queueData?.items || []).length" class="space-y-3">
          <div
            v-for="q in queueData?.items || []"
            :key="q.id"
            class="p-4 rounded-md bg-[#F4F9F9] border border-[#D8E6E8] flex flex-wrap items-center justify-between gap-4"
          >
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="size-12 rounded-md bg-[#137A7F] text-white font-heading font-bold text-sm flex items-center justify-center shrink-0">
                {{ q.queueNumber }}
              </div>
              <div class="min-w-0">
                <h3 class="font-semibold text-[14px] text-[#0B253A] truncate">
                  {{ q.patient?.fullName }}
                  <span class="text-xs text-[#475569] font-mono">({{ q.patient?.medicalRecordNo }})</span>
                </h3>
                <p class="text-[12px] text-[#475569] truncate">
                  {{ q.appointment?.service?.name }}
                  <span v-if="q.patient?.allergies" class="text-[#BE123C] font-semibold">
                    · Alergi: {{ q.patient.allergies }}
                  </span>
                </p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <CommonStatusBadge :status="q.status" kind="queue" />
              <button
                v-if="q.status === 'WAITING'"
                type="button"
                class="px-4 py-2 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold transition-colors"
                @click="updateQueueStatus(q.id, 'IN_PROGRESS')"
              >
                Mulai Periksa
              </button>
              <NuxtLink
                v-if="q.status === 'IN_PROGRESS' || q.status === 'CALLED'"
                :to="`/doctor/medical-records?appointmentId=${q.appointmentId}&patientId=${q.patientId}`"
                class="px-4 py-2 min-h-11 inline-flex items-center rounded-md bg-[#15803D] hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
              >
                Isi Treatment Record
              </NuxtLink>
            </div>
          </div>
        </div>
        <CommonEmptyState
          v-else
          title="Belum Ada Antrean Check-In Hari Ini"
          description="Pasien yang telah melakukan check-in di meja resepsionis akan muncul di daftar antrean ini."
        />
      </div>

      <!-- Jadwal Praktik & Hari Libur -->
      <div class="lg:col-span-5 bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between gap-2 pb-3 border-b border-[#D8E6E8]">
          <div>
            <span class="text-[11px] font-bold uppercase text-[#137A7F]">JADWAL MINGGUAN</span>
            <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
              Jadwal Praktik &amp; Hari Libur
            </h2>
          </div>
          <button
            type="button"
            class="px-3.5 py-2 min-h-11 rounded-md bg-[#EAF5F6] hover:bg-[#DFF1F2] text-[#137A7F] border border-[#D8E6E8] text-xs font-semibold transition-colors"
            @click="showDoctorScheduleForm = !showDoctorScheduleForm"
          >
            {{ showDoctorScheduleForm ? 'Tutup' : 'Atur Libur' }}
          </button>
        </div>

        <form
          v-if="showDoctorScheduleForm"
          class="p-4 rounded-md bg-[#EAF5F6] border border-[#D8E6E8] space-y-3 text-xs"
          @submit.prevent="saveMyWeeklySchedule"
        >
          <div>
            <label class="block font-semibold text-[#BE123C] mb-1">
              Pilih 1 Tanggal &amp; Hari Libur Saya
            </label>
            <input
              v-model="doctorScheduleForm.offDate"
              type="date"
              required
              class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] bg-white font-semibold text-[#0B253A]"
            >
            <span class="block text-[11px] font-bold text-[#BE123C] mt-1">
              Hari &amp; Tanggal Libur: {{ formatDayAndDateId(doctorScheduleForm.offDate) }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block font-semibold text-[#0B253A] mb-1">Jam Mulai Praktik</label>
              <input
                v-model="doctorScheduleForm.startTime"
                type="time"
                required
                class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] bg-white"
              >
            </div>
            <div>
              <label class="block font-semibold text-[#0B253A] mb-1">Jam Selesai Praktik</label>
              <input
                v-model="doctorScheduleForm.endTime"
                type="time"
                required
                class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] bg-white"
              >
            </div>
          </div>
          <button
            type="submit"
            :disabled="savingSchedule"
            class="w-full py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white font-semibold"
          >
            {{ savingSchedule ? 'Menyimpan...' : 'Simpan Jadwal & Hari Libur' }}
          </button>
        </form>

        <div class="space-y-2 text-xs">
          <div
            v-for="sch in (schedulesData?.items || []).slice(0, 7)"
            :key="sch.id"
            class="p-3 rounded-md border flex items-center justify-between gap-2"
            :class="sch.isActive ? 'bg-[#F4F9F9] border-[#D8E6E8]' : 'bg-[#FFF1F2] border-rose-200'"
          >
            <span class="font-semibold text-[#0B253A]">
              {{ formatScheduleDayAndDate(sch.dayOfWeek) }}
            </span>
            <span v-if="sch.isActive" class="text-[#137A7F] font-bold">
              {{ sch.startTime }} - {{ sch.endTime }} WIB
            </span>
            <span v-else class="px-2.5 py-0.5 rounded-md bg-white text-[#BE123C] border border-rose-200 font-bold">
              HARI LIBUR
            </span>
            <span class="text-[#475569]">Slot {{ sch.slotDurationMin }}m</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
