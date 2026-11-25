<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const toast = useClinicToast()
const errorMessage = ref('')

const form = reactive({
  fullName: '',
  email: '',
  phone: '',
  nik: '',
  gender: 'LAKI_LAKI' as 'LAKI_LAKI' | 'PEREMPUAN',
  dateOfBirth: '',
  address: '',
  password: ''
})

async function handleRegister() {
  errorMessage.value = ''
  try {
    const res = await auth.register(form)
    toast.success('Registrasi Berhasil', `Nomor Rekam Medis Anda: ${res.user.patientId ? 'Telah Aktif' : 'Terdaftar'}`)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/patient')
      ? route.query.redirect
      : '/patient'
    await navigateTo(redirect)
  } catch (err: unknown) {
    errorMessage.value =
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage ||
      'Registrasi gagal. Periksa kembali data Anda.'
  }
}
</script>

<template>
  <!-- Figma 11. Registrasi Mandiri Pasien Baru (/auth/register) -->
  <div class="bg-[#EAF5F6] min-h-full py-9 px-5 lg:px-20 flex flex-col items-center">
    <div class="bg-white border border-[#D8E6E8] rounded-lg p-7 sm:p-9 w-full max-w-[600px] flex flex-col gap-4 items-start">
      <span class="bg-[#DFF1F2] border border-[#D8E6E8] rounded-full px-[14px] py-[6px] text-[11px] font-bold text-[#137A7F]">
        KHUSUS PASIEN BARU · NO. RM OTOMATIS
      </span>
      <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
        Registrasi Mandiri Pasien Baru
      </h1>
      <p class="text-[13px] text-[#475569]">
        Daftarkan diri Anda untuk mendapatkan Nomor Rekam Medis digital dan kemudahan booking appointment.
      </p>

      <div
        v-if="errorMessage"
        class="w-full p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[12px] font-medium"
      >
        {{ errorMessage }}
      </div>

      <form class="w-full flex flex-col gap-3.5" @submit.prevent="handleRegister">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div class="flex flex-col gap-[6px]">
            <label for="reg-fullname" class="text-[12px] font-semibold text-[#0B253A]">Nama Lengkap Sesuai KTP *</label>
            <input
              id="reg-fullname"
              v-model="form.fullName"
              type="text"
              required
              minlength="3"
              placeholder="Contoh: Budi Santoso"
              class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
            >
          </div>
          <div class="flex flex-col gap-[6px]">
            <label for="reg-nik" class="text-[12px] font-semibold text-[#0B253A]">NIK (16 Digit, Opsional)</label>
            <input
              id="reg-nik"
              v-model="form.nik"
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
              v-model="form.email"
              type="email"
              required
              placeholder="nama@email.id"
              class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
            >
          </div>
          <div class="flex flex-col gap-[6px]">
            <label for="reg-phone" class="text-[12px] font-semibold text-[#0B253A]">Nomor Telepon / WhatsApp *</label>
            <input
              id="reg-phone"
              v-model="form.phone"
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
              v-model="form.gender"
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
              v-model="form.dateOfBirth"
              type="date"
              class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
            >
          </div>
        </div>

        <div class="flex flex-col gap-[6px]">
          <label for="reg-address" class="text-[12px] font-semibold text-[#0B253A]">Alamat Domisili</label>
          <input
            id="reg-address"
            v-model="form.address"
            type="text"
            placeholder="Alamat lengkap"
            class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
          >
        </div>

        <div class="flex flex-col gap-[6px]">
          <label for="reg-password" class="text-[12px] font-semibold text-[#0B253A]">
            Kata Sandi * (Min. 8 karakter kombinasi huruf &amp; angka)
          </label>
          <input
            id="reg-password"
            v-model="form.password"
            type="password"
            required
            minlength="8"
            placeholder="Minimal 8 karakter"
            class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
          >
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            :disabled="auth.loading"
            class="bg-[#137A7F] hover:bg-[#0E5F63] rounded-full px-[22px] py-3 min-h-11 text-[13px] font-semibold text-white transition-colors"
          >
            {{ auth.loading ? 'Mendaftarkan Akun...' : 'Buat Akun Pasien & Masuk' }}
          </button>
          <NuxtLink
            to="/auth/login"
            class="bg-white border border-[#D8E6E8] hover:bg-[#EAF5F6] rounded-full px-[22px] py-3 min-h-11 inline-flex items-center text-[13px] font-semibold text-[#0B253A]"
          >
            Masuk Akun
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>
