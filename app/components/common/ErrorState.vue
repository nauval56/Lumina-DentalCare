<script setup lang="ts">
defineProps<{
  title?: string
  message: string
}>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()
</script>

<template>
  <div class="lumina-card p-6 border-rose-200 bg-rose-50/60 text-center space-y-3">
    <div class="w-12 h-12 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
      <UIcon name="i-lucide-alert-octagon" class="w-6 h-6" />
    </div>
    <h3 class="font-heading font-semibold text-base text-rose-950">
      {{ title || 'Terjadi Kesalahan Memuat Data' }}
    </h3>
    <p class="text-sm text-rose-800 max-w-md mx-auto">{{ message }}</p>
    <div>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
        @click="emit('retry')"
      >
        <UIcon name="i-lucide-refresh-cw" class="w-4 h-4" />
        <span>Coba Lagi</span>
      </button>
    </div>
  </div>
</template>
