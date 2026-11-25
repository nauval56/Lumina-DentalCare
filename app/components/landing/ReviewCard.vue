<script setup lang="ts">
import { formatDateId } from '~/utils/format'

defineProps<{
  review: {
    id: string
    patientName: string
    serviceName?: string | null
    rating: number
    comment: string
    createdAt?: string
  }
}>()
</script>

<template>
  <div class="bg-[#F4F9F9] border border-[#D8E6E8] rounded-lg p-5 flex flex-col justify-between gap-3">
    <div class="space-y-2.5">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1" :aria-label="`Rating ${review.rating} dari 5 bintang`">
          <svg
            v-for="n in 5"
            :key="n"
            viewBox="0 0 20 20"
            width="16"
            height="16"
            class="size-4"
            :class="n <= (review.rating || 5) ? 'text-amber-500' : 'text-[#D8E6E8]'"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <span class="text-[11px] font-bold text-[#0B253A] bg-white border border-[#D8E6E8] rounded-md px-2 py-0.5">
          {{ review.rating || 5 }} / 5
        </span>
      </div>
      <p class="text-[13px] text-[#0B253A] leading-relaxed italic">"{{ review.comment }}"</p>
    </div>

    <div class="pt-3 border-t border-[#D8E6E8] flex items-center justify-between gap-2">
      <div>
        <p class="font-heading font-bold text-[13px] text-[#0B253A]">{{ review.patientName }}</p>
        <p class="text-[11px] font-semibold text-[#137A7F]">{{ review.serviceName || 'Pasien Lumina Dental Care' }}</p>
      </div>
      <span v-if="review.createdAt" class="text-[11px] text-[#475569]">
        {{ formatDateId(review.createdAt) }}
      </span>
    </div>
  </div>
</template>
