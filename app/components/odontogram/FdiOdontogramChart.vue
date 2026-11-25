<script setup lang="ts">
import { TOOTH_CONDITION_META } from '~/utils/format'
import {
  calculatePatientAgeYears,
  getAgeStatusPresets,
  getOdontogramModeByAge,
  getOdontogramModeMeta,
  isDeciduousToothFdi,
  isWisdomToothFdi,
  type OdontogramQuickOption
} from '~/utils/odontogramAgeRules'

export interface FdiToothItem {
  fdiNumber: string
  quadrant: number
  position: number
  toothType: 'PERMANENT' | 'DECIDUOUS'
  nameId: string
  arch: 'ATAS' | 'BAWAH'
  side: 'KANAN' | 'KIRI'
}

export interface OdontogramEntryItem {
  id?: string
  condition: string
  surfaces?: string | null
  diagnosis?: string | null
  treatment?: string | null
  notes?: string | null
  recordedAt?: string
  doctor?: { titlePrefix?: string | null; fullName: string }
}

const props = defineProps<{
  teethCatalog: FdiToothItem[]
  latestByFdi: Record<string, OdontogramEntryItem>
  history?: Array<OdontogramEntryItem & { tooth?: { fdiNumber: string; nameId: string } }>
  patientDateOfBirth?: string | Date | null
  patientName?: string
  readonly?: boolean
}>()

const emit = defineEmits<{
  (
    e: 'saveTooth',
    payload: {
      fdiNumber: string
      condition: string
      surfaces: string
      diagnosis: string
      treatment: string
      notes: string
    }
  ): void
}>()

const selectedFdi = ref<string>('16')

const patientAgeYears = computed(() => calculatePatientAgeYears(props.patientDateOfBirth))
const autoMode = computed(() => getOdontogramModeByAge(patientAgeYears.value))
const modeMeta = computed(() => getOdontogramModeMeta(autoMode.value))
const showPermanent = computed(() => autoMode.value === 'PERMANENT' || autoMode.value === 'MIXED')
const showDeciduous = computed(() => autoMode.value === 'PRIMARY' || autoMode.value === 'MIXED')
const agePresets = computed(() =>
  getAgeStatusPresets(autoMode.value, selectedFdi.value, patientAgeYears.value)
)

watch(
  autoMode,
  (mode) => {
    if (mode === 'PRIMARY' && !isDeciduousToothFdi(selectedFdi.value)) {
      selectTooth('55')
    } else if (mode === 'PERMANENT' && isDeciduousToothFdi(selectedFdi.value)) {
      selectTooth('16')
    }
  },
  { immediate: true }
)

function getToothBadgeText(fdi: string): string {
  const existing = props.latestByFdi[fdi]
  if (existing?.condition) return existing.condition
  if (isWisdomToothFdi(fdi) && patientAgeYears.value !== null && patientAgeYears.value < 17) {
    return 'Belum Erupsi'
  }
  return 'SEHAT'
}

function applyPreset(preset: OdontogramQuickOption) {
  if (props.readonly) return
  form.condition = preset.condition
  form.treatment = preset.treatment
  if (preset.diagnosis && !form.diagnosis) {
    form.diagnosis = preset.diagnosis
  }
}

const selectedSurfaces = ref<string[]>(['O'])
const form = reactive({
  condition: 'SEHAT',
  diagnosis: '',
  treatment: '',
  notes: ''
})

const surfaceOptions = [
  { code: 'M', label: 'Mesial (M)' },
  { code: 'O', label: 'Oklusal/Insisal (O)' },
  { code: 'D', label: 'Distal (D)' },
  { code: 'B', label: 'Bukal/Labial (B)' },
  { code: 'L', label: 'Lingual/Palatal (L)' }
]

const upperRightPerm = ['18', '17', '16', '15', '14', '13', '12', '11']
const upperLeftPerm = ['21', '22', '23', '24', '25', '26', '27', '28']
const lowerRightPerm = ['48', '47', '46', '45', '44', '43', '42', '41']
const lowerLeftPerm = ['31', '32', '33', '34', '35', '36', '37', '38']

