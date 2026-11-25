<script setup lang="ts">
import { formatDateId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const statusFilter = ref('')
const [
  { data: apptData, pending, refresh },
  { data: patientsData },
  { data: doctorsData },
  { data: servicesData },
  { data: clinicScheduleRes, refresh: refreshClinicSchedule }
] = await Promise.all([
  useFetch('/api/appointments', {
    query: computed(() => (statusFilter.value ? { status: statusFilter.value } : {}))
  }),
  useFetch('/api/patients', { query: { limit: 100 } }),
  useFetch('/api/doctors'),
  useFetch('/api/services'),
  useFetch('/api/clinic-schedule')
])

const activeAdminTab = ref<'APPOINTMENTS' | 'SCHEDULE'>('APPOINTMENTS')
const savingScheduleConfig = ref(false)
const scheduleConfigForm = reactive<{
  slotIntervalMinutes: 30 | 60
  weeklyHours: Array<{ dayOfWeek: number; label: string; isOpen: boolean; openTime: string; closeTime: string }>
  specialOverrides: Record<string, { date: string; type: 'CLOSED' | 'REDUCED_HOURS'; openTime?: string; closeTime?: string; reason: string }>
}>({
  slotIntervalMinutes: 30,
  weeklyHours: [],
  specialOverrides: {}
})

watch(
  () => clinicScheduleRes.value?.config,
  (cfg) => {
    if (!cfg) return
    scheduleConfigForm.slotIntervalMinutes = cfg.slotIntervalMinutes === 60 ? 60 : 30
    scheduleConfigForm.weeklyHours = cfg.weeklyHours.map((w: Record<string, unknown>) => ({
      dayOfWeek: Number(w.dayOfWeek),
      label: String(w.label),
      isOpen: Boolean(w.isOpen),
      openTime: String(w.openTime),
      closeTime: String(w.closeTime)
    }))
    scheduleConfigForm.specialOverrides = { ...cfg.specialOverrides }
  },
  { immediate: true }
)

const newOverride = reactive({
  date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  type: 'REDUCED_HOURS' as 'CLOSED' | 'REDUCED_HOURS',
  openTime: '09:00',
  closeTime: '14:00',
  reason: ''
})

async function saveScheduleConfig() {
  savingScheduleConfig.value = true
  try {
    const res = await $fetch<{ message: string }>('/api/clinic-schedule', {
      method: 'POST',
      body: scheduleConfigForm
    })
    toast.success('Jadwal Praktek Disimpan', res.message)
    await refreshClinicSchedule()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Jadwal',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  } finally {
    savingScheduleConfig.value = false
  }
}

async function addSpecialOverride() {
  if (!newOverride.date) return
  const d = new Date(`${newOverride.date}T00:00:00Z`)
  if (d.getUTCDay() === 0) {
    toast.error('Hari Minggu Sudah Libur', 'Setiap hari Minggu otomatis berstatus Libur Tetap.')
    return
  }
  scheduleConfigForm.specialOverrides[newOverride.date] = {
    date: newOverride.date,
    type: newOverride.type,
    openTime: newOverride.type === 'REDUCED_HOURS' ? newOverride.openTime : undefined,
    closeTime: newOverride.type === 'REDUCED_HOURS' ? newOverride.closeTime : undefined,
    reason:
      newOverride.reason.trim() ||
      (newOverride.type === 'CLOSED' ? 'Libur Khusus / Cuti Dokter' : 'Pengurangan Jam Praktek Sesi Pagi')
  }
  newOverride.reason = ''
  await saveScheduleConfig()
}

async function removeSpecialOverride(dateKey: string) {
  delete scheduleConfigForm.specialOverrides[dateKey]
  await saveScheduleConfig()
}

function applyOverridePreset(preset: 'MORNING' | 'AFTERNOON' | 'CLOSED') {
  if (preset === 'MORNING') {
    newOverride.type = 'REDUCED_HOURS'
    newOverride.openTime = '09:00'
    newOverride.closeTime = '14:00'
    newOverride.reason = 'Operasional terbatas sesi pagi (09.00 - 14.00 WIB)'
  } else if (preset === 'AFTERNOON') {
    newOverride.type = 'REDUCED_HOURS'
    newOverride.openTime = '13:00'
    newOverride.closeTime = '17:00'
    newOverride.reason = 'Operasional terbatas sesi siang (13.00 - 17.00 WIB)'
  } else {
    newOverride.type = 'CLOSED'
    newOverride.reason = 'Libur khusus / cuti dokter spesialis'
  }
}

const toast = useClinicToast()
const showCreateModal = ref(false)
const showEditModal = ref(false)
const saving = ref(false)

const createForm = reactive({
  patientId: '',
  doctorId: '',
  serviceId: '',
  appointmentDate: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  complaint: ''
})

const editForm = reactive({
  id: '',
  bookingCode: '',
  appointmentDate: '',
  startTime: '',
  status: 'CONFIRMED',
  notes: ''
})

async function createAppointment() {
  saving.value = true
  try {
    await $fetch('/api/appointments', {
      method: 'POST',
      body: {
        ...createForm,
        chiefComplaint: createForm.complaint.trim() || 'Konsultasi dan pemeriksaan perawatan gigi'
      }
    })
    toast.success('Appointment Dibuat', 'Jadwal kunjungan baru berhasil disimpan.')
    showCreateModal.value = false
    createForm.complaint = ''
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Membuat Appointment',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Slot tidak tersedia.'
    )
  } finally {
    saving.value = false
  }
}

