<script setup lang="ts">
import { formatDateId, getDayNameId } from '~/utils/format'
import {
  evaluateClinicDateStatus,
  normalizeClinicScheduleConfig,
  type ClinicScheduleConfig
} from '~/utils/clinicScheduleRules'

const props = defineProps<{
  doctors: Array<{ id: string; titlePrefix?: string | null; fullName: string; specialization?: string }>
  schedules: Array<{
    id: string
    doctorId: string
    dayOfWeek: number
    startTime: string
    endTime: string
    isActive: boolean
  }>
  appointments: Array<{
    id: string
    bookingCode: string
    doctorId: string
    appointmentDate: string
    startTime: string
    endTime: string
    status: string
    patient?: { fullName: string }
    doctor?: { titlePrefix?: string | null; fullName: string }
    service?: { name: string }
  }>
  config?: ClinicScheduleConfig | null
  holidays?: Record<string, string>
}>()

const viewMode = ref<'MONTH' | 'WEEK' | 'DAY'>('MONTH')
const selectedDoctorId = ref('')
const anchorDate = ref(new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10))

const effectiveConfig = computed(() => normalizeClinicScheduleConfig(props.config))
const effectiveHolidays = computed(() => props.holidays || {})

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

function shiftAnchor(step: number) {
  const d = new Date(`${anchorDate.value}T00:00:00Z`)
  if (viewMode.value === 'MONTH') {
    d.setUTCMonth(d.getUTCMonth() + step)
  } else if (viewMode.value === 'WEEK') {
    d.setUTCDate(d.getUTCDate() + step * 7)
  } else {
    d.setUTCDate(d.getUTCDate() + step)
  }
  anchorDate.value = d.toISOString().slice(0, 10)
}

function getDaySummary(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const dow = d.getUTCDay()
  const clinicStatus = evaluateClinicDateStatus(
    dateStr,
    effectiveConfig.value,
    effectiveHolidays.value,
    selectedDoctorId.value || undefined
  )

  const daySchedules = props.schedules.filter(
    (s) =>
      s.dayOfWeek === dow &&
      s.isActive &&
      (!selectedDoctorId.value || s.doctorId === selectedDoctorId.value)
  )

  const dayLeaves = effectiveConfig.value.doctorLeaveRequests.filter(
    (r) =>
      r.leaveDate === dateStr &&
      r.status !== 'REJECTED' &&
      (!selectedDoctorId.value || r.doctorId === selectedDoctorId.value)
  )

  const dayAppointments = props.appointments.filter(
    (a) =>
      String(a.appointmentDate).slice(0, 10) === dateStr &&
      a.status !== 'CANCELLED' &&
      (!selectedDoctorId.value || a.doctorId === selectedDoctorId.value)
  )

  return {
    dateStr,
    dayNumber: d.getUTCDate(),
    dayOfWeek: dow,
    dayName: getDayNameId(dow),
    clinicStatus,
    daySchedules,
    dayLeaves,
    dayAppointments
  }
}

const monthCells = computed(() => {
  const d = new Date(`${anchorDate.value}T00:00:00Z`)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  const firstDay = new Date(Date.UTC(year, month, 1))
  const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const offset = (firstDay.getUTCDay() + 6) % 7

  const cells: Array<ReturnType<typeof getDaySummary> | null> = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push(getDaySummary(dateStr))
  }
  return cells
})

const weekDays = computed(() => {
  const d = new Date(`${anchorDate.value}T00:00:00Z`)
  const mondayOffset = (d.getUTCDay() + 6) % 7
  const monday = new Date(d.getTime() - mondayOffset * 86400000)
  return Array.from({ length: 7 }, (_, i) => {
    const cur = new Date(monday.getTime() + i * 86400000)
    return getDaySummary(cur.toISOString().slice(0, 10))
  })
})

const selectedDayDetail = computed(() => getDaySummary(anchorDate.value))

