<script setup lang="ts">
import { formatDateId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const { data, pending, refresh } = await useFetch('/api/appointments')
const statusFilter = ref('SEMUA')
const toast = useClinicToast()

const filteredAppointments = computed(() => {
  return (data.value?.items || []).filter((a: { status: string }) =>
    statusFilter.value === 'SEMUA' ? true : a.status === statusFilter.value
  )
})

async function startExamination(apptId: string, patientId: string) {
  try {
    await $fetch(`/api/appointments/${apptId}`, {
      method: 'PATCH',
      body: { status: 'IN_TREATMENT' }
    })
    toast.info('Pemeriksaan Dimulai', 'Status pasien diubah menjadi Sedang Diperiksa.')
    await navigateTo(`/doctor/medical-records?appointmentId=${apptId}&patientId=${patientId}`)
  } catch {
    await navigateTo(`/doctor/medical-records?appointmentId=${apptId}&patientId=${patientId}`)
  }
}
</script>

<template>
  <!-- Figma 20. Doctor Daftar Appointment (/doctor/appointments) -->
  <div class="flex flex-col gap-[22px]">
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold uppercase text-[#137A7F]">
          MANAJEMEN PEMERIKSAAN PASIEN
        </span>
        <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
          Daftar Appointment Dokter
        </h1>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="st in ['SEMUA', 'CONFIRMED', 'CHECKED_IN', 'IN_TREATMENT', 'COMPLETED']"
          :key="st"
          type="button"
          class="px-4 py-2 min-h-11 rounded-md text-[12px] font-semibold transition-colors"
          :class="
            statusFilter === st
              ? 'bg-[#137A7F] text-white'
              : 'bg-white border border-[#D8E6E8] text-[#0B253A] hover:bg-[#DFF1F2]'
          "
          @click="statusFilter = st"
        >
          {{ st }}
        </button>
      </div>
    </div>

    <CommonLoadingSkeleton v-if="pending" :rows="4" />

    <div v-else class="bg-white border border-[#D8E6E8] rounded-lg overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-[#D8E6E8] text-[11px] font-bold text-[#137A7F] uppercase bg-[#EAF5F6]/60">
            <th class="py-3.5 px-4">Pasien</th>
            <th class="py-3.5 px-4">Jadwal</th>
            <th class="py-3.5 px-4">Layanan &amp; Keluhan</th>
            <th class="py-3.5 px-4">Status</th>
            <th class="py-3.5 px-4 text-right">Tindakan Medis</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#D8E6E8]/60">
          <tr v-for="appt in filteredAppointments" :key="appt.id">
            <td class="py-3.5 px-4">
              <div class="font-semibold text-[#0B253A]">{{ appt.patient?.fullName }}</div>
              <div class="text-xs text-[#475569] font-mono">{{ appt.patient?.medicalRecordNo }}</div>
              <div v-if="appt.patient?.allergies" class="text-[11px] text-[#BE123C] font-semibold">
                Alergi: {{ appt.patient.allergies }}
              </div>
            </td>
            <td class="py-3.5 px-4">
              <div class="font-medium text-[#0B253A]">{{ formatDateId(appt.appointmentDate) }}</div>
              <div class="text-xs text-[#137A7F] font-semibold">{{ appt.startTime }} - {{ appt.endTime }} WIB</div>
            </td>
            <td class="py-3.5 px-4 max-w-xs">
              <div class="font-medium text-[#0B253A]">{{ appt.service?.name }}</div>
              <div class="text-xs text-[#475569] truncate">{{ appt.chiefComplaint }}</div>
            </td>
            <td class="py-3.5 px-4">
              <CommonStatusBadge :status="appt.status" kind="appointment" />
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="inline-flex flex-wrap items-center justify-end gap-2">
                <button
                  v-if="!appt.medicalRecord && appt.status !== 'CANCELLED'"
                  type="button"
                  class="px-4 py-2 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold whitespace-nowrap"
                  @click="startExamination(appt.id, appt.patientId)"
                >
                  Mulai Pemeriksaan
                </button>
                <NuxtLink
                  :to="`/doctor/odontogram?patientId=${appt.patientId}`"
                  class="px-4 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-[#0B253A] hover:bg-[#EAF5F6] text-xs font-semibold inline-flex items-center whitespace-nowrap"
                >
                  Odontogram
                </NuxtLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
