<template>
  <section class="bg-[#EAF5F6] pt-6">
    <div class="max-w-[1440px] mx-auto px-5 lg:px-20 pt-7 pb-10 flex flex-col gap-8">
      <div class="flex flex-col lg:flex-row gap-12 items-center">
        <div class="flex-1 min-w-0 flex flex-col gap-[18px] items-start">
          <h1 class="font-heading font-bold text-[34px] sm:text-[46px] leading-normal">
            <span class="block text-[#0B253A]">Perawatan Gigi Ramah</span>
            <span class="block text-[#137A7F]">Keluarga &amp; Spesialis</span>
          </h1>
          <p class="text-[16px] text-[#475569] max-w-[540px]">
            Senyum cerah dimulai dari perawatan terbaik. Perawatan lembut untuk setiap senyuman dengan teknologi peta gigi Odontogram FDI 52 gigi &amp; rekam medis digital.
          </p>
          <div class="flex flex-wrap items-center gap-[14px]">
            <NuxtLink
              to="/patient/appointments"
              class="bg-[#137A7F] hover:bg-[#0E5F63] rounded-full pl-6 pr-[10px] py-[10px] flex items-center gap-4 text-[14px] font-semibold text-white transition-colors"
            >
              <span>Booking Appointment</span>
              <span class="bg-white rounded-full size-8 flex items-center justify-center">
                <img src="/figma/tooth.svg" alt="" width="20" height="20" class="size-5">
              </span>
            </NuxtLink>
            <NuxtLink
              to="/doctors"
              class="bg-white border border-[#D8E6E8] rounded-full px-[22px] py-3 text-[13px] font-semibold text-[#0B253A]"
            >
              Lihat Jadwal Dokter
            </NuxtLink>
          </div>
        </div>

        <div class="bg-[#DFF1F2] border border-[#D8E6E8] rounded-lg p-5 w-full lg:w-[540px] shrink-0 flex flex-col justify-between gap-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <span class="bg-[#DFF1F2] border border-[#D8E6E8] rounded-full px-[14px] py-[6px] text-[11px] font-bold text-[#137A7F]">
              KLINIK GIGI SPESIALIS · PONTIANAK
            </span>
            <span class="bg-[#ECFDF5] border border-[#D8E6E8] rounded-full px-[14px] py-[6px] text-[11px] font-bold text-[#15803D]">
              STERILISASI AUTOKLAF KELAS B
            </span>
          </div>
          <img
            src="/images/hero-dental-clinic.jpg"
            alt="Ruang perawatan modern Lumina Dental Care dengan pencahayaan alami"
            width="540"
            height="220"
            fetchpriority="high"
            class="w-full h-[210px] object-cover rounded-md border border-[#D8E6E8]"
          >
          <div class="bg-white border border-[#D8E6E8] rounded-lg p-4 flex items-center gap-4">
            <span class="bg-[#EAF5F6] rounded-full size-16 shrink-0 flex items-center justify-center">
              <img src="/figma/tooth.svg" alt="" width="20" height="20" class="size-5">
            </span>
            <span class="flex flex-col gap-1">
              <span class="font-heading font-bold text-[16px] text-[#0B253A]">Pemeriksaan Intraoral &amp; Peta Odontogram FDI</span>
              <span class="text-[12px] text-[#475569]">
                Dokter memeriksa kondisi 32 gigi permanen &amp; 20 gigi susu secara presisi dengan verifikasi slot jadwal otomatis.
              </span>
            </span>
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#D8E6E8] rounded-lg p-5 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center lg:justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="bg-[#EAF5F6] rounded-full size-9 flex items-center justify-center shrink-0">
            <img src="/figma/tooth.svg" alt="" width="20" height="20" class="size-5">
          </span>
          <span class="text-[14px] font-semibold text-[#0B253A]">Perawatan Minim Nyeri</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="bg-[#EAF5F6] rounded-full size-9 flex items-center justify-center shrink-0">
            <img src="/figma/shield.svg" alt="" width="20" height="20" class="size-5">
          </span>
          <span class="text-[14px] font-semibold text-[#0B253A]">Teknologi Odontogram FDI</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="bg-[#EAF5F6] rounded-full size-9 flex items-center justify-center shrink-0">
            <img src="/figma/user-md.svg" alt="" width="20" height="20" class="size-5">
          </span>
          <span class="text-[14px] font-semibold text-[#0B253A]">Dokter Gigi Spesialis</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="bg-[#EAF5F6] rounded-full size-9 flex items-center justify-center shrink-0">
            <img src="/figma/check.svg" alt="" width="18" height="18" class="size-[18px]">
          </span>
          <span class="text-[14px] font-semibold text-[#0B253A]">Tarif IDR Transparan</span>
        </div>
      </div>
    </div>
  </section>
</template>