function openEditModal(a: Record<string, unknown>) {
  editForm.id = String(a.id)
  editForm.bookingCode = String(a.bookingCode || '')
  editForm.appointmentDate = String(a.appointmentDate || '').slice(0, 10)
  editForm.startTime = String(a.startTime || '09:00')
  editForm.status = String(a.status || 'CONFIRMED')
  editForm.notes = String(a.notes || '')
  showEditModal.value = true
}

async function updateAppointment() {
  saving.value = true
  try {
    await $fetch(`/api/appointments/${editForm.id}`, {
      method: 'PATCH',
      body: {
        appointmentDate: editForm.appointmentDate,
        startTime: editForm.startTime,
        status: editForm.status,
        notes: editForm.notes
      }
    })
    toast.success('Appointment Diperbarui', 'Perubahan jadwal dan status berhasil disimpan.')
    showEditModal.value = false
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Memperbarui',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Jadwal bentrok atau tidak valid.'
    )
  } finally {
    saving.value = false
  }
}

async function deleteAppointment(a: { id: string; bookingCode: string }) {
  if (import.meta.client && !window.confirm(`Hapus appointment ${a.bookingCode}?`)) {
    return
  }
  try {
    const res = await $fetch<{ message: string }>(`/api/appointments/${a.id}`, {
      method: 'DELETE'
    })
    toast.success('Appointment Dihapus', res.message)
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menghapus',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Tidak dapat menghapus appointment ini.'
    )
  }
}
</script>

