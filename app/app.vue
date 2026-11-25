<script setup lang="ts">
const { toasts, dismiss } = useClinicToast()
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- Toast Notifications Overlay -->
    <div
      aria-live="polite"
      class="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-3 p-4 rounded-md border shadow-lg bg-white transition-all"
        :class="{
          'border-emerald-200 bg-emerald-50/95 text-emerald-950': t.type === 'success',
          'border-red-200 bg-red-50/95 text-red-950': t.type === 'error',
          'border-amber-200 bg-amber-50/95 text-amber-950': t.type === 'warning',
          'border-[#D8E6E8] bg-[#EAF5F6]/95 text-sky-950': t.type === 'info'
        }"
      >
        <UIcon
          :name="
            t.type === 'success'
              ? 'i-lucide-check-circle-2'
              : t.type === 'error'
                ? 'i-lucide-alert-circle'
                : 'i-lucide-info'
          "
          class="w-5 h-5 shrink-0 mt-0.5"
          :class="{
            'text-emerald-600': t.type === 'success',
            'text-red-600': t.type === 'error',
            'text-amber-600': t.type === 'warning',
            'text-[#137A7F]': t.type === 'info'
          }"
        />
        <div class="flex-1 text-sm">
          <p class="font-semibold">{{ t.title }}</p>
          <p v-if="t.description" class="text-xs opacity-85 mt-0.5">{{ t.description }}</p>
        </div>
        <button
          type="button"
          class="text-slate-400 hover:text-slate-700 p-1"
          aria-label="Tutup notifikasi"
          @click="dismiss(t.id)"
        >
          <UIcon name="i-lucide-x" class="w-4 h-4" />
        </button>
      </div>
    </div>
  </UApp>
</template>
