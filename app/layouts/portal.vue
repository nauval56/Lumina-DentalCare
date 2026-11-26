<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { formatDateId } from '~/utils/format'

const auth = useAuthStore()
const route = useRoute()
const mobileDrawerOpen = ref(false)
const sidebarCollapsed = ref(false)

interface NavItem {
  label: string
  to: string
  icon: string
  group: string
}

const navMenu = computed<NavItem[]>(() => {
  const role = auth.user?.role
  if (role === 'PATIENT') {
    return [
      { group: 'Layanan Pasien', label: 'Ringkasan Pasien', to: '/patient', icon: 'i-lucide-layout-dashboard' },
      { group: 'Layanan Pasien', label: 'Booking Appointment', to: '/patient/appointments', icon: 'i-lucide-calendar-plus' },
      { group: 'Rekam Medis & Biaya', label: 'Riwayat Medis & Odontogram', to: '/patient/medical-history', icon: 'i-lucide-file-heart' },
      { group: 'Rekam Medis & Biaya', label: 'Tagihan & Pembayaran', to: '/patient/payments', icon: 'i-lucide-credit-card' },
      { group: 'Akun', label: 'Profil & Keamanan', to: '/patient/profile', icon: 'i-lucide-user-cog' }
    ]
  }
  if (role === 'DOCTOR') {
    return [
      { group: 'Pelayanan Klinis', label: 'Dashboard & Antrean Dokter', to: '/doctor', icon: 'i-lucide-stethoscope' },
      { group: 'Pelayanan Klinis', label: 'Daftar Appointment Pasien', to: '/doctor/appointments', icon: 'i-lucide-calendar-clock' },
      { group: 'Dokumentasi Medis', label: 'Treatment Record SOAP & Resep', to: '/doctor/medical-records', icon: 'i-lucide-clipboard-list' },
      { group: 'Dokumentasi Medis', label: 'Peta Odontogram FDI', to: '/doctor/odontogram', icon: 'i-lucide-heart-pulse' }
    ]
  }
  if (role === 'RECEPTIONIST') {
    return [
      { group: 'Meja Depan', label: 'Operasional Harian', to: '/receptionist', icon: 'i-lucide-building-2' },
      { group: 'Meja Depan', label: 'Registrasi & Data Pasien', to: '/receptionist/patients', icon: 'i-lucide-users' },
      { group: 'Jadwal & Antrean', label: 'Manajemen Appointment', to: '/receptionist/appointments', icon: 'i-lucide-calendar' },
      { group: 'Jadwal & Antrean', label: 'Check-In & Nomor Antrean', to: '/receptionist/queues', icon: 'i-lucide-list-ordered' },
      { group: 'Kasir Klinik', label: 'Pencatatan Pembayaran Langsung', to: '/receptionist/payments', icon: 'i-lucide-receipt' }
    ]
  }
  return [
    { group: 'Ringkasan', label: 'Overview & Analitik', to: '/admin', icon: 'i-lucide-bar-chart-3' },
    { group: 'Data Master Klinik', label: 'Manajemen Pasien', to: '/admin/patients', icon: 'i-lucide-users' },
    { group: 'Data Master Klinik', label: 'Manajemen Dokter', to: '/admin/doctors', icon: 'i-lucide-user-check' },
    { group: 'Data Master Klinik', label: 'Layanan & Tarif', to: '/admin/services', icon: 'i-lucide-clipboard-check' },
    { group: 'Operasional & Farmasi', label: 'Jadwal & Tanggal Libur', to: '/admin/schedules', icon: 'i-lucide-calendar-days' },
    { group: 'Operasional & Farmasi', label: 'Manajemen Appointment', to: '/admin/appointments', icon: 'i-lucide-calendar-check' },
    { group: 'Operasional & Farmasi', label: 'Stok Obat & Batch FEFO', to: '/admin/inventory', icon: 'i-lucide-package-check' },
    { group: 'Keuangan & Sistem', label: 'Invoice & Pesanan Obat', to: '/admin/payments', icon: 'i-lucide-wallet' },
    { group: 'Keuangan & Sistem', label: 'Laporan Operasional', to: '/admin/reports', icon: 'i-lucide-file-spreadsheet' },
    { group: 'Keuangan & Sistem', label: 'Pengguna & Pengaturan', to: '/admin/settings', icon: 'i-lucide-settings' }
  ]
})

