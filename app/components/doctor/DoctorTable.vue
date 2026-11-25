<script setup lang="ts">
import { formatRupiah } from '~/utils/format'

defineProps<{
  doctors: Array<{
    id: string
    titlePrefix?: string | null
    fullName: string
    titleSuffix?: string | null
    licenseNumber: string
    specialization: string
    consultationFee: number
    isActive: boolean
  }>
}>()
</script>

<template>
  <div class="lumina-card overflow-x-auto">
    <table class="w-full text-left border-collapse text-sm">
      <thead>
        <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase bg-[#EAF5F6]/60">
          <th class="py-3.5 px-4">Nama Dokter</th>
          <th class="py-3.5 px-4">No. SIP</th>
          <th class="py-3.5 px-4">Spesialisasi</th>
          <th class="py-3.5 px-4">Tarif Konsultasi</th>
          <th class="py-3.5 px-4">Status</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#D8E6E8]/60">
        <tr v-for="d in doctors" :key="d.id">
          <td class="py-3 px-4 font-semibold text-[#0B253A]">
            {{ d.titlePrefix }} {{ d.fullName }}{{ d.titleSuffix ? `, ${d.titleSuffix}` : '' }}
          </td>
          <td class="py-3 px-4 font-mono text-xs">{{ d.licenseNumber }}</td>
          <td class="py-3 px-4 text-xs font-semibold text-teal-700">{{ d.specialization }}</td>
          <td class="py-3 px-4 font-bold">{{ formatRupiah(d.consultationFee) }}</td>
          <td class="py-3 px-4">
            <span
              class="px-2.5 py-1 rounded-md text-xs font-semibold"
              :class="d.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
            >
              {{ d.isActive ? 'Aktif' : 'Nonaktif' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
