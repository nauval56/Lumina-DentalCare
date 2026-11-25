<script setup lang="ts">
defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="relative">
    <UIcon
      name="i-lucide-search"
      class="w-4 h-4 text-[#475569] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
      aria-hidden="true"
    />
    <input
      :value="modelValue"
      type="search"
      :placeholder="placeholder || 'Cari data...'"
      class="w-full pl-10 pr-4 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] bg-white text-[13px] text-[#0B253A] placeholder:text-[#475569]/70 focus:outline-none focus:ring-2 focus:ring-[#137A7F]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
  </div>
</template>
