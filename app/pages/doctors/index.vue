<script setup lang="ts">
import { formatRupiah, getDayNameId, formatDateId } from '~/utils/format'

const { data, pending } = await useFetch('/api/doctors')
const search = ref('')
const selectedSpec = ref('SEMUA')

const specializations = computed(() => {
  const specs = (data.value?.items || []).map((d: { specialization: string }) => d.specialization)
  return ['SEMUA', ...Array.from(new Set(specs))]
})

const filteredDoctors = computed(() => {
  return (data.value?.items || []).filter(
    (d: { fullName: string; specialization: string }) => {
      const matchSpec = selectedSpec.value === 'SEMUA' || d.specialization === selectedSpec.value
      const q = search.value.toLowerCase()
      return (
        matchSpec &&
        (!q ||
          d.fullName.toLowerCase().includes(q) ||
          d.specialization.toLowerCase().includes(q))
      )
    }
  )
})

// Integrasi Cek Slot Real-Time per Dokter
const selectedDoctorForSchedule = ref<Record<string, any> | null>(null)
const checkDate = ref(new Date().toISOString().slice(0, 10))
const slotsLoading = ref(false)
const slotResult = ref<{
  available: boolean
  reason?: string
  slots: Array<{
    startTime: string
    endTime: string
    isAvailable: boolean
    isPast?: boolean
    isBooked?: boolean
    reason?: string
  }>
} | null>(null)

async function loadDoctorSlots() {
  if (!selectedDoctorForSchedule.value) return
  slotsLoading.value = true
  try {
    slotResult.value = await $fetch('/api/schedules/availability', {
      query: {
        doctorId: selectedDoctorForSchedule.value.id,
        date: checkDate.value
      }
    })
  } catch {
    slotResult.value = { available: false, reason: 'Gagal memuat slot jadwal.', slots: [] }
  } finally {
    slotsLoading.value = false
  }
}

function openScheduleModal(doc: Record<string, any>) {
  selectedDoctorForSchedule.value = doc
  loadDoctorSlots()
}

watch(checkDate, () => {
  if (selectedDoctorForSchedule.value) {
    loadDoctorSlots()
  }
})
</script>

