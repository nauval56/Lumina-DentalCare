<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const mobileMenuOpen = ref(false)
const route = useRoute()

const navItems = [
  { label: 'Beranda', to: '/', match: ['/'] },
  { label: 'Layanan', to: '/services', match: ['/services'] },
  { label: 'Tentang Kami', to: '/about', match: ['/about'] },
  { label: 'Tim Dokter', to: '/doctors', match: ['/doctors'] },
  { label: 'Artikel', to: '/articles', match: ['/articles'] },
  { label: 'Ulasan & Kontak', to: '/reviews', match: ['/reviews', '/contact'] }
]

function isActive(item: { match: string[] }) {
  return item.match.some((m) => (m === '/' ? route.path === '/' : route.path.startsWith(m)))
}

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false
  }
)
</script>

<template>
  <header class="bg-[#EAF5F6] sticky top-0 z-40">
    <div class="max-w-[1440px] mx-auto h-[84px] px-5 lg:px-16 flex items-center justify-between gap-4">
      <NuxtLink to="/" class="flex items-center gap-3 shrink-0">
        <img src="/figma/logo.svg" alt="" width="40" height="40" class="size-10">
        <span class="flex flex-col gap-px">
          <span class="font-heading font-bold text-[18px] text-[#0B253A] leading-normal">Lumina Dental Care</span>
          <span class="text-[11px] font-medium text-[#475569] leading-normal">Klinik Gigi Spesialis · Pontianak</span>
        </span>
      </NuxtLink>

      <nav class="hidden lg:flex items-center gap-[22px]" aria-label="Navigasi Utama">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="text-[13px] whitespace-nowrap"
          :class="
            isActive(item)
              ? 'bg-[#DFF1F2] text-[#137A7F] font-bold rounded-full px-4 py-2'
              : 'text-[#0B253A] font-medium'
          "
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="hidden sm:flex items-center gap-3 shrink-0">
        <NuxtLink
          v-if="auth.isAuthenticated && auth.user"
          :to="auth.portalHomePath"
          class="bg-white border border-[#D8E6E8] rounded-full px-4 py-[9px] text-[12px] font-semibold text-[#0B253A]"
        >
          Portal {{ auth.user.roleName }}
        </NuxtLink>
        <NuxtLink
          v-else
          to="/auth/login"
          class="bg-white border border-[#D8E6E8] rounded-full px-4 py-[9px] text-[12px] font-semibold text-[#0B253A]"
        >
          Masuk Portal
        </NuxtLink>
        <NuxtLink
          to="/patient/appointments"
          class="bg-[#137A7F] hover:bg-[#0E5F63] rounded-full px-5 py-3 flex items-center gap-[10px] text-[13px] font-semibold text-white transition-colors"
        >
          <span>Booking Appointment</span>
          <img src="/figma/calendar-arrow.svg" alt="" width="16" height="16" class="size-4">
        </NuxtLink>
      </div>

      <button
        type="button"
        class="lg:hidden inline-flex items-center gap-2 px-4 min-h-11 rounded-md bg-white border border-[#D8E6E8] text-[#0B253A] text-xs font-semibold"
        :aria-expanded="mobileMenuOpen"
        aria-controls="mobile-primary-nav"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <UIcon :name="mobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'" class="w-5 h-5" aria-hidden="true" />
        <span>Menu</span>
      </button>
    </div>

    <div
      v-if="mobileMenuOpen"
      id="mobile-primary-nav"
      class="lg:hidden bg-[#EAF5F6] border-t border-[#D8E6E8] px-5 py-4 space-y-1.5"
    >
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center px-4 min-h-11 rounded-md text-[13px]"
        :class="isActive(item) ? 'bg-[#DFF1F2] text-[#137A7F] font-bold' : 'text-[#0B253A] font-medium'"
      >
        {{ item.label }}
      </NuxtLink>
      <div class="pt-3 flex flex-col gap-2">
        <NuxtLink
          :to="auth.isAuthenticated && auth.user ? auth.portalHomePath : '/auth/login'"
          class="flex items-center justify-center min-h-11 rounded-md bg-white border border-[#D8E6E8] text-[#0B253A] text-[12px] font-semibold"
        >
          {{ auth.isAuthenticated && auth.user ? `Portal ${auth.user.roleName}` : 'Masuk Portal' }}
        </NuxtLink>
        <NuxtLink
          to="/patient/appointments"
          class="flex items-center justify-center min-h-11 rounded-md bg-[#137A7F] text-white text-[13px] font-semibold"
        >
          Booking Appointment
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
