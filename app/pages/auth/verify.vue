<script setup lang="ts">
const route = useRoute()
const token = ref(String(route.query.token || ''))
const loading = ref(false)
const verified = ref(false)
const toast = useClinicToast()

async function handleVerify() {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/auth/verify-email', {
      method: 'POST',
      body: { token: token.value || undefined }
    })
    verified.value = true
    toast.success('Verifikasi Berhasil', res.message)
  } catch (err: unknown) {
    toast.error(
      'Gagal Verifikasi',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Token tidak valid.'
    )
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-[#EAF5F6] min-h-full py-9 px-5 lg:px-20 flex flex-col items-center">
    <div class="bg-white border border-[#D8E6E8] rounded-lg p-7 sm:p-9 w-full max-w-[520px] flex flex-col gap-4 items-start">
      <span class="bg-[#DFF1F2] border border-[#D8E6E8] rounded-full px-[14px] py-[6px] text-[11px] font-bold text-[#137A7F]">
        VERIFIKASI AKUN PENGGUNA
      </span>
      <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">Verifikasi Akun Pengguna</h1>
      <p class="text-[13px] text-[#475569]">
        Verifikasi alamat email Anda untuk mengaktifkan seluruh fitur notifikasi klinik.
      </p>

      <div v-if="verified" class="w-full p-4 rounded-md bg-[#ECFDF5] border border-[#D8E6E8] text-[#15803D] text-[13px] font-semibold">
        Akun Anda telah terverifikasi!
      </div>

      <div v-else class="w-full flex flex-col gap-3">
        <div class="flex flex-col gap-[6px]">
          <label for="verify-token" class="text-[12px] font-semibold text-[#0B253A]">
            Token Verifikasi (Opsional jika sudah login)
          </label>
          <input
            id="verify-token"
            v-model="token"
            type="text"
            placeholder="Masukkan token verifikasi"
            class="bg-white border border-[#D8E6E8] rounded-md px-4 py-3 min-h-11 text-[13px] text-[#0B253A]"
          >
        </div>
        <button
          type="button"
          :disabled="loading"
          class="self-start bg-[#137A7F] hover:bg-[#0E5F63] rounded-full px-[22px] py-3 min-h-11 text-white font-semibold text-[13px]"
          @click="handleVerify"
        >
          {{ loading ? 'Memverifikasi...' : 'Verifikasi Akun Sekarang' }}
        </button>
      </div>
    </div>
  </div>
</template>