<template>
  <!-- Figma 32. Admin CRUD Appointment & Antrean (/admin/appointments) -->
  <div class="flex flex-col gap-[22px]">
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold uppercase text-[#137A7F]">
          ADMIN · MANAJEMEN KUNJUNGAN &amp; JADWAL PASIEN (CRUD)
        </span>
        <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
          Manajemen Appointment ({{ apptData?.total ?? apptData?.items?.length ?? 0 }})
        </h1>
      </div>
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          class="px-5 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold transition-colors"
          @click="showCreateModal = true"
        >
          + Buat Appointment Baru
        </button>
      </div>
    </div>

    <!-- Tab Navigasi Utama Admin Appointment & Jadwal -->
    <div class="bg-white border border-[#D8E6E8] rounded-lg p-2 flex flex-wrap items-center justify-between gap-3">
      <div class="inline-flex flex-wrap gap-1.5">
        <button
          type="button"
          class="px-4 py-2.5 min-h-11 rounded-md text-[13px] font-semibold transition-colors"
          :class="
            activeAdminTab === 'APPOINTMENTS'
              ? 'bg-[#137A7F] text-white'
              : 'bg-[#F4F9F9] text-[#0B253A] hover:bg-[#EAF5F6]'
          "
          @click="activeAdminTab = 'APPOINTMENTS'"
        >
          Daftar Appointment ({{ apptData?.total ?? apptData?.items?.length ?? 0 }})
        </button>
        <button
          type="button"
          class="px-4 py-2.5 min-h-11 rounded-md text-[13px] font-semibold transition-colors inline-flex items-center gap-2"
          :class="
            activeAdminTab === 'SCHEDULE'
              ? 'bg-[#137A7F] text-white'
              : 'bg-[#F4F9F9] text-[#0B253A] hover:bg-[#EAF5F6]'
          "
          @click="activeAdminTab = 'SCHEDULE'"
        >
          <span>Jadwal Praktek &amp; Libur Klinik</span>
          <span
            class="px-2 py-0.5 rounded-md text-[11px] font-bold"
            :class="activeAdminTab === 'SCHEDULE' ? 'bg-white/20 text-white' : 'bg-[#DFF1F2] text-[#137A7F]'"
          >
            {{ Object.keys(scheduleConfigForm.specialOverrides).length }} Penyesuaian
          </span>
        </button>
      </div>

      <div v-if="activeAdminTab === 'APPOINTMENTS'" class="flex flex-wrap items-center gap-1.5">
        <button
          v-for="opt in [
            { value: '', label: 'Semua' },
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'CHECKED_IN', label: 'Checked-In' },
            { value: 'IN_TREATMENT', label: 'In Treatment' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'CANCELLED', label: 'Cancelled' }
          ]"
          :key="opt.value"
          type="button"
          class="px-3 py-2 min-h-11 rounded-md text-xs font-semibold border transition-colors"
          :class="
            statusFilter === opt.value
              ? 'bg-[#EAF5F6] border-[#137A7F] text-[#137A7F]'
              : 'bg-white border-[#D8E6E8] text-[#475569] hover:bg-[#F4F9F9]'
          "
          @click="statusFilter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- TAB 2: Pengaturan Jadwal Praktek Mingguan, Libur Khusus & Pengurangan Jam -->
    <section v-if="activeAdminTab === 'SCHEDULE'" class="space-y-6">
      <!-- Ringkasan Cepat -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white border border-[#D8E6E8] rounded-lg p-5 flex items-center justify-between gap-3">
          <div>
            <span class="text-[11px] font-bold uppercase text-[#137A7F] block">Libur Tetap &amp; Nasional</span>
            <strong class="font-heading text-[16px] text-[#0B253A]">Minggu &amp; Tanggal Merah</strong>
            <p class="text-xs text-[#475569] mt-0.5">Otomatis terkunci pada kalender booking pasien</p>
          </div>
          <span class="px-3 py-1.5 rounded-md bg-[#FFF1F2] text-[#BE123C] text-xs font-bold shrink-0">
            Auto Libur
          </span>
        </div>

        <div class="bg-white border border-[#D8E6E8] rounded-lg p-5 flex items-center justify-between gap-3">
          <div>
            <span class="text-[11px] font-bold uppercase text-[#137A7F] block">Interval Slot Waktu</span>
            <strong class="font-heading text-[16px] text-[#0B253A]">Durasi Per Slot Booking</strong>
            <p class="text-xs text-[#475569] mt-0.5">Menyesuaikan grid jam pada form pasien</p>
          </div>
          <div class="inline-flex rounded-md bg-[#F4F9F9] border border-[#D8E6E8] p-1 shrink-0">
            <button
              type="button"
              class="px-3 py-1.5 min-h-11 rounded-md text-xs font-bold transition-colors"
              :class="scheduleConfigForm.slotIntervalMinutes === 30 ? 'bg-[#137A7F] text-white' : 'text-[#0B253A]'"
              @click="scheduleConfigForm.slotIntervalMinutes = 30"
            >
              30m
            </button>
            <button
              type="button"
              class="px-3 py-1.5 min-h-11 rounded-md text-xs font-bold transition-colors"
              :class="scheduleConfigForm.slotIntervalMinutes === 60 ? 'bg-[#137A7F] text-white' : 'text-[#0B253A]'"
              @click="scheduleConfigForm.slotIntervalMinutes = 60"
            >
              60m
            </button>
          </div>
        </div>

        <div class="bg-white border border-[#D8E6E8] rounded-lg p-5 flex items-center justify-between gap-3">
          <div>
            <span class="text-[11px] font-bold uppercase text-[#137A7F] block">Penyesuaian Hari Biasa</span>
            <strong class="font-heading text-[16px] text-[#0B253A]">
              {{ Object.keys(scheduleConfigForm.specialOverrides).length }} Tanggal Terjadwal
            </strong>
            <p class="text-xs text-[#475569] mt-0.5">Libur khusus &amp; pengurangan jam praktek</p>
          </div>
          <span class="px-3 py-1.5 rounded-md bg-[#DFF1F2] text-[#137A7F] text-xs font-bold shrink-0">
            Senin–Sabtu
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Jam Mingguan -->
        <div class="lg:col-span-6 bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-[#D8E6E8]">
            <div>
              <span class="text-[11px] font-bold uppercase text-[#137A7F]">JADWAL REGULER</span>
              <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
                Jam Operasional Mingguan
              </h2>
            </div>
            <button
              type="button"
              :disabled="savingScheduleConfig"
              class="px-4 py-2 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold transition-colors"
              @click="saveScheduleConfig"
            >
              {{ savingScheduleConfig ? 'Menyimpan...' : 'Simpan Jadwal Mingguan' }}
            </button>
          </div>

          <div class="space-y-2.5">
            <div
              v-for="day in scheduleConfigForm.weeklyHours"
              :key="day.dayOfWeek"
              class="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-md border transition-colors"
              :class="
                day.dayOfWeek === 0 || !day.isOpen
                  ? 'bg-[#FFF1F2]/50 border-rose-200'
                  : 'bg-[#F4F9F9] border-[#D8E6E8]'
              "
            >
              <div class="flex items-center gap-3">
                <button
                  v-if="day.dayOfWeek !== 0"
                  type="button"
                  class="px-3 py-1.5 min-h-11 rounded-md text-xs font-bold border transition-colors"
                  :class="
                    day.isOpen
                      ? 'bg-[#137A7F] border-[#137A7F] text-white'
                      : 'bg-white border-[#D8E6E8] text-[#BE123C]'
                  "
                  @click="day.isOpen = !day.isOpen"
                >
                  {{ day.isOpen ? 'Buka' : 'Tutup' }}
                </button>
                <span
                  v-else
                  class="px-3 py-1.5 min-h-11 inline-flex items-center rounded-md bg-[#FFF1F2] border border-rose-200 text-[#BE123C] text-xs font-bold"
                >
                  Libur Tetap
                </span>
                <strong class="text-sm text-[#0B253A]">{{ day.label }}</strong>
              </div>

              <div v-if="day.dayOfWeek !== 0 && day.isOpen" class="flex items-center gap-2 text-xs">
                <input
                  v-model="day.openTime"
                  type="time"
                  class="px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white font-semibold text-[#0B253A]"
                >
                <span class="text-[#475569] font-semibold">s/d</span>
                <input
                  v-model="day.closeTime"
                  type="time"
                  class="px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white font-semibold text-[#0B253A]"
                >
                <span class="text-[#475569] font-medium">WIB</span>
              </div>
              <span v-else class="text-xs font-semibold text-[#BE123C]">
                {{ day.dayOfWeek === 0 ? 'Tidak Menerima Booking' : 'Klinik Tutup' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Penyesuaian Tanggal Khusus (Libur Khusus / Pengurangan Jam) -->
        <div class="lg:col-span-6 bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-5">
          <div class="pb-3 border-b border-[#D8E6E8]">
            <span class="text-[11px] font-bold uppercase text-[#137A7F]">ATURAN FLEKSIBEL SENIN–SABTU</span>
            <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
              Libur Khusus &amp; Pengurangan Jam Praktek
            </h2>
          </div>

          <!-- Preset Cepat -->
          <div class="space-y-2">
            <span class="text-xs font-semibold text-[#475569] block">Pilih Preset Cepat:</span>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="px-3.5 py-2 min-h-11 rounded-md border border-amber-300 bg-[#FFFBEB] hover:bg-amber-100 text-[#B45309] text-xs font-semibold"
                @click="applyOverridePreset('MORNING')"
              >
                Sesi Pagi (09.00–14.00)
              </button>
              <button
                type="button"
                class="px-3.5 py-2 min-h-11 rounded-md border border-amber-300 bg-[#FFFBEB] hover:bg-amber-100 text-[#B45309] text-xs font-semibold"
                @click="applyOverridePreset('AFTERNOON')"
              >
                Sesi Siang (13.00–17.00)
              </button>
              <button
                type="button"
                class="px-3.5 py-2 min-h-11 rounded-md border border-rose-200 bg-[#FFF1F2] hover:bg-rose-100 text-[#BE123C] text-xs font-semibold"
                @click="applyOverridePreset('CLOSED')"
              >
                Libur Khusus (Tutup)
              </button>
            </div>
          </div>

          <div class="p-4 rounded-md bg-[#F4F9F9] border border-[#D8E6E8] space-y-3 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-[#0B253A] mb-1">Tanggal (Senin–Sabtu)</label>
                <input
                  v-model="newOverride.date"
                  type="date"
                  class="w-full px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white text-xs"
                >
              </div>
              <div>
                <label class="block font-semibold text-[#0B253A] mb-1">Status Tanggal</label>
                <div class="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    class="py-2 min-h-11 rounded-md border text-xs font-semibold"
                    :class="
                      newOverride.type === 'REDUCED_HOURS'
                        ? 'bg-[#137A7F] border-[#137A7F] text-white'
                        : 'bg-white border-[#D8E6E8] text-[#0B253A]'
                    "
                    @click="newOverride.type = 'REDUCED_HOURS'"
                  >
                    Jam Terbatas
                  </button>
                  <button
                    type="button"
                    class="py-2 min-h-11 rounded-md border text-xs font-semibold"
                    :class="
                      newOverride.type === 'CLOSED'
                        ? 'bg-[#BE123C] border-[#BE123C] text-white'
                        : 'bg-white border-[#D8E6E8] text-[#0B253A]'
                    "
                    @click="newOverride.type = 'CLOSED'"
                  >
                    Klinik Tutup
                  </button>
                </div>
              </div>
            </div>

            <div v-if="newOverride.type === 'REDUCED_HOURS'" class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-[#0B253A] mb-1">Jam Buka</label>
                <input
                  v-model="newOverride.openTime"
                  type="time"
                  class="w-full px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white text-xs"
                >
              </div>
              <div>
                <label class="block font-semibold text-[#0B253A] mb-1">Jam Tutup</label>
                <input
                  v-model="newOverride.closeTime"
                  type="time"
                  class="w-full px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white text-xs"
                >
              </div>
            </div>

            <div>
              <label class="block font-semibold text-[#0B253A] mb-1">Keterangan untuk Pasien</label>
              <input
                v-model="newOverride.reason"
                type="text"
                placeholder="Contoh: Cuti dokter spesialis / hanya sesi pagi 09.00 - 14.00 WIB"
                class="w-full px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white text-xs"
              >
            </div>

            <button
              type="button"
              :disabled="savingScheduleConfig"
              class="w-full py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold transition-colors"
              @click="addSpecialOverride"
            >
              Simpan Penyesuaian Tanggal
            </button>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-bold uppercase text-[#137A7F]">Daftar Penyesuaian Tanggal Aktif</p>
            <div
              v-for="(ov, key) in scheduleConfigForm.specialOverrides"
              :key="key"
              class="flex items-center justify-between gap-3 p-3.5 rounded-md border border-[#D8E6E8] bg-[#F4F9F9] text-xs"
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="text-[#0B253A]">{{ formatDateId(ov.date) }}</strong>
                  <span
                    class="px-2.5 py-0.5 rounded-md text-[11px] font-bold"
                    :class="ov.type === 'CLOSED' ? 'bg-[#FFF1F2] text-[#BE123C]' : 'bg-[#FFFBEB] text-[#B45309]'"
                  >
                    {{ ov.type === 'CLOSED' ? 'Klinik Tutup' : `Jam Praktek Terbatas: ${ov.openTime} - ${ov.closeTime} WIB` }}
                  </span>
                </div>
                <p class="text-[#475569] mt-1">{{ ov.reason }}</p>
              </div>
              <button
                type="button"
                class="px-3.5 py-2 min-h-11 rounded-md bg-rose-50 hover:bg-rose-100 text-[#BE123C] text-xs font-semibold shrink-0"
                @click="removeSpecialOverride(String(key))"
              >
                Hapus
              </button>
            </div>
            <p
              v-if="!Object.keys(scheduleConfigForm.specialOverrides).length"
              class="text-xs text-[#475569] p-3.5 rounded-md border border-dashed border-[#D8E6E8] text-center"
            >
              Belum ada penyesuaian libur khusus atau pengurangan jam pada tanggal tertentu.
            </p>
          </div>
        </div>
      </div>
    </section>

    <template v-else>
      <CommonLoadingSkeleton v-if="pending" :rows="4" />

      <div v-else class="lumina-card overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase bg-[#EAF5F6]/60">
            <th class="py-3.5 px-4">Kode Booking</th>
            <th class="py-3.5 px-4">Pasien</th>
            <th class="py-3.5 px-4">Dokter & Layanan</th>
            <th class="py-3.5 px-4">Tanggal & Jam</th>
            <th class="py-3.5 px-4">Status</th>
            <th class="py-3.5 px-4 text-right">Aksi (CRUD)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#D8E6E8]/60">
          <tr v-for="a in apptData?.items || []" :key="a.id">
            <td class="py-3.5 px-4 font-mono text-xs font-bold text-[#137A7F]">{{ a.bookingCode }}</td>
            <td class="py-3.5 px-4">
              <div class="font-semibold text-[#0B253A]">{{ a.patient?.fullName }}</div>
              <div class="text-xs text-[#475569]">{{ a.patient?.medicalRecordNo }}</div>
            </td>
            <td class="py-3.5 px-4 text-xs">
              <div class="font-semibold text-[#0B253A]">
                {{ a.doctor?.titlePrefix }} {{ a.doctor?.fullName }}
              </div>
              <div class="text-teal-700">{{ a.service?.name }}</div>
            </td>
            <td class="py-3.5 px-4 text-xs">
              <div class="font-semibold text-[#0B253A]">{{ formatDateId(a.appointmentDate) }}</div>
              <div class="text-[#475569]">{{ a.startTime }} - {{ a.endTime }} WIB</div>
            </td>
            <td class="py-3.5 px-4">
              <CommonStatusBadge :status="a.status" kind="appointment" />
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="inline-flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg border border-[#D8E6E8] text-xs font-semibold text-slate-700 hover:bg-[#F4F9F9]"
                  @click="openEditModal(a)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                  @click="deleteAppointment(a)"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </template>

    <!-- Modal Buat Appointment -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 backdrop-blur-xs p-4"
    >
      <form class="lumina-card max-w-lg w-full p-6 space-y-4" @submit.prevent="createAppointment">
        <div class="flex items-center justify-between">
          <h3 class="font-heading font-bold text-lg text-[#0B253A]">Buat Appointment Baru</h3>
          <button type="button" class="text-slate-400 hover:text-slate-700" @click="showCreateModal = false">
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Pasien *</label>
            <select
              v-model="createForm.patientId"
              required
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm bg-white"
            >
              <option value="">-- Pilih Pasien --</option>
              <option v-for="p in patientsData?.items || []" :key="p.id" :value="p.id">
                {{ p.medicalRecordNo }} · {{ p.fullName }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Dokter *</label>
              <select
                v-model="createForm.doctorId"
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
              <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Layanan *</label>
              <select
                v-model="createForm.serviceId"
                required
                class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm bg-white"
              >
                <option value="">-- Pilih Layanan --</option>
                <option v-for="s in servicesData?.items || []" :key="s.id" :value="s.id">
                  {{ s.name }} ({{ s.durationMinutes }}m)
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tanggal Kunjungan *</label>
              <input
                v-model="createForm.appointmentDate"
                type="date"
                required
                class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
              >
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Jam Mulai *</label>
              <input
                v-model="createForm.startTime"
                type="time"
                required
                class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
              >
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Keluhan / Catatan Awal</label>
            <input
              v-model="createForm.complaint"
              type="text"
              placeholder="Keluhan pasien"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-md border border-[#D8E6E8] text-xs font-semibold"
            @click="showCreateModal = false"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-5 py-2 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
          >
            {{ saving ? 'Memproses...' : 'Simpan Appointment' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Modal Edit Appointment -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 backdrop-blur-xs p-4"
    >
      <form class="lumina-card max-w-lg w-full p-6 space-y-4" @submit.prevent="updateAppointment">
        <div class="flex items-center justify-between">
          <h3 class="font-heading font-bold text-lg text-[#0B253A]">
            Edit Appointment ({{ editForm.bookingCode }})
          </h3>
          <button type="button" class="text-slate-400 hover:text-slate-700" @click="showEditModal = false">
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Tanggal Kunjungan *</label>
            <input
              v-model="editForm.appointmentDate"
              type="date"
              required
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Jam Mulai *</label>
            <input
              v-model="editForm.startTime"
              type="time"
              required
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Status Appointment</label>
          <select
            v-model="editForm.status"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm bg-white"
          >
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CHECKED_IN">CHECKED_IN</option>
            <option value="IN_TREATMENT">IN_TREATMENT</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="NO_SHOW">NO_SHOW</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan</label>
          <input
            v-model="editForm.notes"
            type="text"
            placeholder="Catatan administrasi"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-md border border-[#D8E6E8] text-xs font-semibold"
            @click="showEditModal = false"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-5 py-2 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
          >
            {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
