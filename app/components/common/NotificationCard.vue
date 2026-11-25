<script setup lang="ts">
import { formatDateTimeId } from '~/utils/format'

defineProps<{
  notification: {
    id: string
    title: string
    message: string
    isRead: boolean
    createdAt: string
    linkUrl?: string | null
  }
}>()
</script>

<template>
  <div
    class="p-4 rounded-md border text-xs space-y-1 transition-colors"
    :class="
      notification.isRead
        ? 'bg-white border-[#D8E6E8] text-slate-600'
        : 'bg-[#EAF5F6]/70 border-[#D8E6E8] text-[#0B253A]'
    "
  >
    <div class="flex items-center justify-between gap-2">
      <strong class="font-semibold text-[#0B253A]">{{ notification.title }}</strong>
      <span class="text-[10px] text-slate-400">{{ formatDateTimeId(notification.createdAt) }}</span>
    </div>
    <p class="text-slate-600 leading-relaxed">{{ notification.message }}</p>
  </div>
</template>
