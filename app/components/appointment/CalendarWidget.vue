<script setup lang="ts">
defineProps<{
  modelValue: string
  minDate?: string
  label?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="lumina-card p-4 space-y-2">
    <label v-if="label" class="block text-xs font-semibold text-slate-700">{{ label }}</label>
    <input
      :value="modelValue"
      type="date"
      :min="minDate"
      class="w-full px-3.5 py-2.5 rounded-md border border-[#D8E6E8] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#137A7F]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
  </div>
</template>
