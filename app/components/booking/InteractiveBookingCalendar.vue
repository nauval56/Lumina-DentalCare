<script setup lang="ts">
import {
  evaluateClinicDateStatus,
  normalizeClinicScheduleConfig,
  type ClinicScheduleConfig,
  type EvaluatedClinicDate
} from '~/utils/clinicScheduleRules'

const props = defineProps<{
  modelValue: string
  config?: ClinicScheduleConfig | null
  holidays?: Record<string, string>
  minDate?: string
  patientAppointments?: Array<{ appointmentDate: string; status: string; startTime?: string }>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'dateEvaluated', value: EvaluatedClinicDate): void
}>()

const effectiveConfig = computed(() => normalizeClinicScheduleConfig(props.config))
const effectiveHolidays = computed(() => props.holidays || {})

function getTodayWibStr() {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

const todayStr = computed(() => props.minDate || getTodayWibStr())

const initialDate = props.modelValue && /^\d{4}-\d{2}-\d{2}$/.test(props.modelValue)
  ? new Date(`${props.modelValue}T00:00:00Z`)
  : new Date(`${todayStr.value}T00:00:00Z`)

const viewYear = ref(initialDate.getUTCFullYear())
const viewMonth = ref(initialDate.getUTCMonth()) // 0-11
const hoveredDateInfo = ref<EvaluatedClinicDate | null>(null)

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]
const dayHeaders = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
}

interface CalendarCell {
  dateStr: string | null
  dayNumber: number | null
  isPast: boolean
  evaluated: EvaluatedClinicDate | null
}

