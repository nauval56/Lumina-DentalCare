<script setup lang="ts">
const { data } = await useFetch('/api/settings')
</script>

<template>
  <div class="bg-[#F4F9F9] min-h-full">
    <div class="max-w-[1440px] mx-auto px-5 lg:px-20 pt-9 pb-14 flex flex-col gap-9">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-7 items-stretch">
        <!-- ContactCard (Figma 09) -->
        <section class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-7 flex flex-col justify-between gap-4">
          <div class="flex flex-col gap-[14px]">
            <p class="text-[12px] font-bold text-[#137A7F]">
              ALAMAT, JAM OPERASIONAL &amp; PETA LOKASI
            </p>
            <h1 class="font-heading font-bold text-[24px] sm:text-[28px] text-[#0B253A]">
              Hubungi Klinik Lumina Dental Care
            </h1>
            <div class="text-[13px] text-[#0B253A] space-y-1.5">
              <p><strong>Alamat:</strong> {{ data?.setting?.address || 'Jl. Prof. M. Yamin No. 88, Pontianak Selatan' }}</p>
              <p><strong>Telepon:</strong> {{ data?.setting?.phone || '(0561) 765 432' }} · <strong>WhatsApp:</strong> {{ data?.setting?.whatsapp || '0812-5678-9012' }}</p>
              <p><strong>Email Resmi:</strong> {{ data?.setting?.email || 'dentalcarelumina@gmail.com' }}</p>
              <p><strong>Jam Operasional:</strong> Senin - Jumat (08:00 - 20:00 WIB) · Sabtu (08:00 - 16:00 WIB)</p>
            </div>
          </div>
          <NuxtLink
            to="/patient/appointments"
            class="self-start bg-[#137A7F] hover:bg-[#0E5F63] rounded-full px-[22px] py-3 min-h-11 inline-flex items-center justify-center text-[13px] font-semibold text-white transition-colors"
          >
            Booking Appointment
          </NuxtLink>
        </section>

        <!-- Peta Lokasi -->
        <section class="bg-white border border-[#D8E6E8] rounded-lg overflow-hidden min-h-[340px] flex flex-col">
          <iframe
            title="Peta Lokasi Lumina Dental Care di Pontianak Selatan"
            src="https://www.openstreetmap.org/export/embed.html?bbox=109.32%2C-0.05%2C109.36%2C-0.02&layer=mapnik"
            width="800"
            height="450"
            class="w-full flex-1 min-h-[340px] border-0"
            loading="lazy"
          />
        </section>
      </div>
    </div>
  </div>
</template>
