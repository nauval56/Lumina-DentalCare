<script setup lang="ts">
import {
  getDayNameId,
  formatDateId,
  formatDayAndDateId,
  getDateStringForDayOfWeek,
  formatScheduleDayAndDate
} from '~/utils/format'

definePageMeta({ layout: 'portal' })

const [
  { data: schedulesData, refresh },
  { data: doctorsData },
  { data: clinicScheduleRes, refresh: refreshClinicSchedule },
  { data: leavesRes, refresh: refreshLeaves },
  { data: appointmentsRes }
] = await Promise.all([
  useFetch('/api/schedules'),
  useFetch('/api/doctors'),
  useFetch('/api/clinic-schedule'),
  useFetch('/api/doctor-leaves'),
  useFetch('/api/appointments')
])
const toast = useClinicToast()

const adminScheduleTab = ref<'CALENDAR' | 'LEAVES' | 'RULES'>('CALENDAR')
const followNationalHolidays = ref(true)
const defaultMonthlyQuota = ref(4)
const specialPracticeForm = reactive({
  date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  openTime: '09:00',
  closeTime: '17:00',
  reason: ''
})

watch(
  () => clinicScheduleRes.value?.config,
  (cfg) => {
    if (!cfg) return
    followNationalHolidays.value = cfg.followNationalHolidays !== false
    defaultMonthlyQuota.value = cfg.defaultMonthlyLeaveQuota ?? 4
  },
  { immediate: true }
)

