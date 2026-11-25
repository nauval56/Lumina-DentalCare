<script setup lang="ts">
import { formatDateId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const toast = useClinicToast()
const [
  { data: apptData, refresh: refreshAppt },
  { data: patientsData },
  { data: doctorsData },
  { data: servicesData }
] = await Promise.all([
  useFetch('/api/appointments'),
  useFetch('/api/patients'),
  useFetch('/api/doctors'),
  useFetch('/api/services')
])

const showCreate = ref(false)
const submitting = ref(false)

const tomorrow = new Date(Date.now() + 86400000)
if (tomorrow.getUTCDay() === 0) tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

const form = reactive({
  patientId: '',
  doctorId: '',
  serviceId: '',
  appointmentDate: tomorrow.toISOString().slice(0, 10),
  startTime: '10:00',
  chiefComplaint: 'Pemeriksaan dan konsultasi perawatan gigi'
})

async function createForPatient() {
  submitting.value = true
  try {
    const res = await $fetch<{ appointment: { bookingCode: string }; message: string }>(
      '/api/appointments',
      {
        method: 'POST',
        body: form
      }
    )
    toast.success(`Appointment Dibuat (#${res.appointment.bookingCode})`, res.message)
    showCreate.value = false
    await refreshAppt()
  } catch (err: unknown) {
    toast.error(
      'Verifikasi Jadwal Gagal',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Slot tidak tersedia.'
    )
  } finally {
    submitting.value = false
  }
}

async function checkinPatient(appointmentId: string) {
  try {
    const res = await $fetch<{ message: string }>('/api/queues/checkin', {
      method: 'POST',
      body: { appointmentId }
    })
    toast.success('Check-In Berhasil', res.message)
    await refreshAppt()
  } catch (err: unknown) {
    toast.error(
      'Gagal Check-In',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}

async function cancelAppointment(id: string) {
  try {
    await $fetch(`/api/appointments/${id}/cancel`, {
      method: 'POST',
      body: { reason: 'Dibatalkan oleh Resepsionis atas konfirmasi pasien' }
    })
    toast.info('Appointment Dibatalkan', 'Jadwal telah dibatalkan.')
    await refreshAppt()
  } catch (err: unknown) {
    toast.error(
      'Gagal Membatalkan',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}
</script>

<template>
  <!-- Figma 25. Receptionist Manajemen Appointment (/receptionist/appointments) -->
  <div class="flex flex-col gap-[22px]">
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold uppercase text-[#137A7F]">
          PENJADWALAN &amp; CHECK-IN KUNJUNGAN PASIEN
        </span>
        <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
          Manajemen Appointment Resepsionis
        </h1>
      </div>
      <button
        type="button"
        class="px-5 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold transition-colors"
        @click="showCreate = !showCreate"
      >
        + Buat Appointment Pasien
      </button>
    </div>

    <form
      v-if="showCreate"
      class="lumina-card p-6 space-y-4"
      @submit.prevent="createForPatient"
    >
      <h2 class="font-heading font-bold text-base text-[#0B253A]">
        Buat Appointment untuk Pasien (Verifikasi Otomatis Backend)
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Pasien *</label>
          <select
            v-model="form.patientId"
            required
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm bg-white"
          >
            <option value="">-- Pilih Pasien --</option>
            <option v-for="p in patientsData?.items || []" :key="p.id" :value="p.id">
              {{ p.medicalRecordNo }} · {{ p.fullName }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Dokter *</label>
          <select
            v-model="form.doctorId"
            required
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm bg-white"
          >
            <option value="">-- Pilih Dokter --</option>
            <option v-for="d in doctorsData?.items || []" :key="d.id" :value="d.id">
              {{ d.titlePrefix }} {{ d.fullName }} ({{ d.specialization }})
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Layanan *</label>
          <select
            v-model="form.serviceId"
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

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Tanggal Kunjungan *</label>
          <input
            v-model="form.appointmentDate"
            type="date"
            required
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Jam Mulai (HH:mm) *</label>
          <input
            v-model="form.startTime"
            type="time"
            required
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Keluhan / Catatan *</label>
          <input
            v-model="form.chiefComplaint"
            type="text"
            required
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-md border border-[#D8E6E8] text-xs font-semibold"
          @click="showCreate = false"
        >
          Batal
        </button>
        <button
          type="submit"
          :disabled="submitting"
          class="px-5 py-2 rounded-md bg-[#137A7F] text-white text-xs font-semibold"
        >
          {{ submitting ? 'Memverifikasi...' : 'Verifikasi & Simpan Appointment' }}
        </button>
      </div>
    </form>

    <div class="lumina-card overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase bg-[#EAF5F6]/60">
            <th class="py-3.5 px-4">Kode Booking</th>
            <th class="py-3.5 px-4">Pasien</th>
            <th class="py-3.5 px-4">Dokter & Layanan</th>
            <th class="py-3.5 px-4">Jadwal</th>
            <th class="py-3.5 px-4">Status</th>
            <th class="py-3.5 px-4 text-right">Aksi Operasional</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#D8E6E8]/60">
          <tr v-for="a in apptData?.items || []" :key="a.id">
            <td class="py-3.5 px-4 font-mono text-xs font-bold text-[#137A7F]">
              {{ a.bookingCode }}
              <span v-if="a.queue" class="block text-teal-600">
                Antrean: {{ a.queue.queueNumber }}
              </span>
            </td>
            <td class="py-3.5 px-4">
              <div class="font-semibold text-[#0B253A]">{{ a.patient?.fullName }}</div>
              <div class="text-xs text-[#475569]">{{ a.patient?.medicalRecordNo }}</div>
            </td>
            <td class="py-3.5 px-4">
              <div class="font-medium text-[#0B253A]">
                {{ a.doctor?.titlePrefix }} {{ a.doctor?.fullName }}
              </div>
              <div class="text-xs text-[#475569]">{{ a.service?.name }}</div>
            </td>
            <td class="py-3.5 px-4 text-xs">
              <div class="font-semibold text-[#0B253A]">{{ formatDateId(a.appointmentDate) }}</div>
              <div class="text-[#475569]">{{ a.startTime }} - {{ a.endTime }} WIB</div>
            </td>
            <td class="py-3.5 px-4">
              <CommonStatusBadge :status="a.status" kind="appointment" />
            </td>
            <td class="py-3.5 px-4 text-right space-x-2">
              <button
                v-if="['CONFIRMED', 'PENDING'].includes(a.status) && !a.queue"
                type="button"
                class="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold"
                @click="checkinPatient(a.id)"
              >
                Check-In Antrean
              </button>
              <button
                v-if="['CONFIRMED', 'PENDING'].includes(a.status)"
                type="button"
                class="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                @click="cancelAppointment(a.id)"
              >
                Batal
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
