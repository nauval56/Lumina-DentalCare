<script setup lang="ts">
defineProps<{
  fullName: string
  email: string
  phone?: string | null
  roleName: string
  medicalRecordNo?: string | null
}>()
</script>

<template>
  <div class="lumina-card p-6 flex items-center gap-4">
    <div class="w-14 h-14 rounded-md bg-[#137A7F] text-white font-heading font-bold text-xl flex items-center justify-center shrink-0">
      {{ fullName.slice(0, 1).toUpperCase() }}
    </div>
    <div class="min-w-0 flex-1">
      <span class="text-xs font-semibold text-[#137A7F] uppercase tracking-wider">{{ roleName }}</span>
      <h3 class="font-heading font-bold text-lg text-[#0B253A] truncate">{{ fullName }}</h3>
      <p class="text-xs text-[#475569] truncate">{{ email }} · {{ phone || '-' }}</p>
      <p v-if="medicalRecordNo" class="text-xs font-mono font-semibold text-teal-700 mt-0.5">
        No. RM: {{ medicalRecordNo }}
      </p>
    </div>
  </div>
</template>
