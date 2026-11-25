<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; to: string; icon: string }>
  currentPath: string
}>()
</script>

<template>
  <nav
    class="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#D8E6E8] grid"
    :style="{ gridTemplateColumns: `repeat(${Math.min(items.length, 5)}, minmax(0, 1fr))` }"
    aria-label="Bottom Navigation"
  >
    <NuxtLink
      v-for="item in items.slice(0, 5)"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center justify-center py-2 px-1 text-[11px] font-medium"
      :class="currentPath === item.to ? 'text-[#137A7F] font-semibold' : 'text-[#475569]'"
    >
      <UIcon :name="item.icon" class="w-5 h-5 mb-0.5" />
      <span class="truncate max-w-full">{{ item.label.split(' ')[0] }}</span>
    </NuxtLink>
  </nav>
</template>
