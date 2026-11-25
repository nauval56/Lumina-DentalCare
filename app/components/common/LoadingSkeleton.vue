<script setup lang="ts">
defineProps<{
  rows?: number
}>()
</script>

<template>
  <div class="space-y-3 animate-pulse">
    <div
      v-for="i in rows || 3"
      :key="i"
      class="lumina-card p-5 flex items-center justify-between gap-4"
    >
      <div class="flex items-center gap-3 flex-1">
        <div class="w-11 h-11 rounded-md bg-slate-200" />
        <div class="space-y-2 flex-1">
          <div class="h-4 bg-slate-200 rounded w-1/3" />
          <div class="h-3 bg-slate-100 rounded w-2/3" />
        </div>
      </div>
      <div class="h-8 w-24 bg-slate-200 rounded-lg" />
    </div>
  </div>
</template>
