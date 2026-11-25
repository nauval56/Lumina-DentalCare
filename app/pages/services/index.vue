<script setup lang="ts">
import { formatRupiah } from '~/utils/format'

const { data, pending } = await useFetch('/api/services')
const selectedCategory = ref('SEMUA')
const activeService = ref<Record<string, unknown> | null>(null)

const categories = computed(() => {
  const list = (data.value?.items || []).map((s: { category: string }) => s.category)
  return ['SEMUA', ...Array.from(new Set(list))]
})

const filteredServices = computed(() => {
  return (data.value?.items || []).filter((s: { category: string }) =>
    selectedCategory.value === 'SEMUA' || s.category === selectedCategory.value
  )
})

const servicePhotoPool = [
  '/images/treatment-room-autoclave.jpg',
  '/images/patient-smile-care.jpg',
  '/images/hero-dental-clinic.jpg',
  '/images/lead-doctor-amanda.jpg'
]

function getServicePhoto(srv: { imageUrl?: string | null; category?: string }, idx: number) {
  if (srv.imageUrl) return srv.imageUrl
  const cat = (srv.category || '').toLowerCase()
  if (cat.includes('konservasi') || cat.includes('bedah')) return '/images/treatment-room-autoclave.jpg'
  if (cat.includes('estetika') || cat.includes('anak')) return '/images/patient-smile-care.jpg'
  if (cat.includes('ortodonti')) return '/images/hero-dental-clinic.jpg'
  return servicePhotoPool[idx % servicePhotoPool.length]
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && activeService.value) {
    activeService.value = null
  }
}

onMounted(() => window.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', handleEscape))
</script>

<template>
  <div class="bg-[#F4F9F9] min-h-full">
    <div class="max-w-[1440px] mx-auto px-5 lg:px-20 pt-9 pb-14 flex flex-col gap-9">
      <!-- Header (Figma 03. Katalog Layanan & Tarif) -->
      <div class="flex flex-col gap-[6px]">
        <p class="text-[12px] font-bold text-[#137A7F]">
          KATALOG TINDAKAN &amp; TARIF TRANSPARAN (IDR)
        </p>
        <h1 class="font-heading font-bold text-[24px] sm:text-[28px] text-[#0B253A]">
          Layanan Perawatan Gigi Ramah Keluarga &amp; Spesialis
        </h1>
      </div>

      <!-- CategoryPills (Figma 03) -->
      <div class="flex flex-wrap items-center gap-[10px]">
        <button
          v-for="cat in categories"
          :key="cat"
          type="button"
          class="px-4 py-[9px] min-h-11 rounded-md text-[12px] font-semibold transition-colors"
          :class="
            selectedCategory === cat
              ? 'bg-[#137A7F] text-white'
              : 'bg-white border border-[#D8E6E8] text-[#0B253A] hover:bg-[#EAF5F6]'
          "
          @click="selectedCategory = cat"
        >
          {{ cat === 'SEMUA' ? 'Semua Layanan' : cat }}
        </button>
      </div>

      <CommonLoadingSkeleton v-if="pending" :rows="4" />

      <CommonEmptyState
        v-else-if="filteredServices.length === 0"
        title="Layanan Tidak Ditemukan"
        description="Pilih kategori layanan lainnya untuk melihat daftar tindakan."
      />

      <!-- ServiceGrid (Figma 03 Lumina/ServiceCard) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <article
          v-for="(srv, idx) in filteredServices"
          :key="srv.id"
          class="bg-white border border-[#D8E6E8] rounded-lg overflow-hidden flex flex-col justify-between"
        >
          <div>
            <img
              :src="getServicePhoto(srv, idx)"
              :alt="`Ilustrasi layanan ${srv.name}`"
              width="420"
              height="180"
              loading="lazy"
              class="w-full h-[170px] object-cover border-b border-[#D8E6E8]"
            >
            <div class="p-6 pb-3 flex flex-col gap-3">
              <div class="flex items-center gap-3">
                <span class="bg-[#DFF1F2] rounded-full size-9 shrink-0 flex items-center justify-center">
                  <img src="/figma/clipboard.svg" alt="" width="20" height="20" class="size-5">
                </span>
                <span class="text-[11px] font-bold text-[#137A7F] uppercase">
                  {{ srv.category }}
                </span>
              </div>
              <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
                {{ srv.name }}
              </h2>
              <p class="text-[13px] text-[#475569]">
                {{ srv.shortDesc }}
              </p>
            </div>
          </div>

          <div class="px-6 pb-6 flex items-center justify-between gap-2 pt-2">
            <p class="font-heading font-semibold text-[14px] text-[#137A7F]">
              {{ formatRupiah(srv.price) }} · {{ srv.durationMinutes }} Menit
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="px-3.5 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white hover:bg-[#EAF5F6] text-[12px] font-semibold text-[#0B253A]"
                @click="activeService = srv"
              >
                Detail
              </button>
              <NuxtLink
                :to="`/patient/appointments?serviceId=${srv.id}`"
                class="px-4 py-2 min-h-11 inline-flex items-center rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-[12px] font-semibold text-white"
              >
                Booking
              </NuxtLink>
            </div>
          </div>
        </article>
      </div>

      <!-- Modal Detail Layanan -->
      <div
        v-if="activeService"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Rincian Prosedur Layanan"
      >
        <div class="bg-white border border-[#D8E6E8] rounded-lg max-w-lg w-full p-6 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <span class="text-[11px] font-bold text-[#137A7F] uppercase">{{ activeService.category }}</span>
              <h3 class="font-heading font-bold text-[20px] text-[#0B253A] mt-0.5">
                {{ activeService.name }}
              </h3>
            </div>
            <button
              type="button"
              class="p-2.5 min-h-11 min-w-11 rounded-md text-[#475569] hover:bg-[#EAF5F6] inline-flex items-center justify-center"
              aria-label="Tutup dialog rincian layanan"
              @click="activeService = null"
            >
              <UIcon name="i-lucide-x" class="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <p class="text-[13px] text-[#475569] leading-relaxed">
            {{ activeService.description }}
          </p>

          <div class="grid grid-cols-2 gap-3 p-4 rounded-md bg-[#EAF5F6] border border-[#D8E6E8] text-sm">
            <div>
              <span class="text-[11px] font-bold text-[#137A7F] block">Biaya Tindakan</span>
              <strong class="text-[#0B253A] font-bold">{{ formatRupiah(Number(activeService.price || 0)) }}</strong>
            </div>
            <div>
              <span class="text-[11px] font-bold text-[#137A7F] block">Durasi Perawatan</span>
              <strong class="text-[#0B253A]">{{ activeService.durationMinutes }} Menit</strong>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="px-4 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-[12px] font-semibold text-[#0B253A]"
              @click="activeService = null"
            >
              Tutup
            </button>
            <NuxtLink
              :to="`/patient/appointments?serviceId=${activeService.id}`"
              class="inline-flex items-center px-5 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[12px] font-semibold"
            >
              Jadwalkan Layanan Ini
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
