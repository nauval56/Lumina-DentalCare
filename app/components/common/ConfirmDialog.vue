<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm' | 'cancel'): void
}>()
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 backdrop-blur-xs p-4"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white border border-[#D8E6E8] rounded-lg max-w-md w-full p-6 space-y-4">
      <div class="flex items-start gap-3.5">
        <div
          class="size-11 rounded-full flex items-center justify-center shrink-0"
          :class="danger ? 'bg-[#FFF1F2] text-[#BE123C]' : 'bg-[#DFF1F2] text-[#137A7F]'"
        >
          <UIcon
            :name="danger ? 'i-lucide-alert-triangle' : 'i-lucide-help-circle'"
            class="w-6 h-6"
            aria-hidden="true"
          />
        </div>
        <div>
          <h3 class="font-heading font-bold text-[18px] text-[#0B253A]">{{ title }}</h3>
          <p class="text-[13px] text-[#475569] mt-1">{{ description }}</p>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          class="px-4 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-[13px] font-semibold text-[#0B253A] hover:bg-[#EAF5F6]"
          :disabled="loading"
          @click="emit('cancel')"
        >
          {{ cancelLabel || 'Batal' }}
        </button>
        <button
          type="button"
          class="px-5 py-2 min-h-11 rounded-md text-[13px] font-semibold text-white transition-colors"
          :class="
            danger ? 'bg-[#BE123C] hover:bg-rose-800' : 'bg-[#137A7F] hover:bg-[#0E5F63]'
          "
          :disabled="loading"
          @click="emit('confirm')"
        >
          {{ loading ? 'Memproses...' : confirmLabel || 'Ya, Lanjutkan' }}
        </button>
      </div>
    </div>
  </div>
</template>
