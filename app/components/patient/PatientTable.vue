<script setup lang="ts">
import { formatDateId } from '~/utils/format'

defineProps<{
  patients: Array<{
    id: string
    medicalRecordNo: string
    fullName: string
    nik?: string | null
    phone: string
    email?: string | null
    dateOfBirth?: string | null
    allergies?: string | null
  }>
}>()

const emit = defineEmits<{
  (e: 'select', patient: Record<string, unknown>): void
}>()
</script>

<template>
  <div class="lumina-card overflow-x-auto">
    <table class="w-full text-left border-collapse text-sm">
      <thead>
        <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase bg-[#EAF5F6]/60">
          <th class="py-3.5 px-4">No. RM</th>
          <th class="py-3.5 px-4">Nama Pasien</th>
          <th class="py-3.5 px-4">Telepon</th>
          <th class="py-3.5 px-4">Tgl Lahir</th>
          <th class="py-3.5 px-4 text-right">Aksi</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#D8E6E8]/60">
        <tr v-for="p in patients" :key="p.id">
          <td class="py-3 px-4 font-mono text-xs font-bold text-[#137A7F]">{{ p.medicalRecordNo }}</td>
          <td class="py-3 px-4 font-semibold text-[#0B253A]">{{ p.fullName }}</td>
          <td class="py-3 px-4 text-xs">{{ p.phone }}</td>
          <td class="py-3 px-4 text-xs text-[#475569]">{{ formatDateId(p.dateOfBirth) }}</td>
          <td class="py-3 px-4 text-right">
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg border border-[#D8E6E8] text-xs font-semibold hover:bg-[#F4F9F9]"
              @click="emit('select', p)"
            >
              Detail
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
