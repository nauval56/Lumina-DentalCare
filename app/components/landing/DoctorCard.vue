<script setup lang="ts">
import { formatRupiah, getDayNameId } from '~/utils/format'

defineProps<{
  doctor: {
    id: string
    titlePrefix?: string | null
    fullName: string
    titleSuffix?: string | null
    specialization: string
    bio?: string | null
    experienceYears?: number
    education?: string | null
    consultationFee?: number
    photoUrl?: string | null
    schedules?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
  }
}>()
</script>

<template>
  <!-- Matches Figma Lumina/DoctorCard: Soft Ice Mint avatar frame + specialization + teal checkmarks + pill CTA -->
  <article class="lumina-card lumina-card-hover overflow-hidden flex flex-col justify-between">
    <div>
      <div class="aspect-[4/3] bg-[#EAF5F6] relative overflow-hidden">
        <img
          :src="
            doctor.photoUrl ||
            'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80'
          "
          :alt="`Foto ${doctor.titlePrefix || ''} ${doctor.fullName}`"
          width="600"
          height="450"
          loading="lazy"
          class="w-full h-full object-cover"
        >
        <span
          v-if="doctor.experienceYears"
          class="absolute top-3 right-3 px-3 py-1 rounded-md bg-white text-[#137A7F] border border-[#D8E6E8] text-xs font-bold shadow-xs"
        >
          {{ doctor.experienceYears }} Tahun Praktik
        </span>
      </div>

      <div class="p-6 space-y-3">
        <div>
          <span class="text-xs font-bold text-[#137A7F] uppercase tracking-wider">
            {{ doctor.specialization }}
          </span>
          <h3 class="font-heading font-bold text-lg text-[#0B253A] mt-0.5">
            {{ doctor.titlePrefix }} {{ doctor.fullName }}{{ doctor.titleSuffix ? `, ${doctor.titleSuffix}` : '' }}
          </h3>
          <p v-if="doctor.education" class="text-xs text-slate-600 mt-0.5">
            {{ doctor.education }}
          </p>
        </div>

        <p v-if="doctor.bio" class="text-sm text-slate-600 line-clamp-3">
          {{ doctor.bio }}
        </p>

        <div v-if="doctor.schedules && doctor.schedules.length" class="pt-2">
          <p class="text-xs font-semibold text-[#0B253A] mb-1.5">Jadwal Praktik Aktif:</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="sch in doctor.schedules.slice(0, 4)"
              :key="`${sch.dayOfWeek}-${sch.startTime}`"
              class="px-2.5 py-1 rounded-md bg-[#EAF5F6] text-[#0B253A] text-[11px] font-medium"
            >
              {{ getDayNameId(sch.dayOfWeek) }} ({{ sch.startTime }}-{{ sch.endTime }})
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="px-6 pb-6 pt-3 border-t border-[#D8E6E8] flex items-center justify-between gap-3">
      <div>
        <span class="text-xs text-slate-600 block">Biaya Konsultasi</span>
        <strong class="text-sm font-bold text-[#0B253A]">
          {{ formatRupiah(doctor.consultationFee || 150000) }}
        </strong>
      </div>
      <NuxtLink
        :to="`/patient/appointments?doctorId=${doctor.id}`"
        class="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold transition-colors shadow-xs"
      >
        <UIcon name="i-lucide-calendar-plus" class="w-4 h-4" aria-hidden="true" />
        <span>Booking Jadwal</span>
      </NuxtLink>
    </div>
  </article>
</template>
