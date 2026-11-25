<script setup lang="ts">
const { data, pending, refresh } = await useFetch('/api/reviews')
const { data: settingsData } = await useFetch('/api/settings')
const toast = useClinicToast()
const submitting = ref(false)

const form = reactive({
  patientName: '',
  serviceName: 'Scaling & Polishing Ultrasonik',
  rating: 5,
  comment: ''
})

async function submitReview() {
  submitting.value = true
  try {
    await $fetch('/api/reviews', {
      method: 'POST',
      body: form
    })
    toast.success('Ulasan Berhasil Dikirim', 'Terima kasih atas masukan Anda.')
    form.patientName = ''
    form.comment = ''
    form.rating = 5
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Mengirim Ulasan',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Periksa kembali isian Anda.'
    )
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="bg-[#F4F9F9] min-h-full">
    <div class="max-w-[1440px] mx-auto px-5 lg:px-20 pt-9 pb-14">
      <!-- Split (Figma 09. Ulasan Pasien & Kontak Klinik) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-7 items-start">
        <!-- ReviewsCard -->
        <section class="bg-white border border-[#D8E6E8] rounded-lg p-7 flex flex-col gap-4">
          <div class="space-y-1">
            <p class="text-[12px] font-bold text-[#137A7F]">
              TESTIMONI &amp; ULASAN PASIEN TERVERIFIKASI
            </p>
            <h1 class="font-heading font-bold text-[22px] text-[#0B253A]">
              Suara Pasien Lumina Dental Care
            </h1>
          </div>

          <CommonLoadingSkeleton v-if="pending" :rows="2" />
          <div v-else-if="(data?.items || []).length" class="space-y-3">
            <LandingReviewCard
              v-for="rev in (data?.items || []).slice(0, 6)"
              :key="rev.id"
              :review="rev"
            />
          </div>
          <p v-else class="text-[13px] text-[#475569]">
            Belum ada ulasan pasien tercatat. Bagikan pengalaman perawatan Anda di bawah ini.
          </p>

          <form class="flex flex-col gap-3 pt-4 border-t border-[#D8E6E8]" @submit.prevent="submitReview">
            <h2 class="font-heading font-bold text-[16px] text-[#0B253A]">
              Tulis Ulasan &amp; Penilaian Bintang Anda
            </h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex flex-col gap-[6px]">
                <label for="rev-patient-name" class="text-[12px] font-semibold text-[#0B253A]">
                  Nama Lengkap *
                </label>
                <input
                  id="rev-patient-name"
                  v-model="form.patientName"
                  type="text"
                  required
                  placeholder="Nama Anda"
                  class="bg-white border border-[#D8E6E8] rounded-md px-4 py-2.5 min-h-11 text-[13px] text-[#0B253A]"
                >
              </div>
              <div class="flex flex-col gap-[6px]">
                <label for="rev-service-name" class="text-[12px] font-semibold text-[#0B253A]">
                  Layanan yang Diterima
                </label>
                <input
                  id="rev-service-name"
                  v-model="form.serviceName"
                  type="text"
                  class="bg-white border border-[#D8E6E8] rounded-md px-4 py-2.5 min-h-11 text-[13px] text-[#0B253A]"
                >
              </div>
            </div>

            <div class="flex flex-col gap-[6px]">
              <span class="text-[12px] font-semibold text-[#0B253A]">
                Penilaian Bintang ({{ form.rating }} / 5 Bintang)
              </span>
              <div class="flex items-center gap-1.5">
                <button
                  v-for="star in 5"
                  :key="star"
                  type="button"
                  :aria-label="`Beri ${star} bintang`"
                  class="p-2 min-h-11 min-w-11 rounded-md border flex items-center justify-center transition-colors"
                  :class="
                    star <= form.rating
                      ? 'bg-[#FFFBEB] border-amber-300 text-amber-500'
                      : 'bg-white border-[#D8E6E8] text-[#D8E6E8] hover:text-amber-400'
                  "
                  @click="form.rating = star"
                >
                  <svg viewBox="0 0 20 20" width="20" height="20" class="size-5" fill="currentColor" aria-hidden="true">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-[6px]">
              <label for="rev-comment" class="text-[12px] font-semibold text-[#0B253A]">
                Bagikan Pengalaman Perawatan Anda *
              </label>
              <input
                id="rev-comment"
                v-model="form.comment"
                type="text"
                required
                minlength="10"
                placeholder="Dokter ramah dan ruang tindakan sangat bersih."
                class="bg-white border border-[#D8E6E8] rounded-md px-4 py-2.5 min-h-11 text-[13px] text-[#0B253A]"
              >
            </div>
            <button
              type="submit"
              :disabled="submitting"
              class="self-start bg-[#137A7F] hover:bg-[#0E5F63] rounded-md px-[22px] py-2.5 min-h-11 text-[13px] font-semibold text-white transition-colors"
            >
              {{ submitting ? 'Mengirim...' : 'Kirim Ulasan Pasien' }}
            </button>
          </form>
        </section>

        <!-- ContactCard -->
        <section class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-7 flex flex-col gap-[14px]">
          <p class="text-[12px] font-bold text-[#137A7F]">
            ALAMAT, JAM OPERASIONAL &amp; PETA LOKASI
          </p>
          <h2 class="font-heading font-bold text-[22px] text-[#0B253A]">
            Hubungi Klinik Lumina Dental Care
          </h2>
          <div class="text-[13px] text-[#0B253A] space-y-1">
            <p>Alamat: {{ settingsData?.setting?.address || 'Jl. Prof. M. Yamin No. 88, Pontianak Selatan' }}</p>
            <p>Telepon: {{ settingsData?.setting?.phone || '(0561) 765 432' }} · WhatsApp: {{ settingsData?.setting?.whatsapp || '0812-5678-9012' }}</p>
            <p>Email Resmi: {{ settingsData?.setting?.email || 'dentalcarelumina@gmail.com' }}</p>
            <p>Jam Operasional: Senin - Jumat (08:00 - 20:00 WIB) · Sabtu (08:00 - 16:00 WIB)</p>
          </div>
          <NuxtLink
            to="/contact"
            class="self-start bg-[#137A7F] hover:bg-[#0E5F63] rounded-md px-[22px] py-2.5 min-h-11 inline-flex items-center justify-center text-[13px] font-semibold text-white transition-colors"
          >
            Hubungi Resepsionis
          </NuxtLink>
        </section>
      </div>
    </div>
  </div>
</template>
