<script setup lang="ts">
import { formatRupiah, formatDateId } from '~/utils/format'
import type { EvaluatedClinicDate } from '~/utils/clinicScheduleRules'

definePageMeta({ layout: 'portal' })

const route = useRoute()
const toast = useClinicToast()

const [
  { data: servicesData },
  { data: doctorsData },
  { data: appointmentsData, refresh: refreshAppointments },
  { data: clinicScheduleData }
] = await Promise.all([
  useFetch('/api/services'),
  useFetch('/api/doctors'),
  useFetch('/api/appointments'),
  useFetch('/api/clinic-schedule')
])

const currentStep = ref(1)
const steps = [
  '1. Layanan & Dokter',
  '2. Tanggal & Slot Waktu',
  '3. Keluhan & Konfirmasi'
]

const defaultDateStr = computed(() => {
  const startStr = clinicScheduleData.value?.todayStr || new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const d = new Date(`${startStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
})

const bookingForm = reactive({
  serviceId: String(route.query.serviceId || ''),
  doctorId: String(route.query.doctorId || ''),
  appointmentDate: defaultDateStr.value,
  startTime: '',
  chiefComplaint: '',
  notes: ''
})

const selectedDateStatus = ref<EvaluatedClinicDate | null>(null)
const clinicDayStatusFromApi = ref<EvaluatedClinicDate | null>(null)

const slotsLoading = ref(false)
const availableSlots = ref<
  Array<{
    startTime: string
    endTime: string
    isAvailable: boolean
    isPast?: boolean
    isBooked?: boolean
    reason?: string
  }>
>([])
const availabilityReason = ref('')
const submitting = ref(false)

const cancelDialog = reactive({
  open: false,
  appointmentId: '',
  bookingCode: '',
  loading: false
})

const selectedService = computed(() =>
  (servicesData.value?.items || []).find((s: { id: string }) => s.id === bookingForm.serviceId)
)
const selectedDoctor = computed(() =>
  (doctorsData.value?.items || []).find((d: { id: string }) => d.id === bookingForm.doctorId)
)

async function loadSlots() {
  if (!bookingForm.doctorId || !bookingForm.appointmentDate) return
  slotsLoading.value = true
  availabilityReason.value = ''
  try {
    const res = await $fetch<{
      available: boolean
      reason?: string
      clinicDayStatus?: EvaluatedClinicDate
      slots: Array<{
        startTime: string
        endTime: string
        isAvailable: boolean
        isPast?: boolean
        isBooked?: boolean
        isOutsideHours?: boolean
        reason?: string
      }>
    }>('/api/schedules/availability', {
      query: {
        doctorId: bookingForm.doctorId,
        date: bookingForm.appointmentDate,
        serviceId: bookingForm.serviceId
      }
    })
    availableSlots.value = res.slots || []
    availabilityReason.value = res.reason || ''
    clinicDayStatusFromApi.value = res.clinicDayStatus || null
  } catch {
    availableSlots.value = []
  } finally {
    slotsLoading.value = false
  }
}

watch(
  () => [bookingForm.doctorId, bookingForm.appointmentDate, bookingForm.serviceId],
  () => {
    bookingForm.startTime = ''
    if (bookingForm.doctorId && bookingForm.appointmentDate) {
      loadSlots()
    }
  },
  { immediate: true }
)

function goToStep(step: number) {
  if (step === 2) {
    if (!bookingForm.serviceId) {
      toast.error('Pilih Layanan', 'Silakan pilih layanan perawatan gigi terlebih dahulu.')
      return
    }
    if (!bookingForm.doctorId) {
      toast.error('Pilih Dokter', 'Silakan pilih dokter gigi terlebih dahulu.')
      return
    }
  }
  if (step === 3) {
    if (!bookingForm.appointmentDate) {
      toast.error('Pilih Tanggal', 'Silakan tentukan tanggal kunjungan.')
      return
    }
    if (!bookingForm.startTime) {
      toast.error('Pilih Slot Waktu', 'Silakan pilih salah satu slot waktu yang tersedia.')
      return
    }
  }
  currentStep.value = step
}

async function confirmAppointment() {
  submitting.value = true
  try {
    const res = await $fetch<{
      success: boolean
      message: string
      appointment: { bookingCode: string }
    }>('/api/appointments', {
      method: 'POST',
      body: bookingForm
    })
    toast.success(
      `Booking Terkonfirmasi (#${res.appointment.bookingCode})`,
      res.message
    )
    currentStep.value = 1
    bookingForm.startTime = ''
    bookingForm.chiefComplaint = ''
    bookingForm.notes = ''
    await refreshAppointments()
  } catch (err: unknown) {
    toast.error(
      'Verifikasi Booking Gagal',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage ||
        'Slot waktu tidak tersedia.'
    )
  } finally {
    submitting.value = false
  }
}

function promptCancel(appt: { id: string; bookingCode: string }) {
  cancelDialog.appointmentId = appt.id
  cancelDialog.bookingCode = appt.bookingCode
  cancelDialog.open = true
}

async function executeCancel() {
  cancelDialog.loading = true
  try {
    await $fetch(`/api/appointments/${cancelDialog.appointmentId}/cancel`, {
      method: 'POST',
      body: { reason: 'Dibatalkan oleh pasien melalui Patient Portal' }
    })
    toast.info('Appointment Dibatalkan', `Jadwal #${cancelDialog.bookingCode} telah dibatalkan.`)
    cancelDialog.open = false
    await refreshAppointments()
  } catch (err: unknown) {
    toast.error(
      'Gagal Membatalkan',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  } finally {
    cancelDialog.loading = false
  }
}
</script>

<template>
  <!-- Figma 15. Patient Booking 7 Langkah (/patient/appointments) -->
  <div class="flex flex-col gap-[22px]">
    <!-- Wizard Booking Appointment (7 Langkah PRD Bab 7) -->
    <div class="bg-white border border-[#D8E6E8] rounded-lg p-6 sm:p-7 space-y-6">
      <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[11px] font-bold uppercase text-[#137A7F]">
            SISTEM VERIFIKASI OTOMATIS &amp; ANTI DOUBLE-BOOKING
          </span>
          <h1 class="font-heading font-bold text-[22px] text-[#0B253A] mt-0.5">
            Booking Appointment Perawatan Gigi
          </h1>
        </div>
        <span class="px-3.5 py-1.5 rounded-md bg-[#DFF1F2] border border-[#D8E6E8] text-[11px] font-bold text-[#137A7F]">
          Langkah {{ currentStep }} dari 3
        </span>
      </div>

      <!-- Stepper Header (3-Step Booking) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          v-for="(label, index) in steps"
          :key="label"
          type="button"
          class="px-3.5 py-2.5 min-h-11 rounded-md text-[12px] font-semibold text-center border transition-all"
          :class="
            currentStep === index + 1
              ? 'bg-[#137A7F] text-white border-[#137A7F]'
              : currentStep > index + 1
                ? 'bg-[#DFF1F2] text-[#137A7F] border-[#D8E6E8]'
                : 'bg-[#F4F9F9] text-[#475569] border-[#D8E6E8]'
          "
          @click="index + 1 < currentStep && (currentStep = index + 1)"
        >
          {{ label }}
        </button>
      </div>

      <!-- Langkah 1: Pilih Layanan & Dokter -->
      <div v-if="currentStep === 1" class="space-y-6">
        <div class="space-y-3">
          <h2 class="font-heading font-semibold text-base text-[#0B253A]">
            1A. Pilih Layanan Perawatan Gigi
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              v-for="srv in servicesData?.items || []"
              :key="srv.id"
              type="button"
              class="p-4 rounded-md border text-left transition-all flex flex-col justify-between gap-3"
              :class="
                bookingForm.serviceId === srv.id
                  ? 'border-[#137A7F] bg-[#EAF5F6] ring-2 ring-[#137A7F]'
                  : 'border-[#D8E6E8] hover:border-[#137A7F] bg-white'
              "
              @click="bookingForm.serviceId = srv.id"
            >
              <div>
                <span class="text-[11px] font-bold text-[#137A7F] uppercase">{{ srv.category }}</span>
                <h3 class="font-heading font-bold text-[15px] text-[#0B253A] mt-0.5">{{ srv.name }}</h3>
                <p class="text-[12px] text-[#475569] mt-1 line-clamp-2">{{ srv.shortDesc }}</p>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-[#D8E6E8] text-xs">
                <strong class="text-[#137A7F]">{{ formatRupiah(srv.price) }}</strong>
                <span class="text-[#475569]">{{ srv.durationMinutes }} Menit</span>
              </div>
            </button>
          </div>
        </div>

        <div class="space-y-3 pt-4 border-t border-[#D8E6E8]">
          <h2 class="font-heading font-semibold text-base text-[#0B253A]">
            1B. Pilih Dokter Gigi Spesialis
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              v-for="doc in doctorsData?.items || []"
              :key="doc.id"
              type="button"
              class="p-4 rounded-md border text-left transition-all flex items-start gap-4"
              :class="
                bookingForm.doctorId === doc.id
                  ? 'border-[#137A7F] bg-[#EAF5F6] ring-2 ring-[#137A7F]'
                  : 'border-[#D8E6E8] hover:border-[#137A7F] bg-white'
              "
              @click="bookingForm.doctorId = doc.id"
            >
              <img
                :src="doc.photoUrl || '/images/lead-doctor-amanda.jpg'"
                :alt="doc.fullName"
                width="56"
                height="56"
                class="w-14 h-14 rounded-md object-cover object-top shrink-0 border border-[#D8E6E8]"
              >
              <div class="flex-1 min-w-0">
                <span class="text-[11px] font-bold text-[#137A7F]">{{ doc.specialization }}</span>
                <h3 class="font-heading font-bold text-[15px] text-[#0B253A]">
                  {{ doc.titlePrefix }} {{ doc.fullName }}{{ doc.titleSuffix ? `, ${doc.titleSuffix}` : '' }}
                </h3>
                <p class="text-[12px] text-[#475569] mt-1">
                  Konsultasi: {{ formatRupiah(doc.consultationFee) }}
                </p>
              </div>
            </button>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            type="button"
            class="px-6 py-3 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold"
            @click="goToStep(2)"
          >
            Lanjut Pilih Tanggal &amp; Slot Waktu →
          </button>
        </div>
      </div>

      <!-- Langkah 2: Kalender Interaktif & Pilih Slot Waktu -->
      <div v-else-if="currentStep === 2" class="space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-heading font-bold text-[16px] text-[#0B253A]">
            Langkah 2: Pilih Tanggal &amp; Slot Waktu ({{ formatDateId(bookingForm.appointmentDate) }})
          </h2>
          <button
            type="button"
            class="text-xs font-semibold text-[#137A7F] hover:underline"
            @click="loadSlots"
          >
            Muat Ulang Slot
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <BookingInteractiveBookingCalendar
            v-model="bookingForm.appointmentDate"
            :config="clinicScheduleData?.config"
            :holidays="clinicScheduleData?.holidays"
            :min-date="clinicScheduleData?.todayStr"
            @date-evaluated="selectedDateStatus = $event"
          />

          <div class="space-y-4">
            <!-- Banner Pengurangan Jam Praktek -->
            <div
              v-if="(clinicDayStatusFromApi || selectedDateStatus)?.isReducedHours"
              class="p-4 rounded-md bg-[#FFFBEB] border border-amber-300 text-xs space-y-1"
            >
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 rounded-md bg-amber-600 text-white text-[11px] font-bold">
                  Jam Praktek Terbatas
                </span>
                <strong class="text-[#0B253A]">
                  {{ (clinicDayStatusFromApi || selectedDateStatus)?.openTime }} - {{ (clinicDayStatusFromApi || selectedDateStatus)?.closeTime }} WIB
                </strong>
              </div>
              <p class="text-[#B45309]">
                {{ (clinicDayStatusFromApi || selectedDateStatus)?.reason }}. Slot di luar jam aktif otomatis dinonaktifkan.
              </p>
            </div>

            <CommonLoadingSkeleton v-if="slotsLoading" :rows="2" />

            <div
              v-else-if="availabilityReason"
              class="p-4 rounded-md bg-[#FFF1F2] border border-rose-200 text-xs text-[#BE123C]"
            >
              <strong>Jadwal Tidak Tersedia:</strong> {{ availabilityReason }} Silakan pilih tanggal lain pada kalender.
            </div>

            <div v-else class="space-y-3">
              <div class="p-3 rounded-md bg-[#EAF5F6] border border-[#D8E6E8] text-xs text-[#0B253A] flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>Slot Waktu (Interval {{ clinicScheduleData?.config?.slotIntervalMinutes || 30 }} Menit):</strong> Pilih jam yang tersedia.
                </span>
                <div class="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
                  <span class="inline-flex items-center gap-1 text-[#137A7F]">
                    <span class="size-2.5 rounded-full bg-[#137A7F]" /> Tersedia
                  </span>
                  <span class="inline-flex items-center gap-1 text-[#475569]">
                    <span class="size-2.5 rounded-full bg-slate-400" /> Terlewat / Di Luar Jam
                  </span>
                  <span class="inline-flex items-center gap-1 text-[#BE123C]">
                    <span class="size-2.5 rounded-full bg-[#BE123C]" /> Terisi Pasien
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <button
                  v-for="slot in availableSlots"
                  :key="slot.startTime"
                  type="button"
                  :disabled="!slot.isAvailable"
                  class="p-3 min-h-11 rounded-md border text-center transition-all"
                  :class="
                    slot.isBooked || slot.reason === 'Terisi Pasien'
                      ? 'bg-[#FFF1F2] border-rose-200 text-[#BE123C] cursor-not-allowed'
                      : !slot.isAvailable
                        ? 'bg-[#F4F9F9] border-[#D8E6E8] text-slate-400 cursor-not-allowed line-through'
                        : bookingForm.startTime === slot.startTime
                          ? 'bg-[#137A7F] border-[#137A7F] text-white font-bold shadow-xs'
                          : 'bg-white border-[#D8E6E8] hover:border-[#137A7F] text-[#0B253A] font-semibold'
                  "
                  @click="slot.isAvailable && (bookingForm.startTime = slot.startTime)"
                >
                  <span class="text-xs block">{{ slot.startTime }} - {{ slot.endTime }}</span>
                  <span class="text-[10px] block font-semibold mt-0.5">
                    {{ slot.isAvailable ? 'Tersedia' : slot.reason || 'Tidak Tersedia' }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-between">
          <button
            type="button"
            class="px-5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-xs font-semibold text-[#0B253A] hover:bg-[#EAF5F6]"
            @click="currentStep = 1"
          >
            ← Kembali
          </button>
          <button
            type="button"
            class="px-6 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold transition-colors"
            @click="goToStep(3)"
          >
            Lanjut Keluhan &amp; Konfirmasi →
          </button>
        </div>
      </div>

      <!-- Langkah 3: Info Keluhan & Ringkasan Konfirmasi -->
      <div v-else-if="currentStep === 3" class="space-y-5">
        <h2 class="font-heading font-bold text-[16px] text-[#0B253A]">
          Langkah 3: Keluhan Pasien &amp; Konfirmasi Booking
        </h2>

        <div class="p-5 rounded-md bg-[#EAF5F6] border border-[#D8E6E8] grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span class="text-[11px] font-bold uppercase text-[#137A7F] block">Layanan Perawatan</span>
            <strong class="text-[#0B253A]">{{ selectedService?.name }}</strong>
            <span class="text-xs text-[#137A7F] font-semibold block">
              {{ formatRupiah(selectedService?.price) }} ({{ selectedService?.durationMinutes }} menit)
            </span>
          </div>
          <div>
            <span class="text-[11px] font-bold uppercase text-[#137A7F] block">Dokter Gigi</span>
            <strong class="text-[#0B253A]">
              {{ selectedDoctor?.titlePrefix }} {{ selectedDoctor?.fullName }}
            </strong>
            <span class="text-xs text-[#475569] block">{{ selectedDoctor?.specialization }}</span>
          </div>
          <div>
            <span class="text-[11px] font-bold uppercase text-[#137A7F] block">Tanggal &amp; Waktu</span>
            <strong class="text-[#0B253A]">
              {{ formatDateId(bookingForm.appointmentDate) }} · Pukul {{ bookingForm.startTime }} WIB
            </strong>
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-[12px] font-semibold text-[#0B253A] mb-1">
              Keluhan Utama / Tujuan Pemeriksaan *
            </label>
            <textarea
              v-model="bookingForm.chiefComplaint"
              rows="3"
              required
              placeholder="Contoh: Gigi geraham kanan atas terasa ngilu saat minum dingin dan ingin membersihkan karang gigi."
              class="w-full px-4 py-2.5 rounded-md border border-[#D8E6E8] text-sm text-[#0B253A]"
            />
          </div>
          <div>
            <label class="block text-[12px] font-semibold text-[#0B253A] mb-1">
              Catatan Tambahan (Opsional)
            </label>
            <input
              v-model="bookingForm.notes"
              type="text"
              placeholder="Misal: Memiliki riwayat alergi antibiotik tertentu"
              class="w-full px-4 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm text-[#0B253A]"
            >
          </div>
        </div>

        <div class="flex justify-between">
          <button
            type="button"
            class="px-5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-xs font-semibold text-[#0B253A] hover:bg-[#EAF5F6]"
            @click="currentStep = 2"
          >
            ← Ubah Tanggal / Jam
          </button>
          <button
            type="button"
            :disabled="submitting"
            class="bg-[#137A7F] hover:bg-[#0E5F63] inline-flex items-center gap-2 px-6 py-3 min-h-11 rounded-md text-white text-[13px] font-semibold transition-colors"
            @click="confirmAppointment"
          >
            <UIcon name="i-lucide-check-circle-2" class="w-5 h-5" />
            <span>{{ submitting ? 'Memverifikasi & Menyimpan...' : '7. Verifikasi Slot & Konfirmasi Appointment' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Daftar Appointment Pasien -->
    <div class="bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-[#D8E6E8]">
        <div>
          <span class="text-[11px] font-bold uppercase text-[#137A7F]">RIWAYAT KUNJUNGAN</span>
          <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
            Daftar &amp; Riwayat Appointment Anda
          </h2>
        </div>
        <span class="px-3 py-1 rounded-md bg-[#EAF5F6] text-[#137A7F] text-xs font-bold">
          {{ (appointmentsData?.items || []).length }} Jadwal
        </span>
      </div>

      <div v-if="(appointmentsData?.items || []).length" class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-[#D8E6E8] text-[11px] font-bold text-[#137A7F] uppercase bg-[#EAF5F6]/60">
              <th class="py-3 px-3">Kode Booking</th>
              <th class="py-3 px-3">Tanggal &amp; Jam</th>
              <th class="py-3 px-3">Layanan</th>
              <th class="py-3 px-3">Dokter</th>
              <th class="py-3 px-3">Status</th>
              <th class="py-3 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D8E6E8]/60">
            <tr v-for="appt in appointmentsData?.items || []" :key="appt.id">
              <td class="py-3.5 px-3 font-mono text-xs font-bold text-[#137A7F]">
                {{ appt.bookingCode }}
              </td>
              <td class="py-3.5 px-3">
                <div class="font-semibold text-[#0B253A]">{{ formatDateId(appt.appointmentDate) }}</div>
                <div class="text-xs text-[#475569]">{{ appt.startTime }} - {{ appt.endTime }} WIB</div>
              </td>
              <td class="py-3.5 px-3 font-medium text-[#0B253A]">{{ appt.service?.name }}</td>
              <td class="py-3.5 px-3 text-[#475569]">
                {{ appt.doctor?.titlePrefix }} {{ appt.doctor?.fullName }}
              </td>
              <td class="py-3.5 px-3">
                <CommonStatusBadge :status="appt.status" kind="appointment" />
              </td>
              <td class="py-3.5 px-3 text-right">
                <button
                  v-if="['PENDING', 'CONFIRMED'].includes(appt.status)"
                  type="button"
                  class="px-3.5 py-2 min-h-11 rounded-md bg-[#FFF1F2] hover:bg-rose-100 text-[#BE123C] text-xs font-semibold"
                  @click="promptCancel(appt)"
                >
                  Batalkan
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <CommonEmptyState
        v-else
        title="Belum Ada Appointment"
        description="Gunakan formulir booking di atas untuk menjadwalkan kunjungan pertama Anda."
      />
    </div>

    <CommonConfirmDialog
      :open="cancelDialog.open"
      title="Batalkan Appointment?"
      :description="`Apakah Anda yakin ingin membatalkan jadwal #${cancelDialog.bookingCode}? Slot waktu akan dibuka kembali untuk pasien lain.`"
      confirm-label="Ya, Batalkan Jadwal"
      danger
      :loading="cancelDialog.loading"
      @confirm="executeCancel"
      @cancel="cancelDialog.open = false"
    />
  </div>
</template>