const groupedNavMenu = computed(() => {
  const groups: Array<{ name: string; items: NavItem[] }> = []
  for (const item of navMenu.value) {
    const existing = groups.find((g) => g.name === item.group)
    if (existing) {
      existing.items.push(item)
    } else {
      groups.push({ name: item.group, items: [item] })
    }
  }
  return groups
})

function handleEscapeKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && mobileDrawerOpen.value) {
    mobileDrawerOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscapeKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscapeKey)
})

watch(
  () => route.fullPath,
  () => {
    mobileDrawerOpen.value = false
  }
)
</script>

<template>
  <div class="min-h-screen bg-[#F4F9F9] flex flex-col lg:flex-row">
    <!-- Designed Collapsible Desktop Sidebar matched with Figma Lumina/Sidebar -->
    <aside
      class="hidden lg:flex lg:flex-col bg-white border-r border-[#D8E6E8] shrink-0 sticky top-0 h-screen transition-all"
      :class="sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'"
    >
      <div class="p-4 border-b border-[#D8E6E8] flex items-center justify-between gap-2">
        <NuxtLink to="/" class="flex items-center gap-3 min-w-0">
          <img
            src="/images/lumina-logo.png"
            alt="Logo Lumina Dental Care"
            width="40"
            height="40"
            class="w-10 h-10 rounded-md object-contain bg-white p-0.5 border border-[#D8E6E8] shrink-0"
          >
          <div v-if="!sidebarCollapsed" class="min-w-0">
            <span class="font-heading font-bold text-base text-[#0B253A] block leading-tight truncate">
              Lumina Dental
            </span>
            <span class="text-xs font-semibold text-[#137A7F] truncate block">
              {{ auth.user?.roleName || 'Portal Klinik' }}
            </span>
          </div>
        </NuxtLink>

        <button
          type="button"
          class="p-2.5 min-h-11 min-w-11 rounded-lg border border-[#D8E6E8] text-slate-600 hover:bg-[#EAF5F6] inline-flex items-center justify-center"
          :aria-expanded="!sidebarCollapsed"
          :aria-label="sidebarCollapsed ? 'Perluas sidebar navigasi' : 'Ringkaskan sidebar navigasi'"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <UIcon
            :name="sidebarCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
            class="w-4 h-4"
            aria-hidden="true"
          />
        </button>
      </div>

      <nav class="flex-1 p-3 space-y-4 overflow-y-auto" aria-label="Menu Portal">
        <div v-for="grp in groupedNavMenu" :key="grp.name" class="space-y-1">
          <p
            v-if="!sidebarCollapsed"
            class="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1"
          >
            {{ grp.name }}
          </p>
          <NuxtLink
            v-for="item in grp.items"
            :key="item.to"
            :to="item.to"
            :aria-label="item.label"
            :title="sidebarCollapsed ? item.label : undefined"
            class="flex items-center gap-3 px-4 py-2.5 min-h-11 rounded-md text-sm transition-colors"
            :class="
              route.path === item.to
                ? 'bg-[#DFF1F2] text-[#137A7F] font-bold'
                : 'text-[#0B253A] hover:bg-[#EAF5F6] font-medium'
            "
          >
            <UIcon :name="item.icon" class="w-5 h-5 shrink-0" aria-hidden="true" />
            <span v-if="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
          </NuxtLink>
        </div>
      </nav>

      <div class="p-3 border-t border-[#D8E6E8] space-y-2">
        <div v-if="!sidebarCollapsed" class="px-3 py-2.5 rounded-md bg-[#EAF5F6] flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-full bg-[#137A7F] text-white font-bold text-sm flex items-center justify-center shrink-0"
          >
            {{ auth.user?.fullName?.slice(0, 1) || 'L' }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-[#0B253A] truncate">{{ auth.user?.fullName }}</p>
            <p class="text-[11px] text-slate-600 truncate">{{ auth.user?.email }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2" :class="sidebarCollapsed ? 'flex-col' : ''">
          <NuxtLink
            to="/"
            aria-label="Kembali ke Website Publik"
            class="flex-1 w-full inline-flex items-center justify-center py-2.5 px-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs font-semibold text-[#0B253A] hover:bg-[#EAF5F6]"
          >
            <span v-if="!sidebarCollapsed">Website Publik</span>
            <UIcon v-else name="i-lucide-globe" class="w-4 h-4" aria-hidden="true" />
          </NuxtLink>
          <button
            type="button"
            aria-label="Keluar dari akun"
            class="flex-1 w-full inline-flex items-center justify-center py-2.5 px-2 min-h-11 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold transition-colors"
            @click="auth.logout()"
          >
            <span v-if="!sidebarCollapsed">Keluar</span>
            <UIcon v-else name="i-lucide-log-out" class="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content Column (reserves bottom space pb-20 on mobile for bottom nav per R-03) -->
    <div class="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
      <header
        class="sticky top-0 z-30 bg-white border-b border-[#D8E6E8] h-[68px] px-5 lg:px-8 flex items-center justify-between gap-4"
      >
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-[#0B253A] text-xs font-semibold"
            :aria-expanded="mobileDrawerOpen"
            aria-label="Buka drawer menu portal"
            @click="mobileDrawerOpen = true"
          >
            <UIcon name="i-lucide-menu" class="w-5 h-5" aria-hidden="true" />
            <span>Menu</span>
          </button>
          <div class="flex flex-col gap-0.5">
            <span class="text-[11px] font-bold text-[#137A7F]">
              {{ auth.user?.roleName || 'Portal Klinik' }} · {{ navMenu.find((n) => n.to === route.path)?.label || 'Ringkasan' }}
            </span>
            <span class="text-[12px] font-medium text-[#475569] hidden sm:block">
              {{ formatDateId(new Date()) }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-4">

          <div class="hidden md:flex flex-col items-end gap-0.5">
            <span class="text-[13px] font-bold text-[#0B253A]">{{ auth.user?.fullName }}</span>
            <span class="text-[11px] font-semibold text-[#475569]">{{ auth.user?.role }}</span>
          </div>
          <button
            type="button"
            class="lg:hidden px-3.5 py-2 min-h-11 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold"
            @click="auth.logout()"
          >
            Keluar
          </button>
        </div>
      </header>

      <main class="flex-1 px-5 lg:px-8 pt-7 pb-8 max-w-[1160px] w-full mx-auto">
        <slot />
      </main>
    </div>

    <!-- Mobile Drawer (closable with Escape & backdrop click per R-26, R-32) -->
    <div
      v-if="mobileDrawerOpen"
      class="fixed inset-0 z-50 lg:hidden flex"
      role="dialog"
      aria-modal="true"
      aria-label="Menu navigasi portal"
    >
      <div class="fixed inset-0 bg-[#0B253A]/50" @click="mobileDrawerOpen = false" />
      <div class="relative w-72 max-w-full bg-white h-full flex flex-col z-10 p-5">
        <div class="flex items-center justify-between pb-4 border-b border-[#D8E6E8]">
          <span class="font-heading font-bold text-base text-[#0B253A]">
            {{ auth.user?.roleName || 'Menu Portal' }}
          </span>
          <button
            type="button"
            class="p-2.5 min-h-11 min-w-11 rounded-md text-slate-600 hover:bg-[#EAF5F6] inline-flex items-center justify-center"
            aria-label="Tutup menu portal"
            @click="mobileDrawerOpen = false"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <nav class="flex-1 py-4 space-y-3 overflow-y-auto" aria-label="Menu Portal Mobile">
          <div v-for="grp in groupedNavMenu" :key="grp.name" class="space-y-1">
            <p class="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {{ grp.name }}
            </p>
            <NuxtLink
              v-for="item in grp.items"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-4 py-3 min-h-11 rounded-md text-sm font-medium"
              :class="
                route.path === item.to
                  ? 'bg-[#DFF1F2] text-[#137A7F] font-bold'
                  : 'text-[#0B253A] hover:bg-[#EAF5F6]'
              "
            >
              <UIcon :name="item.icon" class="w-5 h-5" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </div>
        </nav>
      </div>
    </div>

    <!-- Mobile Bottom Navigation with 44px minimum height targets (R-03) -->
    <nav
      class="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#D8E6E8] grid"
      :style="{ gridTemplateColumns: `repeat(${Math.min(navMenu.length, 5)}, minmax(0, 1fr))` }"
      aria-label="Navigasi Bawah Mobile"
    >
      <NuxtLink
        v-for="item in navMenu.slice(0, 5)"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center py-2 px-1 min-h-12 text-[11px] font-medium"
        :class="route.path === item.to ? 'text-[#137A7F] font-bold bg-[#DFF1F2]/70' : 'text-slate-600'"
      >
        <UIcon :name="item.icon" class="w-5 h-5 mb-0.5" aria-hidden="true" />
        <span class="truncate max-w-full">{{ item.label.split(' ')[0] }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>
