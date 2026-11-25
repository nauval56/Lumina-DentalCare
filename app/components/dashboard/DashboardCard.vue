<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  tone?: 'sky' | 'teal' | 'emerald' | 'amber' | 'rose'
}>()
</script>

<template>
  <!-- Figma Lumina/KpiCard: h-[108px], rounded-lg, 48px Mint circle, uppercase #137A7F label, 24px Poppins #0B253A value -->
  <div class="bg-white border border-[#D8E6E8] rounded-lg p-5 min-h-[108px] flex items-center gap-4">
    <div
      class="size-12 rounded-full flex items-center justify-center shrink-0"
      :class="{
        'bg-[#DFF1F2] text-[#137A7F]': !tone || tone === 'sky' || tone === 'teal',
        'bg-[#ECFDF5] text-[#15803D]': tone === 'emerald',
        'bg-[#FFFBEB] text-[#B45309]': tone === 'amber',
        'bg-[#FFF1F2] text-[#BE123C]': tone === 'rose'
      }"
    >
      <UIcon :name="icon || 'i-lucide-activity'" class="w-[22px] h-[22px]" aria-hidden="true" />
    </div>
    <div class="min-w-0 flex-1 flex flex-col gap-[3px]">
      <p class="text-[11px] font-bold uppercase text-[#137A7F] truncate">{{ title }}</p>
      <p class="font-heading font-bold text-[22px] sm:text-[24px] text-[#0B253A] leading-tight truncate">{{ value }}</p>
      <p v-if="subtitle" class="text-[12px] text-[#475569] truncate">{{ subtitle }}</p>
    </div>
  </div>
</template>
