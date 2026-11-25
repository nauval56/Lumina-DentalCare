<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const toast = useClinicToast()

const activeTab = ref<'LOGIN' | 'REGISTER'>(
  route.query.tab === 'register' ? 'REGISTER' : 'LOGIN'
)

const form = reactive({
  email: '',
  password: ''
})

const regForm = reactive({
  fullName: '',
  email: '',
  phone: '',
  nik: '',
  gender: 'LAKI_LAKI' as 'LAKI_LAKI' | 'PEREMPUAN',
  dateOfBirth: '',
  address: '',
  password: ''
})

const errorMessage = ref('')

const isBookingRedirect = computed(() =>
  typeof route.query.redirect === 'string' && route.query.redirect.includes('/patient/appointments')
)

const demoAccounts = [
  { label: 'Akun Demo 1 (Budi)', email: 'budi.santoso@email.id' },
  { label: 'Akun Demo 2 (drg. Amanda)', email: 'drg.amanda@luminadental.id' },
  { label: 'Akun Demo 3 (Siti)', email: 'resepsionis@luminadental.id' },
  { label: 'Akun Demo 4 (Nadya)', email: 'admin@luminadental.id' }
]

function fillDemo(email: string) {
  activeTab.value = 'LOGIN'
  form.email = email
  form.password = 'Lumina123!'
}

function resolveAfterAuthPath(userRole: string) {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  if (redirect && userRole === 'PATIENT' && redirect.startsWith('/patient')) {
    return redirect
  }
  return auth.portalHomePath
}

async function handleLogin() {
  errorMessage.value = ''
  try {
    const res = await auth.login({
      email: form.email,
      password: form.password
    })
    toast.success('Autentikasi Berhasil', `Selamat datang kembali, ${res.user.fullName}.`)
    await navigateTo(resolveAfterAuthPath(res.user.role))
  } catch (err: unknown) {
    errorMessage.value =
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage ||
      'Gagal masuk. Periksa kembali email dan kata sandi Anda.'
  }
}

async function handleRegister() {
  errorMessage.value = ''
  try {
    const res = await auth.register(regForm)
    toast.success(
      'Registrasi Pasien Berhasil',
      `Akun pasien Anda (${res.user.fullName}) telah aktif.`
    )
    const target = isBookingRedirect.value ? String(route.query.redirect) : '/patient'
    await navigateTo(target)
  } catch (err: unknown) {
    errorMessage.value =
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage ||
      'Registrasi gagal. Periksa kembali data Anda.'
  }
}
</script>

