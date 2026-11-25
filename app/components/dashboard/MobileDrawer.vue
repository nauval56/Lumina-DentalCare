<script setup lang="ts">
defineProps<{
  open: boolean
  title?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true">
    <div class="fixed inset-0 bg-[#0B253A]/50" @click="emit('close')" />
    <div class="relative w-72 max-w-full bg-white h-full flex flex-col z-10 p-5">
      <div class="flex items-center justify-between pb-4 border-b border-[#D8E6E8]">
        <span class="font-heading font-bold text-base text-[#0B253A]">{{ title || 'Menu Navigasi' }}</span>
        <button
          type="button"
          class="p-1.5 rounded-lg text-[#475569] hover:bg-slate-100"
          @click="emit('close')"
        >
          <UIcon name="i-lucide-x" class="w-5 h-5" />
        </button>
      </div>
      <div class="flex-1 py-4 overflow-y-auto">
        <slot />
      </div>
    </div>
  </div>
</template>
