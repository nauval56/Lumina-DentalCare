<script setup lang="ts">
import { formatRupiah } from '~/utils/format'

defineProps<{
  title: string
  category?: string
  description: string
  icon?: string
  price?: number
  durationMinutes?: number
  to?: string
}>()
</script>

<template>
  <!-- Matches Figma Lumina/ServiceCard: 40x40px circular Mint icon + category pill + IDR price & duration -->
  <div class="lumina-card lumina-card-hover p-6 flex flex-col justify-between gap-4">
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="w-10 h-10 rounded-full bg-[#DFF1F2] text-[#137A7F] flex items-center justify-center shrink-0">
          <UIcon :name="icon && !icon.includes('sparkle') ? icon : 'i-lucide-stethoscope'" class="w-5 h-5" aria-hidden="true" />
        </div>
        <span
          v-if="category"
          class="px-3 py-1 rounded-md bg-[#EAF5F6] text-[#137A7F] text-xs font-bold"
        >
          {{ category }}
        </span>
      </div>

      <h3 class="font-heading font-bold text-lg text-[#0B253A]">{{ title }}</h3>
      <p class="text-sm text-slate-600 leading-relaxed">{{ description }}</p>
    </div>

    <div v-if="price !== undefined || durationMinutes" class="pt-4 border-t border-[#D8E6E8] flex items-center justify-between">
      <div>
        <span class="text-xs text-slate-600 block">Tarif Resmi Klinik</span>
        <strong class="text-base font-bold text-[#137A7F]">{{ formatRupiah(price || 0) }}</strong>
      </div>
      <div v-if="durationMinutes" class="text-right">
        <span class="text-xs text-slate-600 block">Durasi Tindakan</span>
        <span class="text-xs font-semibold text-[#0B253A]">{{ durationMinutes }} Menit</span>
      </div>
    </div>
  </div>
</template>
