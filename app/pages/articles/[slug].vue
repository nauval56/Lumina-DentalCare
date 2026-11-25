<script setup lang="ts">
import { formatDateId } from '~/utils/format'

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const { data, error } = await useFetch(() => `/api/articles/${slug.value}`)
</script>

<template>
  <div class="bg-[#F4F9F9] min-h-full">
    <div class="max-w-[1440px] mx-auto px-5 lg:px-20 pt-9 pb-14">
      <CommonErrorState
        v-if="error || !data?.article"
        message="Artikel yang Anda cari tidak ditemukan."
      />

      <!-- ArticleDetail (Figma 08. Detail Artikel Kesehatan Gigi) -->
      <article v-else class="bg-white border border-[#D8E6E8] rounded-lg p-7 sm:p-9 flex flex-col gap-4 items-start">
        <NuxtLink
          to="/articles"
          class="bg-white border border-[#D8E6E8] hover:bg-[#EAF5F6] rounded-full px-4 py-[9px] min-h-11 inline-flex items-center justify-center text-[12px] font-semibold text-[#0B253A] transition-colors"
        >
          Kembali ke Daftar Artikel
        </NuxtLink>

        <span class="bg-[#DFF1F2] border border-[#D8E6E8] rounded-full px-[14px] py-[6px] text-[11px] font-bold text-[#137A7F] uppercase">
          {{ data.article.category }}
        </span>

        <h1 class="font-heading font-bold text-[24px] sm:text-[28px] text-[#0B253A] max-w-[1100px]">
          {{ data.article.title }}
        </h1>

        <p class="text-[12px] font-semibold text-[#137A7F]">
          Dipublikasikan pada {{ formatDateId(data.article.publishedAt || data.article.createdAt) }}
        </p>

        <img
          :src="data.article.coverImage || '/images/patient-smile-care.jpg'"
          :alt="`Foto sampul artikel ${data.article.title}`"
          width="1140"
          height="360"
          class="w-full h-[220px] sm:h-[320px] object-cover rounded-md border border-[#D8E6E8]"
        >

        <div
          class="text-[15px] text-[#0B253A] leading-relaxed max-w-[1140px] space-y-4"
          v-html="data.article.content"
        />
      </article>
    </div>
  </div>
</template>
