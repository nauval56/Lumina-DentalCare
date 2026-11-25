<script setup lang="ts">
const props = defineProps<{
  title: string
  subtitle?: string
  type?: 'area' | 'bar' | 'donut'
  categories: string[]
  series: Array<{ name: string; data: number[] }> | number[]
  height?: number
}>()

const chartOptions = computed(() => {
  const safeCategories = Array.isArray(props.categories) ? props.categories : []
  const baseOptions: Record<string, unknown> = {
    chart: {
      type: props.type || 'area',
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif'
    },
    colors: ['#0EA5E9', '#14B8A6', '#22C55E', '#F59E0B', '#EF4444'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.5 },
    xaxis: {
      categories: safeCategories
    },
    labels: props.type === 'donut' ? safeCategories : [],
    grid: {
      borderColor: '#E2E8F0',
      strokeDashArray: 4
    },
    legend: {
      position: 'bottom'
    }
  }
  return baseOptions
})
</script>

<template>
  <div class="lumina-card p-6">
    <div class="mb-4">
      <h3 class="font-heading font-semibold text-base text-[#0B253A]">{{ title }}</h3>
      <p v-if="subtitle" class="text-xs text-[#475569]">{{ subtitle }}</p>
    </div>
    <ClientOnly>
      <apexchart
        :type="type || 'area'"
        :height="height || 280"
        :options="chartOptions"
        :series="series"
      />
      <template #fallback>
        <div class="h-64 rounded-md bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400">
          Memuat grafik analitik...
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
