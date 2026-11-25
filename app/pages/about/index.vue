<script setup lang="ts">
const facilities = [
  '✓ Ruang Tindakan Dental Unit Modern & Radiografi Digital',
  '✓ Sterilisasi Instrumen Autoklaf Kelas B 3 Tahap',
  '✓ Peta Gigi Odontogram FDI 52 Nomor & Diagnosis ICD-10',
  '✓ Farmasi Klinik Terintegrasi Ledger FEFO'
]
</script>

<template>
  <div class="bg-[#F4F9F9] min-h-full">
    <div class="max-w-[1440px] mx-auto px-5 lg:px-20 pt-9 pb-14 flex flex-col gap-9">
      <!-- AboutHero (Figma 02. Tentang Klinik) -->
      <section class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-8 flex flex-col lg:flex-row lg:items-start justify-between gap-8">
        <div class="flex-1 min-w-0 flex flex-col gap-[10px]">
          <p class="text-[12px] font-bold text-[#137A7F]">
            TENTANG LUMINA DENTAL CARE · PONTIANAK
          </p>
          <h1 class="font-heading font-bold text-[24px] sm:text-[28px] text-[#0B253A] max-w-[740px]">
            Perawatan Gigi Terpersonalisasi dengan Empati &amp; Teknologi Klinis
          </h1>
          <p class="text-[14px] text-[#475569] max-w-[740px]">
            Klinik gigi satu cabang dengan standar sterilisasi autoklaf kelas B, rekam medis SOAP, peta Odontogram FDI 52 gigi, dan farmasi FEFO.
          </p>
        </div>

        <NuxtLink
          to="/patient/appointments"
          class="bg-[#137A7F] hover:bg-[#0E5F63] rounded-full px-[22px] py-3 min-h-11 inline-flex items-center justify-center text-[13px] font-semibold text-white shrink-0 transition-colors"
        >
          Booking Kunjungan
        </NuxtLink>
      </section>

      <!-- VisiMisiRow (Figma 02. Tentang Klinik) -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white border border-[#D8E6E8] rounded-lg p-6 flex flex-col gap-[10px]">
          <p class="text-[11px] font-bold text-[#137A7F]">
            VISI KLINIK
          </p>
          <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
            Menjadi Pusat Perawatan Gigi Keluarga &amp; Spesialis Rujukan
          </h2>
          <p class="text-[13px] text-[#475569]">
            Menghadirkan perawatan gigi minim nyeri dengan transparansi rekam medis digital yang dapat diakses pasien setiap saat.
          </p>
        </div>

        <div class="bg-white border border-[#D8E6E8] rounded-lg p-6 flex flex-col gap-[10px]">
          <p class="text-[11px] font-bold text-[#137A7F]">
            MISI, NILAI PELAYANAN &amp; FASILITAS
          </p>
          <div class="text-[13px] text-[#0B253A] space-y-1.5">
            <p v-for="item in facilities" :key="item">
              {{ item }}
            </p>
          </div>
        </div>
      </section>

      <!-- Galeri Fasilitas & Ruang Klinis -->
      <section class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <p class="text-[11px] font-bold text-[#137A7F]">GALERI FASILITAS KLINIK</p>
          <h2 class="font-heading font-bold text-[22px] text-[#0B253A]">
            Suasana Ruang Tindakan, Sterilisasi &amp; Konsultasi Pasien
          </h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <figure class="bg-white border border-[#D8E6E8] rounded-lg overflow-hidden flex flex-col">
            <img
              src="/images/hero-dental-clinic.jpg"
              alt="Suite perawatan gigi modern dengan pencahayaan alami"
              width="480"
              height="270"
              loading="lazy"
              class="w-full h-[200px] object-cover"
            >
            <figcaption class="p-4 flex flex-col gap-1">
              <strong class="font-heading text-[14px] text-[#0B253A]">Suite Perawatan Nyaman</strong>
              <span class="text-[12px] text-[#475569]">Desain ruang perawatan privat bernuansa mint dengan pencahayaan alami.</span>
            </figcaption>
          </figure>

          <figure class="bg-white border border-[#D8E6E8] rounded-lg overflow-hidden flex flex-col">
            <img
              src="/images/treatment-room-autoclave.jpg"
              alt="Dental unit digital dan area sterilisasi autoklaf kelas B"
              width="480"
              height="270"
              loading="lazy"
              class="w-full h-[200px] object-cover"
            >
            <figcaption class="p-4 flex flex-col gap-1">
              <strong class="font-heading text-[14px] text-[#0B253A]">Dental Unit &amp; Autoklaf Kelas B</strong>
              <span class="text-[12px] text-[#475569]">Sterilisasi instrumen tersegel dan pemantauan kamera intraoral digital.</span>
            </figcaption>
          </figure>

          <figure class="bg-white border border-[#D8E6E8] rounded-lg overflow-hidden flex flex-col">
            <img
              src="/images/patient-smile-care.jpg"
              alt="Konsultasi ramah dokter gigi dan pasien di Lumina Dental Care"
              width="480"
              height="270"
              loading="lazy"
              class="w-full h-[200px] object-cover"
            >
            <figcaption class="p-4 flex flex-col gap-1">
              <strong class="font-heading text-[14px] text-[#0B253A]">Konsultasi Komunikatif</strong>
              <span class="text-[12px] text-[#475569]">Penjelasan kondisi gigi dan rencana perawatan yang jelas sebelum tindakan.</span>
            </figcaption>
          </figure>
        </div>
      </section>
    </div>
  </div>
</template>