const headerLabel = computed(() => {
  const d = new Date(`${anchorDate.value}T00:00:00Z`)
  if (viewMode.value === 'MONTH') {
    return `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  }
  if (viewMode.value === 'WEEK') {
    const first = weekDays.value[0]?.dateStr || anchorDate.value
    const last = weekDays.value[6]?.dateStr || anchorDate.value
    return `${formatDateId(first)} - ${formatDateId(last)}`
  }
  return `${getDayNameId(d.getUTCDay())}, ${formatDateId(anchorDate.value)}`
})
</script>

<template>
  <div class="bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-5">
    <!-- Header & Controls -->
    <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D8E6E8]">
      <div>
        <span class="text-[11px] font-bold uppercase text-[#137A7F]">KALENDER OPERASIONAL &amp; PRAKTIK DOKTER</span>
        <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
          Kalender Dokter (Jadwal, Libur Nasional, Cuti &amp; Appointment)
        </h2>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="selectedDoctorId"
          class="px-3.5 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white text-xs font-semibold text-[#0B253A]"
        >
          <option value="">Semua Dokter</option>
          <option v-for="doc in doctors" :key="doc.id" :value="doc.id">
            {{ doc.titlePrefix || 'drg.' }} {{ doc.fullName }}
          </option>
        </select>

        <div class="inline-flex rounded-md bg-[#F4F9F9] border border-[#D8E6E8] p-1">
          <button
            v-for="mode in [
              { id: 'MONTH', label: 'Bulanan' },
              { id: 'WEEK', label: 'Mingguan' },
              { id: 'DAY', label: 'Harian' }
            ] as const"
            :key="mode.id"
            type="button"
            class="px-3 py-1.5 min-h-11 rounded-md text-xs font-semibold transition-colors"
            :class="viewMode === mode.id ? 'bg-[#137A7F] text-white' : 'text-[#0B253A] hover:bg-[#EAF5F6]'"
            @click="viewMode = mode.id"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Navigasi Periode -->
    <div class="flex items-center justify-between gap-2">
      <button
        type="button"
        class="px-3.5 py-2 min-h-11 rounded-md border border-[#D8E6E8] hover:bg-[#EAF5F6] text-xs font-semibold text-[#0B253A]"
        @click="shiftAnchor(-1)"
      >
        &larr; Sebelumnya
      </button>
      <strong class="font-heading text-sm sm:text-base text-[#0B253A]">{{ headerLabel }}</strong>
      <button
        type="button"
        class="px-3.5 py-2 min-h-11 rounded-md border border-[#D8E6E8] hover:bg-[#EAF5F6] text-xs font-semibold text-[#0B253A]"
        @click="shiftAnchor(1)"
      >
        Berikutnya &rarr;
      </button>
    </div>

    <!-- VIEW: BULANAN -->
    <div v-if="viewMode === 'MONTH'" class="space-y-2 overflow-x-auto">
      <div class="grid grid-cols-7 gap-1.5 min-w-[680px] text-center text-[11px] font-bold uppercase text-[#137A7F]">
        <div v-for="h in ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']" :key="h">{{ h }}</div>
      </div>
      <div class="grid grid-cols-7 gap-1.5 min-w-[680px]">
        <template v-for="(cell, idx) in monthCells" :key="idx">
          <div v-if="!cell" class="h-24 rounded-md bg-[#F4F9F9]/50" />
          <button
            v-else
            type="button"
            class="h-24 p-2 rounded-md border text-left flex flex-col justify-between transition-all"
            :class="[
              anchorDate === cell.dateStr ? 'ring-2 ring-[#137A7F]' : '',
              cell.clinicStatus.status === 'HOLIDAY_NATIONAL' || cell.clinicStatus.status === 'HOLIDAY_SUNDAY' || cell.clinicStatus.status === 'SPECIAL_CLOSED'
                ? 'bg-[#FFF1F2] border-rose-200 text-[#BE123C]'
                : cell.clinicStatus.status === 'SPECIAL_PRACTICE'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-white border-[#D8E6E8] hover:border-[#137A7F]'
            ]"
            @click="anchorDate = cell.dateStr; viewMode = 'DAY'"
          >
            <div class="flex items-center justify-between w-full">
              <span class="text-xs font-bold">{{ cell.dayNumber }}</span>
              <span
                v-if="cell.dayAppointments.length"
                class="px-1.5 py-0.5 rounded bg-[#137A7F] text-white text-[10px] font-bold"
              >
                {{ cell.dayAppointments.length }} Appt
              </span>
            </div>
            <div class="space-y-0.5 w-full overflow-hidden">
              <span
                v-if="!cell.clinicStatus.isOpen || cell.clinicStatus.status === 'SPECIAL_PRACTICE'"
                class="block text-[10px] font-bold truncate"
              >
                {{ cell.clinicStatus.badge }}
              </span>
              <span v-else-if="cell.daySchedules.length" class="block text-[10px] text-[#137A7F] font-semibold truncate">
                {{ cell.daySchedules.length }} Sesi Praktik
              </span>
              <span v-if="cell.dayLeaves.length" class="block text-[10px] text-[#B45309] font-bold truncate">
                {{ cell.dayLeaves.length }} Cuti Dokter
              </span>
            </div>
          </button>
        </template>
      </div>
    </div>

    <!-- VIEW: MINGGUAN -->
    <div v-else-if="viewMode === 'WEEK'" class="grid grid-cols-1 md:grid-cols-7 gap-2.5">
      <div
        v-for="day in weekDays"
        :key="day.dateStr"
        class="p-3 rounded-md border space-y-2 text-xs"
        :class="
          !day.clinicStatus.isOpen
            ? 'bg-[#FFF1F2] border-rose-200'
            : day.clinicStatus.status === 'SPECIAL_PRACTICE'
              ? 'bg-emerald-50 border-emerald-300'
              : 'bg-[#F4F9F9] border-[#D8E6E8]'
        "
      >
        <div class="pb-1.5 border-b border-[#D8E6E8]">
          <strong class="block text-[#0B253A]">{{ day.dayName }}</strong>
          <span class="text-[11px] text-[#475569]">{{ formatDateId(day.dateStr) }}</span>
        </div>
        <span
          class="inline-block px-2 py-0.5 rounded text-[10px] font-bold"
          :class="!day.clinicStatus.isOpen ? 'bg-white text-[#BE123C]' : 'bg-[#DFF1F2] text-[#137A7F]'"
        >
          {{ day.clinicStatus.badge }}
        </span>
        <div v-if="day.daySchedules.length && day.clinicStatus.isOpen" class="space-y-1">
          <div v-for="s in day.daySchedules.slice(0, 3)" :key="s.id" class="p-1.5 rounded bg-white border border-[#D8E6E8] text-[10px]">
            {{ s.startTime }} - {{ s.endTime }}
          </div>
        </div>
        <div v-if="day.dayLeaves.length" class="space-y-1">
          <div v-for="lv in day.dayLeaves" :key="lv.id" class="p-1.5 rounded bg-amber-50 border border-amber-200 text-[10px] text-[#B45309] font-semibold">
            Cuti: {{ lv.doctorName }} ({{ lv.status }})
          </div>
        </div>
        <div class="text-[11px] font-bold text-[#137A7F]">
          {{ day.dayAppointments.length }} Appointment
        </div>
      </div>
    </div>

    <!-- VIEW: HARIAN -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
      <div class="p-4 rounded-md border border-[#D8E6E8] bg-[#EAF5F6] space-y-2">
        <strong class="text-[#137A7F] uppercase text-[11px] block">Status Tanggal</strong>
        <p class="font-heading font-bold text-base text-[#0B253A]">
          {{ selectedDayDetail.clinicStatus.badge }}
        </p>
        <p class="text-[#475569]">{{ selectedDayDetail.clinicStatus.reason }}</p>
        <div v-if="selectedDayDetail.dayLeaves.length" class="pt-2 border-t border-[#D8E6E8] space-y-1">
          <strong class="text-[#B45309] block">Dokter Sedang Libur / Cuti:</strong>
          <div v-for="lv in selectedDayDetail.dayLeaves" :key="lv.id" class="text-[#0B253A]">
            • {{ lv.doctorName }} ({{ lv.status }}) - {{ lv.reason }}
          </div>
        </div>
      </div>

      <div class="p-4 rounded-md border border-[#D8E6E8] bg-[#F4F9F9] space-y-2">
        <strong class="text-[#137A7F] uppercase text-[11px] block">Jadwal Praktik Aktif</strong>
        <div v-if="selectedDayDetail.daySchedules.length && selectedDayDetail.clinicStatus.isOpen" class="space-y-1.5">
          <div v-for="s in selectedDayDetail.daySchedules" :key="s.id" class="p-2 rounded bg-white border border-[#D8E6E8] font-semibold text-[#0B253A]">
            {{ s.startTime }} - {{ s.endTime }} WIB
          </div>
        </div>
        <p v-else class="text-[#475569]">Tidak ada sesi praktik aktif pada tanggal ini.</p>
      </div>

      <div class="p-4 rounded-md border border-[#D8E6E8] bg-white space-y-2">
        <strong class="text-[#137A7F] uppercase text-[11px] block">
          Appointment Terjadwal ({{ selectedDayDetail.dayAppointments.length }})
        </strong>
        <div v-if="selectedDayDetail.dayAppointments.length" class="space-y-1.5 max-h-56 overflow-y-auto">
          <div v-for="a in selectedDayDetail.dayAppointments" :key="a.id" class="p-2 rounded bg-[#F4F9F9] border border-[#D8E6E8]">
            <strong class="text-[#0B253A]">{{ a.startTime }} - {{ a.endTime }}</strong> · {{ a.patient?.fullName }}
            <span class="block text-[#475569]">{{ a.doctor?.titlePrefix }} {{ a.doctor?.fullName }} · {{ a.service?.name }}</span>
          </div>
        </div>
        <p v-else class="text-[#475569]">Belum ada appointment pada tanggal ini.</p>
      </div>
    </div>
  </div>
</template>