const calendarCells = computed<CalendarCell[]>(() => {
  const firstDay = new Date(Date.UTC(viewYear.value, viewMonth.value, 1))
  const totalDays = new Date(Date.UTC(viewYear.value, viewMonth.value + 1, 0)).getUTCDate()
  // Konversi getUTCDay() (0=Min..6=Sab) ke Senin=0..Minggu=6
  const startOffset = (firstDay.getUTCDay() + 6) % 7

  const cells: CalendarCell[] = []
  for (let i = 0; i < startOffset; i++) {
    cells.push({ dateStr: null, dayNumber: null, isPast: false, evaluated: null })
  }

  for (let day = 1; day <= totalDays; day++) {
    const mm = String(viewMonth.value + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    const dateStr = `${viewYear.value}-${mm}-${dd}`
    const isPast = dateStr < todayStr.value
    const evaluated = evaluateClinicDateStatus(dateStr, effectiveConfig.value, effectiveHolidays.value)
    cells.push({ dateStr, dayNumber: day, isPast, evaluated })
  }
  return cells
})

const patientDateStatusMap = computed(() => {
  const map: Record<string, { status: 'COMPLETED' | 'BOOKED'; label: string; reason: string }> = {}
  for (const appt of props.patientAppointments || []) {
    if (!appt.appointmentDate || appt.status === 'CANCELLED') continue
    const dateKey = String(appt.appointmentDate).slice(0, 10)
    if (appt.status === 'COMPLETED') {
      if (!map[dateKey]) {
        map[dateKey] = {
          status: 'COMPLETED',
          label: 'Selesai',
          reason: `Kunjungan Anda pada tanggal ini sudah selesai (${appt.startTime || '-'} WIB).`
        }
      }
    } else if (['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_TREATMENT'].includes(appt.status)) {
      map[dateKey] = {
        status: 'BOOKED',
        label: 'Terjadwal',
        reason: `Anda memiliki jadwal kunjungan aktif pada tanggal ini (${appt.startTime || '-'} WIB).`
      }
    }
  }
  return map
})

const selectedEvaluated = computed(() => {
  if (!props.modelValue) return null
  return evaluateClinicDateStatus(props.modelValue, effectiveConfig.value, effectiveHolidays.value)
})

watch(
  selectedEvaluated,
  (val) => {
    if (val) emit('dateEvaluated', val)
  },
  { immediate: true }
)

const activeInfo = computed(() => {
  if (hoveredDateInfo.value) return hoveredDateInfo.value
  if (!selectedEvaluated.value) return null
  const dateStr = selectedEvaluated.value.date
  const isPast = dateStr < todayStr.value
  const pStatus = patientDateStatusMap.value[dateStr]
  if (isPast) {
    return {
      ...selectedEvaluated.value,
      isOpen: false,
      badge: pStatus ? `Sudah Terlewat · ${pStatus.label}` : 'Sudah Terlewat',
      reason: pStatus
        ? `Tanggal sudah terlewat. ${pStatus.reason}`
        : 'Tanggal ini sudah terlewat dan tidak dapat dipilih.'
    }
  }
  if (pStatus) {
    return {
      ...selectedEvaluated.value,
      badge: `${selectedEvaluated.value.badge} · ${pStatus.label}`,
      reason: `${pStatus.reason} ${selectedEvaluated.value.reason}`
    }
  }
  return selectedEvaluated.value
})

function handleHoverCell(cell: CalendarCell) {
  if (!cell.dateStr || !cell.evaluated) return
  const pStatus = patientDateStatusMap.value[cell.dateStr]
  if (cell.isPast) {
    hoveredDateInfo.value = {
      ...cell.evaluated,
      isOpen: false,
      badge: pStatus ? `Sudah Terlewat · ${pStatus.label}` : 'Sudah Terlewat',
      reason: pStatus
        ? `Tanggal sudah terlewat. ${pStatus.reason}`
        : 'Tanggal ini sudah terlewat dan tidak dapat dipilih.'
    }
    return
  }
  if (pStatus) {
    hoveredDateInfo.value = {
      ...cell.evaluated,
      badge: `${cell.evaluated.badge} · ${pStatus.label}`,
      reason: `${pStatus.reason} ${cell.evaluated.reason}`
    }
    return
  }
  hoveredDateInfo.value = cell.evaluated
}

function selectCell(cell: CalendarCell) {
  if (!cell.dateStr || !cell.evaluated) return
  handleHoverCell(cell)
  if (cell.isPast || !cell.evaluated.isOpen) return
  emit('update:modelValue', cell.dateStr)
}
</script>

<template>
  <div class="bg-white border border-[#D8E6E8] rounded-lg p-4 sm:p-5 space-y-4">
    <!-- Header Bulan & Navigasi -->
    <div class="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label="Bulan sebelumnya"
        class="min-h-11 px-3 rounded-md border border-[#D8E6E8] hover:bg-[#EAF5F6] text-xs font-semibold text-[#0B253A]"
        @click="prevMonth"
      >
        &larr; Prev
      </button>
      <div class="text-center">
        <h3 class="font-heading font-bold text-[15px] text-[#0B253A]">
          {{ monthNames[viewMonth] }} {{ viewYear }}
        </h3>
        <p class="text-[11px] text-[#475569]">
          Arahkan kursor atau klik tanggal aktif untuk melihat jadwal
        </p>
      </div>
      <button
        type="button"
        aria-label="Bulan berikutnya"
        class="min-h-11 px-3 rounded-md border border-[#D8E6E8] hover:bg-[#EAF5F6] text-xs font-semibold text-[#0B253A]"
        @click="nextMonth"
      >
        Next &rarr;
      </button>
    </div>

    <!-- Header Hari -->
    <div class="grid grid-cols-7 gap-1.5 text-center">
      <div
        v-for="(h, idx) in dayHeaders"
        :key="h"
        class="text-[11px] font-bold uppercase py-1"
        :class="idx === 6 ? 'text-[#BE123C]' : 'text-[#137A7F]'"
      >
        {{ h }}
      </div>
    </div>

    <!-- Grid Tanggal -->
    <div class="grid grid-cols-7 gap-1.5">
      <template v-for="(cell, idx) in calendarCells" :key="idx">
        <div v-if="!cell.dateStr" class="h-14 sm:h-16" />
        <button
          v-else
          type="button"
          :aria-disabled="cell.isPast || !cell.evaluated?.isOpen"
          :title="cell.isPast ? 'Tanggal sudah terlewat' : patientDateStatusMap[cell.dateStr]?.reason || cell.evaluated?.reason"
          class="h-14 sm:h-16 p-1.5 rounded-md border flex flex-col items-center justify-between transition-all text-center relative"
          :class="[
            modelValue === cell.dateStr && cell.evaluated?.isOpen && !cell.isPast
              ? 'bg-[#137A7F] border-[#137A7F] text-white ring-2 ring-[#137A7F]/30'
              : cell.isPast
                ? 'bg-[#F4F9F9] border-[#E2ECEE] text-slate-400 cursor-not-allowed'
                : cell.evaluated?.status === 'HOLIDAY_NATIONAL'
                  ? 'bg-[#FFF1F2] border-rose-300 text-[#BE123C] cursor-not-allowed'
                  : cell.evaluated?.status === 'HOLIDAY_SUNDAY' || cell.evaluated?.status === 'SPECIAL_CLOSED' || cell.evaluated?.status === 'WEEKLY_CLOSED'
                    ? 'bg-slate-100 border-[#D8E6E8] text-slate-500 cursor-not-allowed'
                    : patientDateStatusMap[cell.dateStr]?.status === 'COMPLETED'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:border-[#137A7F] cursor-pointer'
                      : cell.evaluated?.isReducedHours
                        ? 'bg-[#FFFBEB] border-amber-300 text-[#0B253A] hover:border-[#137A7F] cursor-pointer'
                        : 'bg-white border-[#D8E6E8] text-[#0B253A] hover:border-[#137A7F] hover:bg-[#EAF5F6]/50 cursor-pointer'
          ]"
          @mouseenter="handleHoverCell(cell)"
          @mouseleave="hoveredDateInfo = null"
          @focus="handleHoverCell(cell)"
          @blur="hoveredDateInfo = null"
          @click="selectCell(cell)"
        >
          <span class="text-xs font-bold leading-none">{{ cell.dayNumber }}</span>
          <span
            v-if="cell.isPast"
            class="text-[9px] font-semibold leading-tight truncate max-w-full"
          >{{ patientDateStatusMap[cell.dateStr] ? patientDateStatusMap[cell.dateStr]?.label : 'Terlewat' }}</span>
          <span
            v-else-if="cell.evaluated?.status === 'HOLIDAY_NATIONAL' || cell.evaluated?.status === 'HOLIDAY_SUNDAY'"
            class="text-[9px] font-bold leading-tight truncate max-w-full"
          >Libur</span>
          <span
            v-else-if="cell.evaluated?.status === 'SPECIAL_CLOSED' || cell.evaluated?.status === 'WEEKLY_CLOSED'"
            class="text-[9px] font-bold leading-tight truncate max-w-full text-[#BE123C]"
          >Tutup</span>
          <span
            v-else-if="patientDateStatusMap[cell.dateStr]"
            class="text-[9px] font-bold leading-tight truncate max-w-full"
            :class="modelValue === cell.dateStr ? 'text-white' : 'text-emerald-700'"
          >{{ patientDateStatusMap[cell.dateStr]?.label }}</span>
          <span
            v-else-if="cell.evaluated?.isReducedHours"
            class="text-[9px] font-bold leading-tight truncate max-w-full"
            :class="modelValue === cell.dateStr ? 'text-white' : 'text-[#B45309]'"
          >Terbatas</span>
          <span
            v-else
            class="text-[9px] font-semibold leading-tight"
            :class="modelValue === cell.dateStr ? 'text-white/90' : 'text-[#137A7F]'"
          >Buka</span>
        </button>
      </template>
    </div>

    <!-- Legenda Kalender -->
    <div class="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E2ECEE] text-[11px] font-semibold text-[#475569]">
      <span class="inline-flex items-center gap-1.5">
        <span class="size-3 rounded-sm bg-white border border-[#D8E6E8]" /> Buka Normal
      </span>
      <span class="inline-flex items-center gap-1.5 text-[#B45309]">
        <span class="size-3 rounded-sm bg-[#FFFBEB] border border-amber-300" /> Jam Praktek Terbatas
      </span>
      <span class="inline-flex items-center gap-1.5 text-[#BE123C]">
        <span class="size-3 rounded-sm bg-[#FFF1F2] border border-rose-300" /> Tanggal Merah / Libur Nasional
      </span>
      <span class="inline-flex items-center gap-1.5 text-emerald-700">
        <span class="size-3 rounded-sm bg-emerald-50 border border-emerald-300" /> Kunjungan Selesai
      </span>
      <span class="inline-flex items-center gap-1.5 text-slate-400">
        <span class="size-3 rounded-sm bg-[#F4F9F9] border border-[#E2ECEE]" /> Sudah Terlewat
      </span>
      <span class="inline-flex items-center gap-1.5 text-slate-500">
        <span class="size-3 rounded-sm bg-slate-100 border border-[#D8E6E8]" /> Minggu (Libur) / Klinik Tutup
      </span>
    </div>

    <!-- Keterangan Tanggal Disorot / Dipilih -->
    <div
      v-if="activeInfo"
      class="p-3 rounded-md border text-xs flex flex-wrap items-center justify-between gap-2"
      :class="
        activeInfo.status === 'HOLIDAY_NATIONAL' || activeInfo.status === 'HOLIDAY_SUNDAY' || !activeInfo.isOpen
          ? 'bg-[#FFF1F2] border-rose-200 text-[#BE123C]'
          : activeInfo.isReducedHours
            ? 'bg-[#FFFBEB] border-amber-200 text-[#B45309]'
            : 'bg-[#EAF5F6] border-[#D8E6E8] text-[#0B253A]'
      "
    >
      <div>
        <strong class="font-bold">{{ activeInfo.date }} · {{ activeInfo.badge }}:</strong>
        <span class="ml-1">{{ activeInfo.reason }}</span>
      </div>
      <span v-if="activeInfo.isOpen && activeInfo.openTime && activeInfo.closeTime" class="font-bold text-[#137A7F]">
        {{ activeInfo.openTime }} - {{ activeInfo.closeTime }} WIB
      </span>
    </div>
  </div>
</template>
