<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; to: string; icon: string }>
  currentPath: string
}>()
</script>

<template>
  <nav class="space-y-1.5" aria-label="Sidebar Navigation">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all"
      :class="
        currentPath === item.to
          ? 'bg-[#137A7F] text-white shadow-sm font-semibold'
          : 'text-slate-600 hover:bg-slate-100 hover:text-[#0B253A]'
      "
    >
      <UIcon :name="item.icon" class="w-5 h-5 shrink-0" />
      <span>{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>