<template>
  <!-- 05. Direktori Dokter Gigi & Jadwal (/doctors) Terintegrasi Jadwal Praktik & Ketersediaan Slot -->
  <div class="bg-[#F4F9F9] min-h-full">
    <div class="max-w-[1440px] mx-auto px-5 lg:px-20 pt-9 pb-14 flex flex-col gap-7">
      <!-- TopBar -->
      <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <p class="text-[12px] font-bold text-[#137A7F]">
            TIM DOKTER GIGI SPESIALIS &amp; JADWAL PRAKTIK REAL-TIME
          </p>
          <h1 class="font-heading font-bold text-[24px] sm:text-[28px] text-[#0B253A]">
            Dokter Gigi Berpengalaman &amp; Jadwal Praktik
          </h1>
          <p class="text-[13px] text-[#475569]">
            Lihat jadwal praktik mingguan, hari libur dokter, serta cek slot waktu yang masih tersedia sebelum melakukan booking appointment.
          </p>
        </div>

        <div class="flex flex-col gap-[6px] w-full md:w-[340px] shrink-0">
          <label for="doc-search" class="text-[12px] font-semibold text-[#0B253A]">
            Cari Nama Dokter / Spesialisasi
          </label>
          <input
            id="doc-search"
            v-model="search"
            type="text"
            placeholder="Contoh: drg. Amanda / Konservasi Gigi"
            class="bg-white border border-[#D8E6E8] rounded-md px-4 py-2.5 min-h-11 text-[13px] text-[#0B253A] placeholder:text-[#475569]/70"
          >
        </div>
      </div>

      <!-- Filter Spesialisasi -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="sp in specializations"
          :key="sp"
          type="button"
          class="px-4 py-2 min-h-11 rounded-md text-xs font-semibold transition-colors"
          :class="
            selectedSpec === sp
              ? 'bg-[#137A7F] text-white'
              : 'bg-white border border-[#D8E6E8] text-[#0B253A] hover:bg-[#EAF5F6]'
          "
          @click="selectedSpec = sp"
        >
          {{ sp === 'SEMUA' ? 'Semua Spesialisasi' : sp }}
        </button>
      </div>

      <CommonLoadingSkeleton v-if="pending" :rows="4" />

      <CommonEmptyState
        v-else-if="filteredDoctors.length === 0"
        title="Dokter Tidak Ditemukan"
        description="Tidak ada dokter yang cocok dengan kata kunci pencarian Anda."
      />

      <!-- Grid Dokter Terintegrasi Jadwal Praktik -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <article
          v-for="doc in filteredDoctors"
          :key="doc.id"
          class="bg-white border border-[#D8E6E8] rounded-lg p-6 flex flex-col justify-between gap-5"
        >
          <div class="space-y-4">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3.5">
                <img
                  :src="doc.photoUrl || '/images/lead-doctor-amanda.jpg'"
                  :alt="`Foto ${doc.titlePrefix || 'drg.'} ${doc.fullName}`"
                  width="56"
                  height="56"
                  loading="lazy"
                  class="size-14 rounded-md border border-[#D8E6E8] object-cover object-top shrink-0 bg-[#EAF5F6]"
                >
                <div>
                  <p class="text-[11px] font-bold text-[#137A7F] uppercase">
                    {{ doc.specialization }}
                  </p>
                  <h2 class="font-heading font-bold text-[17px] text-[#0B253A]">
                    {{ doc.titlePrefix }} {{ doc.fullName }}{{ doc.titleSuffix ? `, ${doc.titleSuffix}` : '' }}
                  </h2>
                  <p class="text-[12px] text-[#475569]">
                    SIP: {{ doc.licenseNumber || '446/011/SIP-DRG/PTK' }} · {{ doc.experienceYears || 8 }}+ Thn Pengalaman
                  </p>
                </div>
              </div>
              <div class="text-right shrink-0">
                <span class="text-[11px] text-[#475569] block">Konsultasi</span>
                <strong class="text-sm font-bold text-[#137A7F]">{{ formatRupiah(doc.consultationFee || 150000) }}</strong>
              </div>
            </div>

            <!-- Jadwal Praktik Mingguan Terintegrasi Database -->
            <div class="p-4 rounded-md bg-[#F4F9F9] border border-[#D8E6E8] space-y-2">
              <p class="text-[11px] font-bold uppercase text-[#137A7F]">
                Jadwal Praktik &amp; Hari Libur Mingguan
              </p>
              <div v-if="doc.schedules && doc.schedules.length" class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                <div
                  v-for="sch in doc.schedules"
                  :key="sch.id || `${sch.dayOfWeek}-${sch.startTime}`"
                  class="px-3 py-1.5 rounded-md border flex items-center justify-between gap-2"
                  :class="sch.isActive ? 'bg-white border-[#D8E6E8] text-[#0B253A]' : 'bg-[#FFF1F2] border-rose-200 text-[#BE123C]'"
                >
                  <span class="font-semibold">{{ getDayNameId(sch.dayOfWeek) }}</span>
                  <span v-if="sch.isActive" class="font-bold text-[#137A7F]">
                    {{ sch.startTime }} - {{ sch.endTime }}
                  </span>
                  <span v-else class="font-bold">LIBUR</span>
                </div>
              </div>
              <p v-else class="text-xs text-[#475569]">Belum ada jadwal praktik terdaftar.</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#D8E6E8]">
            <button
              type="button"
              class="px-4 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] bg-white hover:bg-[#EAF5F6] text-xs font-semibold text-[#0B253A] transition-colors"
              @click="openScheduleModal(doc)"
            >
              Cek Slot Jadwal Tersedia
            </button>
            <NuxtLink
              :to="`/patient/appointments?doctorId=${doc.id}`"
              class="px-5 py-2.5 min-h-11 inline-flex items-center rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-xs font-semibold text-white transition-colors"
            >
              Booking Jadwal Dokter
            </NuxtLink>
          </div>
        </article>
      </div>
    </div>

    <!-- Modal Cek Ketersediaan Slot Jadwal Real-Time -->
    <div
      v-if="selectedDoctorForSchedule"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="bg-white border border-[#D8E6E8] rounded-lg max-w-2xl w-full p-6 space-y-4">
        <div class="flex items-start justify-between gap-3 pb-3 border-b border-[#D8E6E8]">
          <div>
            <span class="text-[11px] font-bold uppercase text-[#137A7F]">
              KETERSEDIAAN SLOT PRAKTIK REAL-TIME
            </span>
            <h3 class="font-heading font-bold text-[18px] text-[#0B253A]">
              {{ selectedDoctorForSchedule.titlePrefix }} {{ selectedDoctorForSchedule.fullName }}
            </h3>
          </div>
          <button
            type="button"
            class="p-2 min-h-11 min-w-11 rounded-md text-[#475569] hover:bg-[#EAF5F6] inline-flex items-center justify-center"
            @click="selectedDoctorForSchedule = null"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <label for="check-slot-date" class="block text-xs font-semibold text-[#0B253A] mb-1">
              Pilih Tanggal Kunjungan
            </label>
            <input
              id="check-slot-date"
              v-model="checkDate"
              type="date"
              :min="new Date().toISOString().slice(0, 10)"
              class="px-3.5 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-sm text-[#0B253A]"
            >
          </div>
          <p class="text-xs text-[#475569]">
            Tanggal dipilih: <strong class="text-[#0B253A]">{{ formatDateId(checkDate) }}</strong>
          </p>
        </div>

        <CommonLoadingSkeleton v-if="slotsLoading" :rows="2" />

        <div
          v-else-if="slotResult?.reason && (!slotResult.slots || slotResult.slots.length === 0)"
          class="p-4 rounded-md bg-[#FFFBEB] border border-[#D8E6E8] text-xs text-[#B45309]"
        >
          {{ slotResult.reason }}
        </div>

        <div v-else class="space-y-3">
          <p class="text-xs text-[#475569]">
            Slot dengan label <strong>Waktu Terlewat</strong> atau <strong>Terisi Pasien</strong> tidak dapat dipilih.
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            <div
              v-for="slot in slotResult?.slots || []"
              :key="slot.startTime"
              class="p-2.5 rounded-md border text-center text-xs"
              :class="
                slot.isBooked || slot.reason === 'Terisi Pasien'
                  ? 'bg-[#FFF1F2] border-rose-200 text-[#BE123C]'
                  : !slot.isAvailable
                    ? 'bg-[#F4F9F9] border-[#D8E6E8] text-slate-400 line-through'
                    : 'bg-[#EAF5F6] border-[#D8E6E8] text-[#137A7F] font-semibold'
              "
            >
              <span class="block">{{ slot.startTime }} - {{ slot.endTime }}</span>
              <span class="text-[10px] block font-semibold mt-0.5">
                {{ slot.isAvailable ? 'Tersedia' : slot.reason || 'Tidak Tersedia' }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-[#D8E6E8]">
          <button
            type="button"
            class="px-4 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs font-semibold text-[#0B253A]"
            @click="selectedDoctorForSchedule = null"
          >
            Tutup
          </button>
          <NuxtLink
            :to="`/patient/appointments?doctorId=${selectedDoctorForSchedule.id}`"
            class="px-5 py-2 min-h-11 inline-flex items-center rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
          >
            Lanjut Booking Appointment
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
