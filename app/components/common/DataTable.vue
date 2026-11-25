<script setup lang="ts">
defineProps<{
  headers: string[]
}>()
</script>

<template>
  <div class="lumina-card overflow-x-auto">
    <table class="w-full text-left border-collapse text-sm">
      <thead>
        <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase bg-[#EAF5F6]/60">
          <th v-for="h in headers" :key="h" class="py-3.5 px-4">{{ h }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[#D8E6E8]/60">
        <slot />
      </tbody>
    </table>
  </div>
</template>