const upperRightDec = ['55', '54', '53', '52', '51']
const upperLeftDec = ['61', '62', '63', '64', '65']
const lowerRightDec = ['85', '84', '83', '82', '81']
const lowerLeftDec = ['71', '72', '73', '74', '75']

const selectedToothMeta = computed(() =>
  props.teethCatalog.find((t) => t.fdiNumber === selectedFdi.value)
)

function selectTooth(fdi: string) {
  selectedFdi.value = fdi
  const existing = props.latestByFdi[fdi]
  form.condition = existing?.condition || 'SEHAT'
  selectedSurfaces.value = existing?.surfaces
    ? existing.surfaces.split(',').map((s) => s.trim()).filter(Boolean)
    : ['O']
  form.diagnosis = existing?.diagnosis || ''
  form.treatment = existing?.treatment || ''
  form.notes = existing?.notes || ''
}

watch(
  () => props.latestByFdi,
  () => {
    selectTooth(selectedFdi.value)
  },
  { immediate: true }
)

function toggleSurface(code: string) {
  if (props.readonly) return
  if (selectedSurfaces.value.includes(code)) {
    selectedSurfaces.value = selectedSurfaces.value.filter((c) => c !== code)
  } else {
    selectedSurfaces.value.push(code)
  }
}

function getConditionMeta(fdi: string) {
  const cond = props.latestByFdi[fdi]?.condition || 'SEHAT'
  return TOOTH_CONDITION_META[cond] ?? TOOTH_CONDITION_META.SEHAT!
}

