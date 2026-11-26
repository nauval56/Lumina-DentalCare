<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import {
  formatDateId,
  formatDayAndDateId,
  getDateStringForDayOfWeek,
  getDayNameId
} from '~/utils/format'
import {
  evaluateClinicDateStatus,
  normalizeClinicScheduleConfig
} from '~/utils/clinicScheduleRules'

definePageMeta({ layout: 'portal' })

const auth = useAuthStore()
const toast = useClinicToast()

const [
  { data: apptData, refresh: refreshAppt },
  { data: queueData, refresh: refreshQueue },
  { data: schedulesData, refresh: refreshSchedules },
  { data: clinicScheduleRes, refresh: refreshClinicSchedule },
  { data: leavesData, refresh: refreshLeaves }
] = await Promise.all([
  useFetch('/api/appointments'),
  useFetch('/api/queues'),
  useFetch('/api/schedules', {
    query: computed(() => (auth.user?.doctorId ? { doctorId: auth.user.doctorId } : {}))
  }),
  useFetch('/api/clinic-schedule'),
  useFetch('/api/doctor-leaves')
])

const showLeaveRequestForm = ref(false)
const submittingLeave = ref(false)
const leaveForm = reactive({
  leaveDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  reason: ''
})

const myQuota = computed(() => {
  const first = leavesData.value?.quotaSummaries?.[0]
  return (
    first || {
      quota: clinicScheduleRes.value?.config?.defaultMonthlyLeaveQuota ?? 4,
      used: 0,
      pending: 0,
      remaining: clinicScheduleRes.value?.config?.defaultMonthlyLeaveQuota ?? 4,
      canRequest: true
    }
  )
})

const todayStatus = computed(() => {
  const cfg = normalizeClinicScheduleConfig(clinicScheduleRes.value?.config)
  const holidays = (clinicScheduleRes.value?.holidays || {}) as Record<string, string>
  return evaluateClinicDateStatus(todayStr, cfg, holidays, auth.user?.doctorId || undefined)
})

const weeklyDayRows = computed(() => {
  const list = (schedulesData.value?.items || []) as Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    isActive: boolean
  }>
  return [1, 2, 3, 4, 5, 6, 0].map((dow) => {
    const dayShifts = list.filter((s) => s.dayOfWeek === dow && s.isActive)
    return {
      dayOfWeek: dow,
      label: getDayNameId(dow),
      shifts: dayShifts,
      isOpen: dayShifts.length > 0
    }
  })
})

const todayShifts = computed(() => {
  const dow = new Date(`${todayStr}T00:00:00Z`).getUTCDay()
  return weeklyDayRows.value.find((d) => d.dayOfWeek === dow)?.shifts || []
})

