<script setup lang="ts">
import { formatDateId } from '~/utils/format'

defineProps<{
  appointment: {
    id: string
    bookingCode: string
    appointmentDate: string
    startTime: string
    endTime: string
    status: string
    chiefComplaint?: string | null
    doctor?: { titlePrefix?: string | null; fullName: string; specialization?: string }
    service?: { name: string }
    patient?: { fullName: string; medicalRecordNo?: string }
  }
}>()
</script>

<template>
  <div class="lumina-card p-5 space-y-3">
    <div class="flex items-center justify-between gap-2">
      <span class="font-mono text-xs font-bold text-[#137A7F]">#{{ appointment.bookingCode }}</span>
      <CommonStatusBadge :status="appointment.status" kind="appointment" />
    </div>
    <div>
      <h3 class="font-heading font-bold text-base text-[#0B253A]">
        {{ appointment.service?.name || 'Pemeriksaan Gigi' }}
      </h3>
      <p v-if="appointment.doctor" class="text-xs text-slate-600">
        {{ appointment.doctor.titlePrefix }} {{ appointment.doctor.fullName }}
      </p>
      <p v-if="appointment.patient" class="text-xs text-[#475569]">
        Pasien: {{ appointment.patient.fullName }} ({{ appointment.patient.medicalRecordNo }})
      </p>
    </div>
    <div class="pt-2 border-t border-[#D8E6E8] flex items-center justify-between text-xs text-slate-600">
      <span>{{ formatDateId(appointment.appointmentDate) }}</span>
      <span class="font-semibold text-[#137A7F]">{{ appointment.startTime }} - {{ appointment.endTime }} WIB</span>
    </div>
  </div>
</template>
