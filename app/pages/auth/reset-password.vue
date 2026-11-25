<script setup lang="ts">
const route = useRoute()
const token = ref(String(route.query.token || ''))
const hasTokenFromEmailLink = computed(() => Boolean(route.query.token))
const showManualToken = ref(!route.query.token)
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const toast = useClinicToast()

watch(
  () => route.query.token,
  (val) => {
    if (val) {
      token.value = String(val)
      showManualToken.value = false
    }
  }
)

async function submitReset() {
  if (newPassword.value !== confirmPassword.value) {
    toast.error('Konfirmasi Tidak Cocok', 'Kata sandi baru dan konfirmasi kata sandi harus sama.')
    return
  }

  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: {
        token: token.value,
        newPassword: newPassword.value
      }
    })
    toast.success('Password Berhasil Diubah', res.message)
    await navigateTo('/auth/login')
  } catch (err: unknown) {
    toast.error(
      'Gagal Mengubah Password',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage ||
        'Tautan atau token reset password tidak valid atau sudah kedaluwarsa.'
    )
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- Figma 13. Atur Ulang Kata Sandi Baru (/auth/reset-password) -->
  <div class="bg-[#EAF5F6] min-h-full py-9 px-5 lg:px-20 flex flex-col items-center">
    <div class="bg-white border border-[#D8E6E8] rounded-lg p-7 sm:p-9 w-full max-w-[520px] flex flex-col gap-4 items-start">
      <span class="bg-[#DFF1F2] border border-[#D8E6E8] rounded-full px-[14px] py-[6px] text-[11px] font-bold text-[#137A7F]">
        VERIFIKASI TOKEN RESET PASSWORD
      </span>
      <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
        Atur Ulang Kata Sandi Baru
      </h1>
      <p class="text-[13px] text-[#475569]">
        Buat kata sandi baru minimal 8 karakter dengan kombinasi huruf dan angka.
      </p>

      <div
        v-if="hasTokenFromEmailLink"
        class="w-full p-3.5 rounded-md bg-[#ECFDF5] border border-[#D8E6E8] flex items-center justify-between gap-3 text-[12px] text-[#15803D]"
      >
        <span class="font-semibold">Tautan Reset dari Gmail Terdeteksi</span>
        <button
          type="button"
          class="text-[11px] font-bold text-[#137A7F] hover:underline"
          @click="showManualToken = !showManualToken"
        >
          {{ showManualToken ? 'Sembunyikan Token' : 'Lihat Token' }}
        </button>
      </div>

      <form class="w-full flex flex-col gap-4" @submit.prevent="submitReset">
        <div v-if="showManualToken" class="flex flex-col gap-[6px]">
          <label for="reset-token" class="text-[12px] font-semibold text-[#0B253A]">Token Reset Email</label>
          <input
            id="reset-token"
            v-model="token"
            type="text"
            required
            placeholder="rst_9f82c41e7b3a40d1a8e2"
            class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] font-mono text-[#0B253A]"
          >
        </div>

        <div class="flex flex-col gap-[6px]">
          <label for="reset-new-pw" class="text-[12px] font-semibold text-[#0B253A]">Kata Sandi Baru *</label>
          <input
            id="reset-new-pw"
            v-model="newPassword"
            type="password"
            required
            minlength="8"
            placeholder="••••••••••••"
            class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
          >
        </div>

        <div class="flex flex-col gap-[6px]">
          <label for="reset-confirm-pw" class="text-[12px] font-semibold text-[#0B253A]">Konfirmasi Kata Sandi Baru *</label>
          <input
            id="reset-confirm-pw"
            v-model="confirmPassword"
            type="password"
            required
            minlength="8"
            placeholder="••••••••••••"
            class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
          >
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            :disabled="loading"
            class="bg-[#137A7F] hover:bg-[#0E5F63] rounded-full px-[22px] py-3 min-h-11 text-[13px] font-semibold text-white transition-colors"
          >
            {{ loading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru' }}
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
