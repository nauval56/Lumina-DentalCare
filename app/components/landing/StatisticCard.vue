<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  icon?: string
  description?: string
}>()
</script>

<template>
  <div class="lumina-card lumina-card-hover p-6 flex items-start gap-4">
    <div class="w-12 h-12 rounded-md bg-[#EAF5F6] text-[#137A7F] flex items-center justify-center shrink-0">
      <UIcon :name="icon || 'i-lucide-activity'" class="w-6 h-6" />
    </div>
    <div>
      <p class="text-xs font-medium text-[#475569] uppercase tracking-wider">{{ label }}</p>
      <p class="font-heading font-bold text-2xl sm:text-3xl text-[#0B253A] mt-1">{{ value }}</p>
      <p v-if="description" class="text-xs text-[#475569] mt-1">{{ description }}</p>
    </div>
  </div>
</template>
