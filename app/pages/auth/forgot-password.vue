<script setup lang="ts">
const email = ref('')
const loading = ref(false)
const submitted = ref(false)
const emailSent = ref(false)
const maskedEmail = ref('')
const message = ref('')
const emailNote = ref('')
const devResetUrl = ref('')
const devToken = ref('')
const toast = useClinicToast()

async function submitForgot() {
  loading.value = true
  submitted.value = false
  message.value = ''
  emailNote.value = ''
  devResetUrl.value = ''
  devToken.value = ''
  try {
    const res = await $fetch<{
      success: boolean
      emailSent: boolean
      maskedEmail: string
      message: string
      emailNote?: string
      resetUrlDevPreview?: string
      resetTokenDevPreview?: string
    }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value }
    })
    submitted.value = true
    emailSent.value = res.emailSent
    maskedEmail.value = res.maskedEmail
    message.value = res.message
    emailNote.value = res.emailNote || ''
    devResetUrl.value = res.resetUrlDevPreview || ''
    devToken.value = res.resetTokenDevPreview || ''

    if (res.emailSent) {
      toast.success('Terkirim ke Gmail', `Tautan ubah password telah dikirim ke ${res.maskedEmail}`)
    } else {
      toast.info('Permintaan Diproses', res.message)
    }
  } catch (err: unknown) {
    toast.error(
      'Gagal Memproses',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- Figma 12. Lupa Kata Sandi via Gmail SMTP (/auth/forgot-password) -->
  <div class="bg-[#EAF5F6] min-h-full py-9 px-5 lg:px-20 flex flex-col items-center">
    <div class="bg-white border border-[#D8E6E8] rounded-lg p-7 sm:p-9 w-full max-w-[520px] flex flex-col gap-4 items-start">
      <span class="bg-[#DFF1F2] border border-[#D8E6E8] rounded-full px-[14px] py-[6px] text-[11px] font-bold text-[#137A7F]">
        GMAIL SMTP · TOKEN SHA-256 · TTL 30 MENIT
      </span>
      <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
        Lupa Kata Sandi
      </h1>
      <p class="text-[13px] text-[#475569]">
        Masukkan email akun Anda. Tautan atur ulang kata sandi akan dikirim melalui Gmail SMTP resmi klinik.
      </p>

      <div
        v-if="submitted && emailSent"
        class="w-full p-4 rounded-md bg-[#ECFDF5] border border-[#D8E6E8] text-[12px] text-[#15803D] space-y-2"
      >
        <p class="font-bold">Email Reset Password Telah Dikirim ke Gmail ({{ maskedEmail }})</p>
        <p>{{ message }}</p>
      </div>

      <div
        v-else-if="submitted && !emailSent"
        class="w-full p-4 rounded-md bg-[#FFFBEB] border border-[#D8E6E8] text-[12px] text-[#B45309] space-y-2"
      >
        <p class="font-bold">Token Reset Dibuat (Menunggu Konfigurasi Gmail SMTP)</p>
        <p v-if="emailNote">{{ emailNote }}</p>
        <NuxtLink
          v-if="devResetUrl || devToken"
          :to="`/auth/reset-password?token=${encodeURIComponent(devToken)}`"
          class="inline-flex items-center justify-center w-full py-2.5 px-4 min-h-11 rounded-md bg-[#137A7F] text-white font-semibold text-[12px]"
        >
          Buka Tautan Reset Password (Simulasi Development)
        </NuxtLink>
      </div>

      <form class="w-full flex flex-col gap-4" @submit.prevent="submitForgot">
        <div class="flex flex-col gap-[6px]">
          <label for="forgot-email" class="text-[12px] font-semibold text-[#0B253A]">
            Email Akun Terdaftar *
          </label>
          <input
            id="forgot-email"
            v-model="email"
            type="email"
            required
            placeholder="dentalcarelumina@gmail.com"
            class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
          >
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            :disabled="loading"
            class="bg-[#137A7F] hover:bg-[#0E5F63] rounded-full px-[22px] py-3 min-h-11 text-[13px] font-semibold text-white transition-colors"
          >
            {{ loading ? 'Mengirim...' : 'Kirim Tautan Reset Password' }}
          </button>
          <NuxtLink
            to="/auth/login"
            class="bg-white border border-[#D8E6E8] hover:bg-[#EAF5F6] rounded-full px-[22px] py-3 min-h-11 inline-flex items-center text-[13px] font-semibold text-[#0B253A]"
          >
            Kembali ke Login
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>
