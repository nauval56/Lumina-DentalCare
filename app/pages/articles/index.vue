<script setup lang="ts">
const { data, pending } = await useFetch('/api/articles')

const articlePhotoPool = [
  '/images/patient-smile-care.jpg',
  '/images/treatment-room-autoclave.jpg',
  '/images/hero-dental-clinic.jpg',
  '/images/lead-doctor-amanda.jpg'
]

function getArticlePhoto(art: { coverImage?: string | null; imageUrl?: string | null }, idx: number) {
  return art.coverImage || art.imageUrl || articlePhotoPool[idx % articlePhotoPool.length]
}
</script>

<template>
  <div class="bg-[#F4F9F9] min-h-full">
    <div class="max-w-[1440px] mx-auto px-5 lg:px-20 pt-9 pb-14 flex flex-col gap-9">
      <!-- Head (Figma 07. Artikel Kesehatan Gigi) -->
      <div class="flex flex-col gap-[6px]">
        <p class="text-[12px] font-bold text-[#137A7F]">
          BLOG &amp; EDUKASI KESEHATAN GIGI
        </p>
        <h1 class="font-heading font-bold text-[24px] sm:text-[28px] text-[#0B253A]">
          Artikel Medis Ditinjau oleh Tim Dokter Spesialis
        </h1>
      </div>

      <CommonLoadingSkeleton v-if="pending" :rows="3" />

      <CommonEmptyState
        v-else-if="!(data?.items || []).length"
        title="Belum Ada Artikel"
        description="Artikel edukasi kesehatan gigi akan segera tersedia."
      />

      <!-- ArticlesRow (Figma 07) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article
          v-for="(art, idx) in data?.items || []"
          :key="art.id"
          class="bg-white border border-[#D8E6E8] rounded-lg overflow-hidden flex flex-col justify-between"
        >
          <div>
            <img
              :src="getArticlePhoto(art, idx)"
              :alt="`Ilustrasi artikel ${art.title}`"
              width="420"
              height="190"
              loading="lazy"
              class="w-full h-[180px] object-cover border-b border-[#D8E6E8]"
            >
            <div class="p-6 pb-3 flex flex-col gap-3 items-start">
              <span class="bg-[#DFF1F2] border border-[#D8E6E8] rounded-md px-3 py-1.5 text-[11px] font-bold text-[#137A7F] uppercase">
                {{ art.category }}
              </span>
              <h2 class="font-heading font-bold text-[17px] text-[#0B253A]">
                {{ art.title }}
              </h2>
              <p class="text-[13px] text-[#475569]">
                {{ art.excerpt }}
              </p>
            </div>
          </div>
          <div class="px-6 pb-6 pt-2">
            <NuxtLink
              :to="`/articles/${art.slug}`"
              class="bg-white border border-[#D8E6E8] hover:bg-[#EAF5F6] rounded-md px-4 py-[9px] min-h-11 inline-flex items-center justify-center text-[12px] font-semibold text-[#0B253A] transition-colors"
            >
              Baca Artikel Lengkap
            </NuxtLink>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
