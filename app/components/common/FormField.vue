<script setup lang="ts">
defineProps<{
  label: string
  required?: boolean
  error?: string
  hint?: string
}>()
</script>

<template>
  <div class="space-y-1">
    <label class="block text-xs font-semibold text-slate-700">
      {{ label }}
      <span v-if="required" class="text-rose-500">*</span>
    </label>
    <slot />
    <p v-if="error" class="text-xs text-rose-600 font-medium">{{ error }}</p>
    <p v-else-if="hint" class="text-[11px] text-slate-400">{{ hint }}</p>
  </div>
</template>
