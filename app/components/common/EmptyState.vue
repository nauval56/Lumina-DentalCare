<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  icon?: string
  actionLabel?: string
  actionTo?: string
}>()

const emit = defineEmits<{
  (e: 'action'): void
}>()
</script>

<template>
  <div class="bg-white border border-[#D8E6E8] rounded-lg p-8 text-center flex flex-col items-center justify-center">
    <div
      class="size-14 rounded-full bg-[#DFF1F2] text-[#137A7F] flex items-center justify-center mb-4"
    >
      <UIcon :name="icon || 'i-lucide-inbox'" class="w-7 h-7" aria-hidden="true" />
    </div>
    <h3 class="font-heading font-bold text-[16px] text-[#0B253A]">{{ title }}</h3>
    <p v-if="description" class="text-[13px] text-[#475569] max-w-md mt-1">
      {{ description }}
    </p>
    <div v-if="actionLabel" class="mt-5">
      <NuxtLink
        v-if="actionTo"
        :to="actionTo"
        class="inline-flex items-center gap-2 px-5 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold transition-colors"
      >
        {{ actionLabel }}
      </NuxtLink>
      <button
        v-else
        type="button"
        class="inline-flex items-center gap-2 px-5 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold transition-colors"
        @click="emit('action')"
      >
        {{ actionLabel }}
      </button>
    </div>
  </div>
</template>