function submitEntry() {
  emit('saveTooth', {
    fdiNumber: selectedFdi.value,
    condition: form.condition,
    surfaces: selectedSurfaces.value.join(','),
    diagnosis: form.diagnosis,
    treatment: form.treatment,
    notes: form.notes
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header & Mode Toggle selaras dengan Landing Page (Soft Ice Mint & Deep Petrol Teal) -->
    <div class="p-5 sm:p-6 rounded-lg bg-[#EAF5F6] border border-[#D8E6E8] flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-start gap-3.5">
        <div class="w-12 h-12 rounded-full bg-[#DFF1F2] text-[#137A7F] flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-grid" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-[#137A7F]">
            Standar World Dental Federation (FDI) · 52 Nomor Gigi
          </span>
          <h3 class="font-heading font-bold text-lg sm:text-xl text-[#0B253A]">
            Peta Odontogram Klinis <span class="text-[#137A7F]">Interaktif</span>
          </h3>
          <p class="text-xs text-slate-600 mt-0.5">
            Klik nomor gigi untuk melihat atau mencatat kondisi permukaan gigi (M/O/D/B/L), diagnosis ICD-10, dan rencana perawatan.
          </p>
        </div>
      </div>

      <div class="flex flex-col items-start lg:items-end gap-1.5">
        <div class="inline-flex flex-wrap items-center gap-2">
          <span class="px-3.5 py-1.5 rounded-md bg-white border border-[#D8E6E8] text-xs font-bold text-[#0B253A]">
            {{ patientAgeYears !== null ? `Usia Pasien: ${patientAgeYears} Tahun` : 'Usia Belum Terisi' }}
          </span>
          <span class="px-3.5 py-1.5 rounded-md bg-[#137A7F] text-white text-xs font-bold">
            {{ modeMeta.shortLabel }}
          </span>
        </div>
        <p class="text-[11px] text-[#475569] lg:text-right max-w-md">
          {{ modeMeta.description }}
        </p>
      </div>
    </div>

    <!-- Legend Kondisi Gigi -->
    <div class="flex flex-wrap gap-2">
      <span
        v-for="(meta, code) in TOOTH_CONDITION_META"
        :key="code"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border"
        :class="meta.colorClass"
      >
        <span class="w-2 h-2 rounded-full bg-current" />
        {{ meta.label }}
      </span>
    </div>

    <!-- Interactive FDI Dental Chart -->
    <div class="lumina-card p-6 border-[#D8E6E8] overflow-x-auto space-y-8">
      <div v-if="showPermanent" class="min-w-[680px] space-y-6">
        <!-- Rahang Atas Permanen -->
        <div>
          <p class="text-xs font-bold text-[#137A7F] uppercase tracking-wider text-center mb-3">
            Rahang Atas (Maksila) · Kanan (Kuadran 1: 18-11) | Kiri (Kuadran 2: 21-28)
          </p>
          <div class="grid grid-cols-2 gap-4">
            <div class="grid grid-cols-8 gap-1.5 pr-2 border-r border-dashed border-[#D8E6E8]">
              <button
                v-for="fdi in upperRightPerm"
                :key="fdi"
                type="button"
                class="flex flex-col items-center p-2 rounded-md border transition-all"
                :class="
                  selectedFdi === fdi
                    ? 'ring-2 ring-[#137A7F] border-[#137A7F] bg-[#EAF5F6]'
                    : 'border-[#D8E6E8] hover:border-[#137A7F] bg-white'
                "
                @click="selectTooth(fdi)"
              >
                <span class="text-xs font-bold text-[#0B253A]">{{ fdi }}</span>
                <svg viewBox="0 0 36 36" class="w-8 h-8 my-1">
                  <rect
                    x="4"
                    y="4"
                    width="28"
                    height="28"
                    rx="7"
                    :fill="getConditionMeta(fdi).fillHex"
                    :stroke="getConditionMeta(fdi).strokeHex"
                    stroke-width="2.5"
                  />
                  <rect
                    x="12"
                    y="12"
                    width="12"
                    height="12"
                    rx="3"
                    fill="#ffffff"
                    :stroke="getConditionMeta(fdi).strokeHex"
                    stroke-width="1.5"
                  />
                </svg>
                <span class="text-[10px] font-medium text-[#475569] truncate max-w-full">
                  {{ getToothBadgeText(fdi) }}
                </span>
              </button>
            </div>
            <div class="grid grid-cols-8 gap-1.5 pl-2">
              <button
                v-for="fdi in upperLeftPerm"
                :key="fdi"
                type="button"
                class="flex flex-col items-center p-2 rounded-md border transition-all"
                :class="
                  selectedFdi === fdi
                    ? 'ring-2 ring-[#137A7F] border-[#137A7F] bg-[#EAF5F6]'
                    : 'border-[#D8E6E8] hover:border-[#137A7F] bg-white'
                "
                @click="selectTooth(fdi)"
              >
                <span class="text-xs font-bold text-[#0B253A]">{{ fdi }}</span>
                <svg viewBox="0 0 36 36" class="w-8 h-8 my-1">
                  <rect
                    x="4"
                    y="4"
                    width="28"
                    height="28"
                    rx="7"
                    :fill="getConditionMeta(fdi).fillHex"
                    :stroke="getConditionMeta(fdi).strokeHex"
                    stroke-width="2.5"
                  />
                  <rect
                    x="12"
                    y="12"
                    width="12"
                    height="12"
                    rx="3"
                    fill="#ffffff"
                    :stroke="getConditionMeta(fdi).strokeHex"
                    stroke-width="1.5"
                  />
                </svg>
                <span class="text-[10px] font-medium text-[#475569] truncate max-w-full">
                  {{ getToothBadgeText(fdi) }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Rahang Bawah Permanen -->
        <div class="pt-4 border-t border-dashed border-[#D8E6E8]">
          <div class="grid grid-cols-2 gap-4">
            <div class="grid grid-cols-8 gap-1.5 pr-2 border-r border-dashed border-[#D8E6E8]">
              <button
                v-for="fdi in lowerRightPerm"
                :key="fdi"
                type="button"
                class="flex flex-col items-center p-2 rounded-md border transition-all"
                :class="
                  selectedFdi === fdi
                    ? 'ring-2 ring-[#137A7F] border-[#137A7F] bg-[#EAF5F6]'
                    : 'border-[#D8E6E8] hover:border-[#137A7F] bg-white'
                "
                @click="selectTooth(fdi)"
              >
                <span class="text-xs font-bold text-[#0B253A]">{{ fdi }}</span>
                <svg viewBox="0 0 36 36" class="w-8 h-8 my-1">
                  <rect
                    x="4"
                    y="4"
                    width="28"
                    height="28"
                    rx="7"
                    :fill="getConditionMeta(fdi).fillHex"
                    :stroke="getConditionMeta(fdi).strokeHex"
                    stroke-width="2.5"
                  />
                  <rect
                    x="12"
                    y="12"
                    width="12"
                    height="12"
                    rx="3"
                    fill="#ffffff"
                    :stroke="getConditionMeta(fdi).strokeHex"
                    stroke-width="1.5"
                  />
                </svg>
                <span class="text-[10px] font-medium text-[#475569] truncate max-w-full">
                  {{ getToothBadgeText(fdi) }}
                </span>
              </button>
            </div>
            <div class="grid grid-cols-8 gap-1.5 pl-2">
              <button
                v-for="fdi in lowerLeftPerm"
                :key="fdi"
                type="button"
                class="flex flex-col items-center p-2 rounded-md border transition-all"
                :class="
                  selectedFdi === fdi
                    ? 'ring-2 ring-[#137A7F] border-[#137A7F] bg-[#EAF5F6]'
                    : 'border-[#D8E6E8] hover:border-[#137A7F] bg-white'
                "
                @click="selectTooth(fdi)"
              >
                <span class="text-xs font-bold text-[#0B253A]">{{ fdi }}</span>
                <svg viewBox="0 0 36 36" class="w-8 h-8 my-1">
                  <rect
                    x="4"
                    y="4"
                    width="28"
                    height="28"
                    rx="7"
                    :fill="getConditionMeta(fdi).fillHex"
                    :stroke="getConditionMeta(fdi).strokeHex"
                    stroke-width="2.5"
                  />
                  <rect
                    x="12"
                    y="12"
                    width="12"
                    height="12"
                    rx="3"
                    fill="#ffffff"
                    :stroke="getConditionMeta(fdi).strokeHex"
                    stroke-width="1.5"
                  />
                </svg>
                <span class="text-[10px] font-medium text-[#475569] truncate max-w-full">
                  {{ getToothBadgeText(fdi) }}
                </span>
              </button>
            </div>
          </div>
          <p class="text-xs font-bold text-[#137A7F] uppercase tracking-wider text-center mt-3">
            Rahang Bawah (Mandibula) · Kanan (Kuadran 4: 48-41) | Kiri (Kuadran 3: 31-38)
          </p>
        </div>
      </div>

      <!-- Gigi Susu (Deciduous) -->
      <div
        v-if="showDeciduous"
        class="min-w-[540px] space-y-6"
        :class="showPermanent ? 'pt-6 border-t border-[#D8E6E8]' : ''"
      >
        <div>
          <p class="text-xs font-bold text-[#137A7F] uppercase tracking-wider text-center mb-3">
            Gigi Susu Rahang Atas · Kanan (Kuadran 5) | Kiri (Kuadran 6)
          </p>
          <div class="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div class="grid grid-cols-5 gap-2 pr-3 border-r border-dashed border-[#D8E6E8]">
              <button
                v-for="fdi in upperRightDec"
                :key="fdi"
                type="button"
                class="flex flex-col items-center p-2 rounded-md border transition-all"
                :class="
                  selectedFdi === fdi
                    ? 'ring-2 ring-[#137A7F] border-[#137A7F] bg-[#EAF5F6]'
                    : 'border-[#D8E6E8] hover:border-[#137A7F] bg-white'
                "
                @click="selectTooth(fdi)"
              >
                <span class="text-xs font-bold text-[#0B253A]">{{ fdi }}</span>
                <svg viewBox="0 0 36 36" class="w-8 h-8 my-1">
                  <circle
                    cx="18"
                    cy="18"
                    r="13"
                    :fill="getConditionMeta(fdi).fillHex"
                    :stroke="getConditionMeta(fdi).strokeHex"
                    stroke-width="2.5"
                  />
                </svg>
                <span class="text-[10px] text-[#475569]">{{ latestByFdi[fdi]?.condition || 'SEHAT' }}</span>
              </button>
            </div>
            <div class="grid grid-cols-5 gap-2 pl-3">
              <button
                v-for="fdi in upperLeftDec"
                :key="fdi"
                type="button"
                class="flex flex-col items-center p-2 rounded-md border transition-all"
                :class="
                  selectedFdi === fdi
                    ? 'ring-2 ring-[#137A7F] border-[#137A7F] bg-[#EAF5F6]'
                    : 'border-[#D8E6E8] hover:border-[#137A7F] bg-white'
                "
                @click="selectTooth(fdi)"
              >
                <span class="text-xs font-bold text-[#0B253A]">{{ fdi }}</span>
                <svg viewBox="0 0 36 36" class="w-8 h-8 my-1">
                  <circle
                    cx="18"
                    cy="18"
                    r="13"
                    :fill="getConditionMeta(fdi).fillHex"
                    :stroke="getConditionMeta(fdi).strokeHex"
                    stroke-width="2.5"
                  />
                </svg>
                <span class="text-[10px] text-[#475569]">{{ latestByFdi[fdi]?.condition || 'SEHAT' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-dashed border-[#D8E6E8]">
          <div class="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div class="grid grid-cols-5 gap-2 pr-3 border-r border-dashed border-[#D8E6E8]">
              <button
                v-for="fdi in lowerRightDec"
                :key="fdi"
                type="button"
                class="flex flex-col items-center p-2 rounded-md border transition-all"
                :class="
                  selectedFdi === fdi
                    ? 'ring-2 ring-[#137A7F] border-[#137A7F] bg-[#EAF5F6]'
                    : 'border-[#D8E6E8] hover:border-[#137A7F] bg-white'
                "
                @click="selectTooth(fdi)"
              >
                <span class="text-xs font-bold text-[#0B253A]">{{ fdi }}</span>
                <svg viewBox="0 0 36 36" class="w-8 h-8 my-1">
                  <circle
                    cx="18"
                    cy="18"
                    r="13"
                    :fill="getConditionMeta(fdi).fillHex"
                    :stroke="getConditionMeta(fdi).strokeHex"
                    stroke-width="2.5"
                  />
                </svg>
                <span class="text-[10px] text-[#475569]">{{ latestByFdi[fdi]?.condition || 'SEHAT' }}</span>
              </button>
            </div>
            <div class="grid grid-cols-5 gap-2 pl-3">
              <button
                v-for="fdi in lowerLeftDec"
                :key="fdi"
                type="button"
                class="flex flex-col items-center p-2 rounded-md border transition-all"
                :class="
                  selectedFdi === fdi
                    ? 'ring-2 ring-[#137A7F] border-[#137A7F] bg-[#EAF5F6]'
                    : 'border-[#D8E6E8] hover:border-[#137A7F] bg-white'
                "
                @click="selectTooth(fdi)"
              >
                <span class="text-xs font-bold text-[#0B253A]">{{ fdi }}</span>
                <svg viewBox="0 0 36 36" class="w-8 h-8 my-1">
                  <circle
                    cx="18"
                    cy="18"
                    r="13"
                    :fill="getConditionMeta(fdi).fillHex"
                    :stroke="getConditionMeta(fdi).strokeHex"
                    stroke-width="2.5"
                  />
                </svg>
                <span class="text-[10px] text-[#475569]">{{ latestByFdi[fdi]?.condition || 'SEHAT' }}</span>
              </button>
            </div>
          </div>
          <p class="text-xs font-semibold text-slate-600 uppercase tracking-wider text-center mt-2">
            Gigi Susu Rahang Bawah · Kanan (Kuadran 8) | Kiri (Kuadran 7)
          </p>
        </div>
      </div>
    </div>

    <!-- Detail & Form Gigi Terpilih -->
    <div class="lumina-card p-6 border-[#D8E6E8]">
      <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#D8E6E8]">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-[#137A7F]">
            Gigi Terpilih: FDI #{{ selectedFdi }}
          </span>
          <h4 class="font-heading font-bold text-base text-[#0B253A]">
            {{ selectedToothMeta?.nameId || `Gigi Nomor FDI ${selectedFdi}` }}
          </h4>
        </div>
        <CommonStatusBadge
          :status="latestByFdi[selectedFdi]?.condition || 'SEHAT'"
          kind="tooth"
        />
      </div>

      <form v-if="!readonly" class="mt-4 space-y-4" @submit.prevent="submitEntry">
        <div class="p-3.5 rounded-md bg-[#F4F9F9] border border-[#D8E6E8] space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-[#137A7F]">
              {{ agePresets.title }}
            </span>
            <span v-if="isWisdomToothFdi(selectedFdi)" class="text-[11px] font-semibold text-[#0B253A]">
              Aturan Khusus Gigi Bungsu (#{{ selectedFdi }})
            </span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="preset in agePresets.options"
              :key="preset.label"
              type="button"
              class="px-3 py-2 min-h-11 rounded-md text-xs font-semibold border transition-colors"
              :class="
                form.treatment === preset.treatment && form.condition === preset.condition
                  ? 'bg-[#137A7F] text-white border-[#137A7F]'
                  : 'bg-white text-[#0B253A] border-[#D8E6E8] hover:bg-[#EAF5F6]'
              "
              @click="applyPreset(preset)"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">
              Kondisi Klinis Gigi
            </label>
            <select
              v-model="form.condition"
              class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#137A7F]"
            >
              <option
                v-for="(meta, code) in TOOTH_CONDITION_META"
                :key="code"
                :value="code"
              >
                {{ meta.label }} ({{ code }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">
              Permukaan Gigi (Surfaces)
            </label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="s in surfaceOptions"
                :key="s.code"
                type="button"
                class="px-3.5 py-2 min-h-11 rounded-md text-xs font-semibold border transition-colors"
                :class="
                  selectedSurfaces.includes(s.code)
                    ? 'bg-[#137A7F] text-white border-[#137A7F]'
                    : 'bg-[#EAF5F6] text-[#0B253A] border-[#D8E6E8] hover:bg-[#DFF1F2]'
                "
                @click="toggleSurface(s.code)"
              >
                {{ s.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Diagnosis Spesifik Gigi #{{ selectedFdi }}
            </label>
            <input
              v-model="form.diagnosis"
              type="text"
              placeholder="Contoh: Karies Dentin Superfisial (K02.1)"
              class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Tindakan / Rencana Perawatan
            </label>
            <input
              v-model="form.treatment"
              type="text"
              placeholder="Contoh: Restorasi Komposit Kelas I"
              class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Dokter Gigi
          </label>
          <textarea
            v-model="form.notes"
            rows="2"
            placeholder="Catatan hasil perkusi, palpasi, vitalitas pulpa..."
            class="w-full px-3.5 py-2.5 rounded-md border border-[#D8E6E8] text-sm"
          />
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            class="inline-flex items-center gap-2 px-6 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-sm font-semibold shadow-xs transition-colors"
          >
            <UIcon name="i-lucide-save" class="w-4 h-4" />
            <span>Simpan Kondisi Gigi #{{ selectedFdi }}</span>
          </button>
        </div>
      </form>

      <div v-else class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div class="p-4 rounded-md bg-[#EAF5F6]/70 border border-[#D8E6E8]">
          <span class="text-xs font-semibold text-[#137A7F] block">Permukaan Gigi</span>
          <strong class="text-[#0B253A]">{{ latestByFdi[selectedFdi]?.surfaces || '-' }}</strong>
        </div>
        <div class="p-4 rounded-md bg-[#EAF5F6]/70 border border-[#D8E6E8]">
          <span class="text-xs font-semibold text-[#137A7F] block">Diagnosis</span>
          <strong class="text-[#0B253A]">{{ latestByFdi[selectedFdi]?.diagnosis || 'Tidak ada kelainan' }}</strong>
        </div>
        <div class="p-4 rounded-md bg-[#EAF5F6]/70 border border-[#D8E6E8]">
          <span class="text-xs font-semibold text-[#137A7F] block">Tindakan / Catatan</span>
          <strong class="text-[#0B253A]">{{ latestByFdi[selectedFdi]?.treatment || '-' }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>