async function savePolicySettings() {
  try {
    const current = clinicScheduleRes.value?.config
    await $fetch('/api/clinic-schedule', {
      method: 'POST',
      body: {
        slotIntervalMinutes: current?.slotIntervalMinutes || 30,
        followNationalHolidays: followNationalHolidays.value,
        defaultMonthlyLeaveQuota: Number(defaultMonthlyQuota.value),
        doctorLeaveQuotas: current?.doctorLeaveQuotas || {},
        weeklyHours: current?.weeklyHours,
        specialOverrides: current?.specialOverrides || {},
        specialPracticeDates: current?.specialPracticeDates || {}
      }
    })
    toast.success('Kebijakan Disimpan', 'Pengaturan libur nasional otomatis & kuota cuti dokter diperbarui.')
    await Promise.all([refreshClinicSchedule(), refreshLeaves()])
  } catch (err: unknown) {
    toast.error('Gagal Menyimpan', (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.')
  }
}

async function addSpecialPracticeDate() {
  if (!specialPracticeForm.date) return
  try {
    const current = clinicScheduleRes.value?.config
    const nextSpecial = { ...(current?.specialPracticeDates || {}) }
    nextSpecial[specialPracticeForm.date] = {
      date: specialPracticeForm.date,
      openTime: specialPracticeForm.openTime,
      closeTime: specialPracticeForm.closeTime,
      reason: specialPracticeForm.reason.trim() || 'Hari Praktik Khusus (Diaktifkan Admin)'
    }
    await $fetch('/api/clinic-schedule', {
      method: 'POST',
      body: {
        ...current,
        specialPracticeDates: nextSpecial
      }
    })
    toast.success('Hari Praktik Khusus Ditambahkan', `Tanggal ${specialPracticeForm.date} aktif untuk praktik.`)
    specialPracticeForm.reason = ''
    await refreshClinicSchedule()
  } catch (err: unknown) {
    toast.error('Gagal Menambah', (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.')
  }
}

async function removeSpecialPracticeDate(dateKey: string) {
  const current = clinicScheduleRes.value?.config
  const nextSpecial = { ...(current?.specialPracticeDates || {}) }
  delete nextSpecial[dateKey]
  await $fetch('/api/clinic-schedule', {
    method: 'POST',
    body: {
      ...current,
      specialPracticeDates: nextSpecial
    }
  })
  toast.info('Dihapus', 'Hari praktik khusus dihapus.')
  await refreshClinicSchedule()
}

async function updateDoctorCustomQuota(doctorId: string, quotaVal: number) {
  const current = clinicScheduleRes.value?.config
  const nextQuotas = { ...(current?.doctorLeaveQuotas || {}), [doctorId]: Math.max(0, Math.min(31, Number(quotaVal))) }
  await $fetch('/api/clinic-schedule', {
    method: 'POST',
    body: {
      ...current,
      doctorLeaveQuotas: nextQuotas
    }
  })
  toast.success('Kuota Diperbarui', 'Kuota libur bulanan dokter berhasil disesuaikan.')
  await Promise.all([refreshClinicSchedule(), refreshLeaves()])
}

async function reviewLeaveRequest(id: string, status: 'APPROVED' | 'REJECTED') {
  try {
    const res = await $fetch<{ message: string }>(`/api/doctor-leaves/${id}`, {
      method: 'PATCH',
      body: { status }
    })
    toast.success(status === 'APPROVED' ? 'Cuti Disetujui' : 'Cuti Ditolak', res.message)
    await Promise.all([refreshLeaves(), refreshClinicSchedule()])
  } catch (err: unknown) {
    toast.error('Gagal Memproses', (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Kuota cuti penuh.')
  }
}

const formMode = ref<'WEEKLY_OFF_DAY' | 'SINGLE_DAY'>('WEEKLY_OFF_DAY')

// Form 1A: Dokter Memilih 1 Hari & Tanggal Libur + Jam Mulai & Jam Selesai
const weeklyForm = reactive({
  doctorId: '',
  offDate: getDateStringForDayOfWeek(0), // Default Minggu minggu berjalan
  offDayOfWeek: 0,
  startTime: '09:00',
  endTime: '17:00',
  slotDurationMin: 30,
  maxPatients: 12
})

watch(
  () => weeklyForm.offDate,
  (val) => {
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const d = new Date(`${val}T00:00:00`)
      if (!Number.isNaN(d.getTime())) {
        weeklyForm.offDayOfWeek = d.getDay()
      }
    }
  }
)

// Form 1B: Edit / Tambah Per Hari & Tanggal Spesifik (Bisa Praktik Aktif atau Hari Libur)
const editingScheduleId = ref<string | null>(null)
const scheduleForm = reactive({
  doctorId: '',
  selectedDate: getDateStringForDayOfWeek(1),
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '17:00',
  slotDurationMin: 30,
  maxPatients: 12,
  isActive: true
})

watch(
  () => scheduleForm.selectedDate,
  (val) => {
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const d = new Date(`${val}T00:00:00`)
      if (!Number.isNaN(d.getTime())) {
        scheduleForm.dayOfWeek = d.getDay()
      }
    }
  }
)

// Form 2: Hari Libur Tanggal Tertentu (Dengan Pilih Dokter + Hari & Tanggal + Jam Mulai & Jam Selesai)
const editingHolidayId = ref<string | null>(null)
const holidayForm = reactive({
  isHoliday: true as const,
  doctorId: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '08:00',
  endTime: '17:00',
  name: '',
  description: ''
})

// Ringkasan Hari & Tanggal Libur Mingguan tiap Dokter
const doctorWeeklySummary = computed(() => {
  const docs = doctorsData.value?.items || []
  const allSchedules = schedulesData.value?.items || []
  return docs.map((doc: { id: string; titlePrefix?: string | null; fullName: string; specialization: string }) => {
    const docSch = allSchedules.filter((s: { doctorId: string }) => s.doctorId === doc.id)
    const offDays = docSch.filter((s: { isActive: boolean }) => !s.isActive)
    const activeDays = docSch.filter((s: { isActive: boolean }) => s.isActive)
    const sampleActive = activeDays[0]
    const offDayNum = offDays[0]?.dayOfWeek ?? 0
    return {
      doctor: doc,
      offDayDateLabel: offDays.length
        ? offDays.map((s: { dayOfWeek: number }) => formatScheduleDayAndDate(s.dayOfWeek)).join('; ')
        : formatScheduleDayAndDate(0),
      offDayNumber: offDayNum,
      startTime: sampleActive?.startTime || '09:00',
      endTime: sampleActive?.endTime || '17:00',
      activeCount: activeDays.length
    }
  })
})

function selectDoctorForWeeklyOffDay(summary: {
  doctor: { id: string }
  offDayNumber: number
  startTime: string
  endTime: string
}) {
  formMode.value = 'WEEKLY_OFF_DAY'
  weeklyForm.doctorId = summary.doctor.id
  weeklyForm.offDayOfWeek = summary.offDayNumber
  weeklyForm.offDate = getDateStringForDayOfWeek(summary.offDayNumber)
  weeklyForm.startTime = summary.startTime
  weeklyForm.endTime = summary.endTime
}

function loadScheduleToEdit(sch: Record<string, unknown>) {
  formMode.value = 'SINGLE_DAY'
  editingScheduleId.value = String(sch.id)
  scheduleForm.doctorId = String(sch.doctorId || '')
  const dayNum = Number(sch.dayOfWeek ?? 1)
  scheduleForm.dayOfWeek = dayNum
  scheduleForm.selectedDate = getDateStringForDayOfWeek(dayNum)
  scheduleForm.startTime = String(sch.startTime || '09:00')
  scheduleForm.endTime = String(sch.endTime || '17:00')
  scheduleForm.slotDurationMin = Number(sch.slotDurationMin || 30)
  scheduleForm.maxPatients = Number(sch.maxPatients || 12)
  scheduleForm.isActive = Boolean(sch.isActive)
}

function resetScheduleForm() {
  editingScheduleId.value = null
  scheduleForm.doctorId = ''
  scheduleForm.dayOfWeek = 1
  scheduleForm.selectedDate = getDateStringForDayOfWeek(1)
  scheduleForm.startTime = '09:00'
  scheduleForm.endTime = '17:00'
  scheduleForm.slotDurationMin = 30
  scheduleForm.maxPatients = 12
  scheduleForm.isActive = true
}

async function saveWeeklyWithOffDay() {
  try {
    const res = await $fetch<{ message: string }>('/api/schedules', {
      method: 'POST',
      body: {
        mode: 'WEEKLY_WITH_OFF_DAY',
        doctorId: weeklyForm.doctorId,
        offDayOfWeek: weeklyForm.offDayOfWeek,
        startTime: weeklyForm.startTime,
        endTime: weeklyForm.endTime,
        slotDurationMin: weeklyForm.slotDurationMin,
        maxPatients: weeklyForm.maxPatients
      }
    })
    toast.success(
      'Jadwal & Tanggal Libur Disimpan',
      `${res.message} (Libur: ${formatDayAndDateId(weeklyForm.offDate)})`
    )
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Periksa jam mulai dan selesai.'
    )
  }
}

async function saveSingleDaySchedule() {
  try {
    const res = await $fetch<{ message: string }>('/api/schedules', {
      method: 'POST',
      body: {
        id: editingScheduleId.value || undefined,
        doctorId: scheduleForm.doctorId,
        dayOfWeek: scheduleForm.dayOfWeek,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        slotDurationMin: scheduleForm.slotDurationMin,
        maxPatients: scheduleForm.maxPatients,
        isActive: scheduleForm.isActive
      }
    })
    toast.success(
      'Jadwal Diperbarui',
      `${res.message} (${formatDayAndDateId(scheduleForm.selectedDate)})`
    )
    resetScheduleForm()
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}

async function toggleDayHolidayStatus(sch: Record<string, unknown>) {
  try {
    await $fetch('/api/schedules', {
      method: 'POST',
      body: {
        id: String(sch.id),
        doctorId: String(sch.doctorId),
        dayOfWeek: Number(sch.dayOfWeek),
        startTime: String(sch.startTime),
        endTime: String(sch.endTime),
        slotDurationMin: Number(sch.slotDurationMin || 30),
        maxPatients: Number(sch.maxPatients || 12),
        isActive: !sch.isActive
      }
    })
    toast.info(
      !sch.isActive ? 'Diaktifkan Kembali' : 'Ditetapkan Sebagai Hari Libur',
      `Jadwal ${formatScheduleDayAndDate(Number(sch.dayOfWeek))} berhasil diperbarui.`
    )
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Mengubah Status Hari',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}

function loadHolidayToEdit(h: Record<string, unknown>) {
  editingHolidayId.value = String(h.id)
  holidayForm.date = h.date ? String(h.date).slice(0, 10) : new Date().toISOString().slice(0, 10)
  holidayForm.name = String(h.name || '')
  holidayForm.description = String(h.description || '')
}

function resetHolidayForm() {
  editingHolidayId.value = null
  holidayForm.doctorId = ''
  holidayForm.date = new Date().toISOString().slice(0, 10)
  holidayForm.startTime = '08:00'
  holidayForm.endTime = '17:00'
  holidayForm.name = ''
  holidayForm.description = ''
}

async function saveHoliday() {
  try {
    await $fetch('/api/schedules', {
      method: 'POST',
      body: {
        id: editingHolidayId.value || undefined,
        ...holidayForm
      }
    })
    toast.success(
      editingHolidayId.value ? 'Hari Libur Diperbarui' : 'Hari Libur Disimpan',
      `Jadwal libur ${formatDayAndDateId(holidayForm.date)} berhasil disimpan.`
    )
    resetHolidayForm()
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Hari Libur',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}

async function removeItem(id: string, type?: string) {
  if (import.meta.client && !window.confirm('Hapus data jadwal / hari libur ini?')) {
    return
  }
  await $fetch(`/api/schedules/${id}`, {
    method: 'DELETE',
    query: type ? { type } : undefined
  })
  toast.info('Dihapus', 'Data jadwal berhasil dihapus.')
  await refresh()
}
</script>

<template>
  <!-- Figma 31. Admin CRUD Jadwal & Hari Libur Dokter (/admin/schedules) -->
  <div class="flex flex-col gap-[22px]">
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold uppercase text-[#137A7F]">
          ADMIN · KALENDER DOKTER, KUOTA LIBUR &amp; JADWAL PRAKTIK FLEKSIBEL
        </span>
        <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
          Manajemen Jadwal Praktik, Tanggal &amp; Hari Libur Dokter
        </h1>
      </div>

      <div class="inline-flex flex-wrap rounded-md bg-white border border-[#D8E6E8] p-1 gap-1">
        <button
          type="button"
          class="px-3.5 py-2 min-h-11 rounded-md text-xs font-semibold transition-colors"
          :class="adminScheduleTab === 'CALENDAR' ? 'bg-[#137A7F] text-white' : 'text-[#0B253A] hover:bg-[#EAF5F6]'"
          @click="adminScheduleTab = 'CALENDAR'"
        >
          Kalender Dokter
        </button>
        <button
          type="button"
          class="px-3.5 py-2 min-h-11 rounded-md text-xs font-semibold transition-colors"
          :class="adminScheduleTab === 'LEAVES' ? 'bg-[#137A7F] text-white' : 'text-[#0B253A] hover:bg-[#EAF5F6]'"
          @click="adminScheduleTab = 'LEAVES'"
        >
          Kuota &amp; Pengajuan Libur ({{ (leavesRes?.requests || []).filter((r: any) => r.status === 'PENDING').length }})
        </button>
        <button
          type="button"
          class="px-3.5 py-2 min-h-11 rounded-md text-xs font-semibold transition-colors"
          :class="adminScheduleTab === 'RULES' ? 'bg-[#137A7F] text-white' : 'text-[#0B253A] hover:bg-[#EAF5F6]'"
          @click="adminScheduleTab = 'RULES'"
        >
          Libur Nasional &amp; Praktik Khusus
        </button>
      </div>
    </div>

    <!-- Kalender Dokter (Bulanan / Mingguan / Harian) -->
    <AdminAdminDoctorCalendar
      v-if="adminScheduleTab === 'CALENDAR'"
      :doctors="doctorsData?.items || []"
      :schedules="schedulesData?.items || []"
      :appointments="appointmentsRes?.items || []"
      :config="clinicScheduleRes?.config"
      :holidays="clinicScheduleRes?.holidays"
    />

    <!-- Manajemen Kuota & Persetujuan Pengajuan Libur Dokter -->
    <div v-else-if="adminScheduleTab === 'LEAVES'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-5 bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
        <div class="pb-3 border-b border-[#D8E6E8]">
          <span class="text-[11px] font-bold uppercase text-[#137A7F]">KUOTA BULANAN DOKTER</span>
          <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
            Atur Kuota Libur per Bulan ({{ leavesRes?.monthPrefix }})
          </h2>
        </div>

        <div class="p-3.5 rounded-md bg-[#F4F9F9] border border-[#D8E6E8] flex items-center justify-between gap-2 text-xs">
          <span class="font-semibold text-[#0B253A]">Kuota Default Semua Dokter:</span>
          <div class="flex items-center gap-2">
            <input
              v-model.number="defaultMonthlyQuota"
              type="number"
              min="0"
              max="31"
              class="w-20 px-2.5 py-1.5 min-h-11 rounded-md border border-[#D8E6E8] bg-white font-bold text-center"
            >
            <button
              type="button"
              class="px-3 py-2 min-h-11 rounded-md bg-[#137A7F] text-white font-semibold"
              @click="savePolicySettings"
            >
              Simpan
            </button>
          </div>
        </div>

        <div class="space-y-2.5">
          <div
            v-for="q in leavesRes?.quotaSummaries || []"
            :key="q.doctorId"
            class="p-3.5 rounded-md border border-[#D8E6E8] bg-white flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <div>
              <strong class="text-[#0B253A] block">{{ q.doctorName }}</strong>
              <span class="text-[#475569]">
                Terpakai: <strong class="text-[#BE123C]">{{ q.used }}</strong> · Sisa: <strong class="text-[#137A7F]">{{ q.remaining }}</strong> dari {{ q.quota }} hari/bln
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="px-2.5 py-1.5 min-h-11 rounded-md border border-[#D8E6E8] bg-[#F4F9F9] font-bold"
                @click="updateDoctorCustomQuota(q.doctorId, q.quota - 1)"
              >
                -1
              </button>
              <span class="px-2 font-bold text-[#0B253A]">{{ q.quota }}</span>
              <button
                type="button"
                class="px-2.5 py-1.5 min-h-11 rounded-md border border-[#D8E6E8] bg-[#F4F9F9] font-bold"
                @click="updateDoctorCustomQuota(q.doctorId, q.quota + 1)"
              >
                +1
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-7 bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
        <div class="pb-3 border-b border-[#D8E6E8]">
          <span class="text-[11px] font-bold uppercase text-[#137A7F]">PERSETUJUAN CUTI DOKTER</span>
          <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
            Daftar Pengajuan Hari Libur Dokter
          </h2>
        </div>

        <div v-if="(leavesRes?.requests || []).length" class="space-y-2.5">
          <div
            v-for="req in leavesRes?.requests || []"
            :key="req.id"
            class="p-4 rounded-md border border-[#D8E6E8] bg-[#F4F9F9] flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <strong class="text-sm text-[#0B253A]">{{ req.doctorName }}</strong>
                <span class="px-2.5 py-0.5 rounded-md bg-white border border-[#D8E6E8] font-bold text-[#137A7F]">
                  {{ formatDateId(req.leaveDate) }}
                </span>
                <span
                  class="px-2.5 py-0.5 rounded-md font-bold text-[10px]"
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
              <p class="text-[#475569] mt-1">{{ req.reason }}</p>
            </div>

            <div v-if="req.status === 'PENDING'" class="flex items-center gap-2">
              <button
                type="button"
                class="px-3.5 py-2 min-h-11 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                @click="reviewLeaveRequest(req.id, 'APPROVED')"
              >
                Setujui
              </button>
              <button
                type="button"
                class="px-3.5 py-2 min-h-11 rounded-md bg-rose-50 hover:bg-rose-100 text-[#BE123C] font-semibold"
                @click="reviewLeaveRequest(req.id, 'REJECTED')"
              >
                Tolak
              </button>
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-[#475569]">
          Belum ada pengajuan hari libur dari dokter.
        </p>
      </div>
    </div>

    <!-- Pengaturan Libur Nasional Otomatis & Hari Praktik Khusus -->
    <div v-else-if="adminScheduleTab === 'RULES'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
        <div class="pb-3 border-b border-[#D8E6E8]">
          <span class="text-[11px] font-bold uppercase text-[#137A7F]">KALENDER PEMERINTAH INDONESIA</span>
          <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
            Aturan Hari Libur Nasional Otomatis
          </h2>
        </div>

        <div class="p-4 rounded-md bg-[#EAF5F6] border border-[#D8E6E8] flex items-center justify-between gap-3 text-xs">
          <div>
            <strong class="text-sm text-[#0B253A] block">Ikuti Kalender Libur Nasional Otomatis</strong>
            <span class="text-[#475569]">
              Jika aktif, seluruh tanggal merah nasional otomatis menutup slot booking pasien.
            </span>
          </div>
          <button
            type="button"
            class="px-4 py-2 min-h-11 rounded-md text-xs font-bold shrink-0"
            :class="followNationalHolidays ? 'bg-[#137A7F] text-white' : 'bg-white border border-[#D8E6E8] text-[#0B253A]'"
            @click="followNationalHolidays = !followNationalHolidays; savePolicySettings()"
          >
            {{ followNationalHolidays ? 'Aktif (Otomatis)' : 'Nonaktif' }}
          </button>
        </div>
      </div>

      <div class="bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
        <div class="pb-3 border-b border-[#D8E6E8]">
          <span class="text-[11px] font-bold uppercase text-[#137A7F]">HARI PRAKTIK KHUSUS</span>
          <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
            Aktifkan Praktik pada Hari Libur Tertentu
          </h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <input
            v-model="specialPracticeForm.date"
            type="date"
            class="px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white"
          >
          <input
            v-model="specialPracticeForm.openTime"
            type="time"
            class="px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white"
          >
          <input
            v-model="specialPracticeForm.closeTime"
            type="time"
            class="px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white"
          >
        </div>
        <div class="flex gap-2 text-xs">
          <input
            v-model="specialPracticeForm.reason"
            type="text"
            placeholder="Keterangan (misal: Layanan Siaga Hari Libur)"
            class="flex-1 px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white"
          >
          <button
            type="button"
            class="px-4 py-2 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white font-semibold shrink-0"
            @click="addSpecialPracticeDate"
          >
            Aktifkan Tanggal
          </button>
        </div>

        <div class="space-y-2 text-xs">
          <div
            v-for="(sp, key) in clinicScheduleRes?.config?.specialPracticeDates || {}"
            :key="key"
            class="p-3 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2"
          >
            <div>
              <strong class="text-emerald-900">{{ formatDateId(sp.date) }} · {{ sp.openTime }} - {{ sp.closeTime }} WIB</strong>
              <span class="block text-emerald-700">{{ sp.reason }}</span>
            </div>
            <button
              type="button"
              class="px-3 py-1.5 rounded-md bg-white border border-emerald-200 text-[#BE123C] font-semibold"
              @click="removeSpecialPracticeDate(String(key))"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pengaturan Jadwal Praktik Fleksibel Dokter -->
    <div class="lumina-card p-6 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D8E6E8]">
          <h2 class="font-heading font-bold text-base text-[#0B253A]">
            Atur Jadwal Praktik & Pilihan 1 Tanggal / Hari Libur Dokter
          </h2>
          <div class="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              class="px-3 py-1.5 rounded-md transition-colors"
              :class="
                formMode === 'WEEKLY_OFF_DAY'
                  ? 'bg-white text-[#137A7F] shadow-2xs'
                  : 'text-slate-600'
              "
              @click="formMode = 'WEEKLY_OFF_DAY'"
            >
              Pilih 1 Tanggal & Hari Libur
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-md transition-colors"
              :class="
                formMode === 'SINGLE_DAY'
                  ? 'bg-white text-[#137A7F] shadow-2xs'
                  : 'text-slate-600'
              "
              @click="formMode = 'SINGLE_DAY'"
            >
              Atur / Edit Per Tanggal & Hari
            </button>
          </div>
        </div>

        <!-- Mode A: Dokter Memilih 1 Tanggal & Hari Libur + Jam Mulai & Jam Selesai -->
        <form v-if="formMode === 'WEEKLY_OFF_DAY'" class="space-y-4" @submit.prevent="saveWeeklyWithOffDay">
          <p class="text-xs text-[#475569]">
            Pilih dokter, pilih <strong>1 tanggal & hari libur</strong>, serta tentukan <strong>jam mulai</strong> dan <strong>jam selesai</strong> praktik.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Dokter *</label>
              <select
                v-model="weeklyForm.doctorId"
                required
                class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm bg-white"
              >
                <option value="">-- Pilih Dokter --</option>
                <option v-for="d in doctorsData?.items || []" :key="d.id" :value="d.id">
                  {{ d.titlePrefix }} {{ d.fullName }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-rose-700 mb-1">
                Pilih 1 Tanggal & Hari Libur Dokter *
              </label>
              <input
                v-model="weeklyForm.offDate"
                type="date"
                required
                class="w-full px-3.5 py-2 rounded-md border border-rose-200 bg-rose-50/40 text-sm font-semibold text-rose-900"
              >
              <span class="block text-[11px] font-bold text-rose-700 mt-1">
                Hari & Tanggal Terpilih: {{ formatDayAndDateId(weeklyForm.offDate) }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Jam Mulai *</label>
              <input
                v-model="weeklyForm.startTime"
                type="time"
                required
                class="w-full px-3 py-2 rounded-md border border-[#D8E6E8] text-sm"
              >
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Jam Selesai *</label>
              <input
                v-model="weeklyForm.endTime"
                type="time"
                required
                class="w-full px-3 py-2 rounded-md border border-[#D8E6E8] text-sm"
              >
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Durasi Slot (m)</label>
              <input
                v-model.number="weeklyForm.slotDurationMin"
                type="number"
                min="15"
                class="w-full px-3 py-2 rounded-md border border-[#D8E6E8] text-sm"
              >
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Kuota Pasien</label>
              <input
                v-model.number="weeklyForm.maxPatients"
                type="number"
                min="1"
                class="w-full px-3 py-2 rounded-md border border-[#D8E6E8] text-sm"
              >
            </div>
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              class="px-5 py-2.5 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
            >
              Terapkan Tanggal & Hari Libur + Jam Praktik
            </button>
          </div>
        </form>

        <!-- Mode B: Tambah / Edit Per Tanggal & Hari Spesifik -->
        <form v-else class="space-y-4" @submit.prevent="saveSingleDaySchedule">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Dokter *</label>
              <select
                v-model="scheduleForm.doctorId"
                required
                class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm bg-white"
              >
                <option value="">-- Pilih Dokter --</option>
                <option v-for="d in doctorsData?.items || []" :key="d.id" :value="d.id">
                  {{ d.titlePrefix }} {{ d.fullName }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Tanggal & Hari *</label>
              <input
                v-model="scheduleForm.selectedDate"
                type="date"
                required
                class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm bg-white"
              >
              <span class="block text-[11px] font-semibold text-[#137A7F] mt-1">
                {{ formatDayAndDateId(scheduleForm.selectedDate) }}
              </span>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Status Hari</label>
              <select
                v-model="scheduleForm.isActive"
                class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm bg-white"
              >
                <option :value="true">Hari Praktik Aktif</option>
                <option :value="false">Hari Libur Dokter (Libur)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Jam Mulai *</label>
              <input
                v-model="scheduleForm.startTime"
                type="time"
                required
                class="w-full px-3 py-2 rounded-md border border-[#D8E6E8] text-sm"
              >
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Jam Selesai *</label>
              <input
                v-model="scheduleForm.endTime"
                type="time"
                required
                class="w-full px-3 py-2 rounded-md border border-[#D8E6E8] text-sm"
              >
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Durasi Slot (m)</label>
              <input
                v-model.number="scheduleForm.slotDurationMin"
                type="number"
                min="15"
                class="w-full px-3 py-2 rounded-md border border-[#D8E6E8] text-sm"
              >
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Kuota Pasien</label>
              <input
                v-model.number="scheduleForm.maxPatients"
                type="number"
                min="1"
                class="w-full px-3 py-2 rounded-md border border-[#D8E6E8] text-sm"
              >
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <button
              v-if="editingScheduleId"
              type="button"
              class="px-4 py-2.5 rounded-md border border-[#D8E6E8] text-xs font-semibold"
              @click="resetScheduleForm"
            >
              Batal Edit
            </button>
            <button
              type="submit"
              class="px-5 py-2.5 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
            >
              {{ editingScheduleId ? 'Simpan Perubahan Hari & Tanggal' : 'Simpan Jadwal Tanggal & Hari Ini' }}
            </button>
          </div>
        </form>
      </div>

    <!-- Tabel Jadwal Praktik, Tanggal & Hari Libur Dokter -->
    <div class="lumina-card overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase bg-[#EAF5F6]/60">
            <th class="py-3.5 px-4">Dokter</th>
            <th class="py-3.5 px-4">Hari & Tanggal</th>
            <th class="py-3.5 px-4">Status Hari</th>
            <th class="py-3.5 px-4">Jam Mulai - Jam Selesai</th>
            <th class="py-3.5 px-4">Durasi Slot & Kuota</th>
            <th class="py-3.5 px-4 text-right">Aksi (CRUD)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#D8E6E8]/60">
          <tr v-for="sch in schedulesData?.items || []" :key="sch.id">
            <td class="py-3 px-4 font-semibold text-[#0B253A]">
              {{ sch.doctor?.titlePrefix }} {{ sch.doctor?.fullName }}
            </td>
            <td class="py-3 px-4">
              <div class="font-semibold text-[#137A7F]">
                {{ formatScheduleDayAndDate(sch.dayOfWeek) }}
              </div>
              <div class="text-[11px] text-slate-400">
                Setiap Hari {{ getDayNameId(sch.dayOfWeek) }}
              </div>
            </td>
            <td class="py-3 px-4">
              <span
                class="inline-flex items-center whitespace-nowrap px-3 py-1 rounded-md text-xs font-bold"
                :class="
                  sch.isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                "
              >
                {{ sch.isActive ? 'Praktik Aktif' : 'Hari Libur Dokter' }}
              </span>
            </td>
            <td class="py-3 px-4 text-xs font-semibold">
              <span v-if="sch.isActive" class="text-[#0B253A]">
                {{ sch.startTime }} - {{ sch.endTime }} WIB
              </span>
              <span v-else class="text-rose-600">
                Libur ({{ sch.startTime }} - {{ sch.endTime }})
              </span>
            </td>
            <td class="py-3 px-4 text-xs text-slate-600">
              {{ sch.slotDurationMin }} Menit · Maks {{ sch.maxPatients }} Pasien
            </td>
            <td class="py-3 px-4 text-right">
              <div class="inline-flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  class="px-2.5 py-1.5 rounded-lg border border-[#D8E6E8] text-xs font-semibold text-slate-700 hover:bg-[#F4F9F9]"
                  @click="loadScheduleToEdit(sch)"
                >
                  Edit Tanggal & Jam
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1.5 rounded-lg border text-xs font-semibold"
                  :class="
                    sch.isActive
                      ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  "
                  @click="toggleDayHolidayStatus(sch)"
                >
                  {{ sch.isActive ? 'Jadikan Hari Libur' : 'Aktifkan Praktik' }}
                </button>
                <button
                  type="button"
                  class="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                  @click="removeItem(sch.id)"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