async function submitLeaveRequest() {
  if (!leaveForm.leaveDate || leaveForm.reason.trim().length < 3) {
    toast.error('Data Belum Lengkap', 'Isi tanggal libur dan alasan minimal 3 karakter.')
    return
  }
  submittingLeave.value = true
  try {
    const res = await $fetch<{ message: string }>('/api/doctor-leaves', {
      method: 'POST',
      body: {
        leaveDate: leaveForm.leaveDate,
        reason: leaveForm.reason.trim()
      }
    })
    toast.success('Pengajuan Terkirim', res.message)
    leaveForm.reason = ''
    showLeaveRequestForm.value = false
    await Promise.all([refreshLeaves(), refreshClinicSchedule()])
  } catch (err: unknown) {
    toast.error(
      'Pengajuan Ditolak',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Gagal mengajukan libur.'
    )
  } finally {
    submittingLeave.value = false
  }
}

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

      <!-- Widget Jadwal Saya & Kuota Libur Bulanan (Section 7) -->
      <div class="lg:col-span-5 bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between gap-2 pb-3 border-b border-[#D8E6E8]">
          <div>
            <span class="text-[11px] font-bold uppercase text-[#137A7F]">WIDGET JADWAL DOKTER</span>
            <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
              Jadwal Saya
            </h2>
          </div>
          <button
            type="button"
            class="px-3.5 py-2 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold transition-colors"
            @click="showLeaveRequestForm = !showLeaveRequestForm"
          >
            {{ showLeaveRequestForm ? 'Tutup Form' : '+ Ajukan Hari Libur' }}
          </button>
        </div>

        <!-- Jadwal Hari Ini -->
        <div class="p-3.5 rounded-md bg-[#EAF5F6] border border-[#D8E6E8] space-y-1.5 text-xs">
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold text-[#137A7F] uppercase text-[11px]">Jadwal Hari Ini</span>
            <span
              class="px-2.5 py-0.5 rounded-md font-bold text-[11px]"
              :class="todayStatus.isOpen && todayShifts.length ? 'bg-emerald-100 text-emerald-800' : 'bg-[#FFF1F2] text-[#BE123C]'"
            >
              {{ !todayStatus.isOpen ? todayStatus.badge : todayShifts.length ? 'Hari Kerja' : 'Libur' }}
            </span>
          </div>
          <p v-if="todayStatus.isOpen && todayShifts.length" class="font-semibold text-[#0B253A]">
            {{ todayShifts.map((s) => `${s.startTime} - ${s.endTime} WIB`).join(' · ') }}
          </p>
          <p v-else class="text-[#BE123C] font-medium">
            {{ !todayStatus.isOpen ? todayStatus.reason : 'Tidak ada jadwal praktik aktif hari ini.' }}
          </p>
        </div>

        <!-- Kuota Libur Bulan Ini -->
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="p-3 rounded-md bg-[#F4F9F9] border border-[#D8E6E8]">
            <span class="text-[10px] font-bold uppercase text-[#475569] block">Kuota Libur</span>
            <strong class="font-heading text-sm text-[#0B253A]">{{ myQuota.quota }} Hari / Bln</strong>
          </div>
          <div class="p-3 rounded-md bg-[#F4F9F9] border border-[#D8E6E8]">
            <span class="text-[10px] font-bold uppercase text-[#475569] block">Terpakai</span>
            <strong class="font-heading text-sm text-[#BE123C]">{{ myQuota.used }} Hari</strong>
          </div>
          <div class="p-3 rounded-md bg-[#EAF5F6] border border-[#D8E6E8]">
            <span class="text-[10px] font-bold uppercase text-[#137A7F] block">Sisa Kuota</span>
            <strong class="font-heading text-sm text-[#137A7F]">{{ myQuota.remaining }} Hari</strong>
          </div>
        </div>

        <!-- Form Pengajuan Hari Libur Dokter -->
        <form
          v-if="showLeaveRequestForm"
          class="p-4 rounded-md bg-[#F4F9F9] border border-[#D8E6E8] space-y-3 text-xs"
          @submit.prevent="submitLeaveRequest"
        >
          <p class="font-bold text-[#0B253A]">
            Pengajuan Hari Libur Dokter (Maks. {{ myQuota.quota }} Hari / Bulan)
          </p>
          <div>
            <label class="block font-semibold text-[#0B253A] mb-1">Tanggal Libur</label>
            <input
              v-model="leaveForm.leaveDate"
              type="date"
              required
              class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] bg-white font-semibold text-[#0B253A]"
            >
          </div>
          <div>
            <label class="block font-semibold text-[#0B253A] mb-1">Alasan Pengajuan</label>
            <input
              v-model="leaveForm.reason"
              type="text"
              required
              placeholder="Contoh: Keperluan keluarga / seminar kedokteran gigi"
              class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] bg-white"
            >
          </div>
          <button
            type="submit"
            :disabled="submittingLeave || !myQuota.canRequest"
            class="w-full py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] disabled:opacity-50 text-white font-semibold"
          >
            {{
              !myQuota.canRequest
                ? 'Kuota Libur Bulan Ini Habis'
                : submittingLeave
                  ? 'Mengirim...'
                  : 'Kirim Pengajuan Libur'
            }}
          </button>
        </form>

        <!-- Jadwal Minggu Ini -->
        <div class="space-y-1.5 text-xs">
          <p class="font-bold uppercase text-[11px] text-[#137A7F]">Jadwal Minggu Ini</p>
          <div
            v-for="row in weeklyDayRows"
            :key="row.dayOfWeek"
            class="p-2.5 rounded-md border flex items-center justify-between gap-2"
            :class="row.isOpen ? 'bg-[#F4F9F9] border-[#D8E6E8]' : 'bg-[#FFF1F2]/60 border-rose-200'"
          >
            <span class="font-semibold text-[#0B253A]">{{ row.label }}</span>
            <span v-if="row.isOpen" class="text-[#137A7F] font-bold text-right">
              {{ row.shifts.map((s) => `${s.startTime} - ${s.endTime}`).join(' & ') }} WIB
            </span>
            <span v-else class="px-2 py-0.5 rounded-md bg-white text-[#BE123C] border border-rose-200 font-bold text-[11px]">
              Libur
            </span>
          </div>
        </div>

        <!-- Daftar Status Pengajuan Cuti -->
        <div v-if="(leavesData?.requests || []).length" class="space-y-1.5 text-xs pt-2 border-t border-[#D8E6E8]">
          <p class="font-bold uppercase text-[11px] text-[#137A7F]">Riwayat Pengajuan Libur Saya</p>
          <div
            v-for="req in (leavesData?.requests || []).slice(0, 4)"
            :key="req.id"
            class="p-2.5 rounded-md border border-[#D8E6E8] bg-white flex items-center justify-between gap-2"
          >
            <div>
              <strong class="text-[#0B253A]">{{ formatDateId(req.leaveDate) }}</strong>
              <span class="text-[#475569] block">{{ req.reason }}</span>
            </div>
            <span
              class="px-2.5 py-1 rounded-md text-[10px] font-bold shrink-0"
              :class="
                req.status === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : req.status === 'REJECTED'
                    ? 'bg-rose-100 text-[#BE123C]'
                    : 'bg-amber-100 text-[#B45309]'
              "
            >
              {{ req.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