<template>
  <!-- Figma 10. Autentikasi Terpadu Login & Registrasi Pasien (/auth/login) -->
  <div class="bg-[#EAF5F6] min-h-full py-9 px-5 lg:px-20 flex flex-col items-center">
    <div class="bg-white border border-[#D8E6E8] rounded-lg p-7 sm:p-9 w-full max-w-[520px] flex flex-col gap-4 items-start">
      <!-- StatusBadge / Tab Switcher -->
      <div class="bg-[#DFF1F2] border border-[#D8E6E8] rounded-full p-1 inline-flex items-center gap-1">
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-md text-[11px] font-bold transition-colors"
          :class="activeTab === 'LOGIN' ? 'bg-[#137A7F] text-white' : 'text-[#137A7F] hover:bg-white/60'"
          @click="activeTab = 'LOGIN'; errorMessage = ''"
        >
          MASUK AKUN
        </button>
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-md text-[11px] font-bold transition-colors"
          :class="activeTab === 'REGISTER' ? 'bg-[#137A7F] text-white' : 'text-[#137A7F] hover:bg-white/60'"
          @click="activeTab = 'REGISTER'; errorMessage = ''"
        >
          REGISTRASI PASIEN BARU
        </button>
      </div>

      <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
        {{ activeTab === 'LOGIN' ? 'Masuk ke Lumina Dental Care' : 'Registrasi Mandiri Pasien Baru' }}
      </h1>

      <p class="text-[13px] text-[#475569]">
        {{
          activeTab === 'LOGIN'
            ? 'Satu halaman autentikasi terpadu (Masuk Semua Role & Registrasi Pasien). Sistem menentukan dashboard otomatis berdasarkan role akun.'
            : 'Registrasi khusus pasien baru dan otomatis menerbitkan Nomor Rekam Medis digital.'
        }}
      </p>

      <div
        v-if="isBookingRedirect"
        class="w-full p-3.5 rounded-md bg-[#EAF5F6] border border-[#D8E6E8] text-[#0B253A] text-[12px] font-medium"
      >
        <strong>Booking Appointment memerlukan akun pasien.</strong> Silakan masuk atau daftar sebagai pasien baru untuk melanjutkan pemesanan jadwal.
      </div>

      <div
        v-if="errorMessage"
        class="w-full p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[12px] font-medium"
      >
        {{ errorMessage }}
      </div>

      <!-- TAB 1: LOGIN TERPADU -->
      <form v-if="activeTab === 'LOGIN'" class="w-full flex flex-col gap-4" @submit.prevent="handleLogin">
        <div class="flex flex-col gap-[6px] w-full">
          <label for="login-email" class="text-[12px] font-semibold text-[#0B253A]">
            Alamat Email
          </label>
          <input
            id="login-email"
            v-model="form.email"
            type="email"
            required
            autocomplete="email"
            placeholder="dentalcarelumina@gmail.com"
            class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
          >
        </div>

        <div class="flex flex-col gap-[6px] w-full">
          <div class="flex items-center justify-between">
            <label for="login-password" class="text-[12px] font-semibold text-[#0B253A]">
              Kata Sandi
            </label>
            <NuxtLink to="/auth/forgot-password" class="text-[12px] font-semibold text-[#137A7F] hover:underline">
              Lupa Kata Sandi?
            </NuxtLink>
          </div>
          <input
            id="login-password"
            v-model="form.password"
            type="password"
            required
            autocomplete="current-password"
            placeholder="••••••••••••"
            class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
          >
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            :disabled="auth.loading"
            class="bg-[#137A7F] hover:bg-[#0E5F63] rounded-md px-[22px] py-3 min-h-11 text-[13px] font-semibold text-white transition-colors"
          >
            {{ auth.loading ? 'Memverifikasi...' : isBookingRedirect ? 'Masuk & Lanjutkan Booking' : 'Masuk Sekarang' }}
          </button>
        </div>

        <div class="pt-3 border-t border-[#D8E6E8] space-y-2 w-full">
          <p class="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
            [DATA DEMO SEED DEVELOPMENT] Sandi: Lumina123!
          </p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="acc in demoAccounts"
              :key="acc.email"
              type="button"
              class="p-2.5 min-h-11 rounded-md border border-[#D8E6E8] hover:border-[#137A7F] hover:bg-[#EAF5F6] text-left transition-colors"
              @click="fillDemo(acc.email)"
            >
              <span class="text-[12px] font-semibold text-[#0B253A] block">{{ acc.label }}</span>
              <span class="text-[11px] text-[#137A7F] block truncate">{{ acc.email }}</span>
            </button>
          </div>
        </div>
      </form>

      <!-- TAB 2: REGISTRASI KHUSUS PASIEN -->
      <form v-else class="w-full flex flex-col gap-3.5" @submit.prevent="handleRegister">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div class="flex flex-col gap-[6px]">
            <label for="reg-fullname" class="text-[12px] font-semibold text-[#0B253A]">Nama Lengkap KTP *</label>
            <input
              id="reg-fullname"
              v-model="regForm.fullName"
              type="text"
              required
              minlength="3"
              placeholder="Budi Santoso"
              class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
            >
          </div>
          <div class="flex flex-col gap-[6px]">
            <label for="reg-nik" class="text-[12px] font-semibold text-[#0B253A]">NIK (16 Digit, Opsional)</label>
            <input
              id="reg-nik"
              v-model="regForm.nik"
              type="text"
              maxlength="16"
              placeholder="617101xxxxxxxxxx"
              class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
            >
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div class="flex flex-col gap-[6px]">
            <label for="reg-email" class="text-[12px] font-semibold text-[#0B253A]">Alamat Email *</label>
            <input
              id="reg-email"
              v-model="regForm.email"
              type="email"
              required
              placeholder="nama@email.id"
              class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
            >
          </div>
          <div class="flex flex-col gap-[6px]">
            <label for="reg-phone" class="text-[12px] font-semibold text-[#0B253A]">Telepon / WhatsApp *</label>
            <input
              id="reg-phone"
              v-model="regForm.phone"
              type="tel"
              required
              placeholder="0812xxxxxxxx"
              class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
            >
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div class="flex flex-col gap-[6px]">
            <label for="reg-gender" class="text-[12px] font-semibold text-[#0B253A]">Jenis Kelamin</label>
            <select
              id="reg-gender"
              v-model="regForm.gender"
              class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
            >
              <option value="LAKI_LAKI">Laki-laki</option>
              <option value="PEREMPUAN">Perempuan</option>
            </select>
          </div>
          <div class="flex flex-col gap-[6px]">
            <label for="reg-dob" class="text-[12px] font-semibold text-[#0B253A]">Tanggal Lahir</label>
            <input
              id="reg-dob"
              v-model="regForm.dateOfBirth"
              type="date"
              class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
            >
          </div>
        </div>

        <div class="flex flex-col gap-[6px]">
          <label for="reg-address" class="text-[12px] font-semibold text-[#0B253A]">Alamat Domisili</label>
          <input
            id="reg-address"
            v-model="regForm.address"
            type="text"
            placeholder="Alamat lengkap di Pontianak / sekitarnya"
            class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
          >
        </div>

        <div class="flex flex-col gap-[6px]">
          <label for="reg-password" class="text-[12px] font-semibold text-[#0B253A]">
            Kata Sandi * (Min. 8 karakter kombinasi huruf &amp; angka)
          </label>
          <input
            id="reg-password"
            v-model="regForm.password"
            type="password"
            required
            minlength="8"
            placeholder="Minimal 8 karakter"
            class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
          >
        </div>

        <button
          type="submit"
          :disabled="auth.loading"
          class="self-start bg-[#137A7F] hover:bg-[#0E5F63] rounded-full px-[22px] py-3 min-h-11 text-[13px] font-semibold text-white transition-colors"
        >
          {{ auth.loading ? 'Mendaftarkan...' : isBookingRedirect ? 'Daftar & Lanjutkan Booking' : 'Daftar Akun Pasien & Masuk' }}
        </button>
      </form>
    </div>
  </div>
</template>
