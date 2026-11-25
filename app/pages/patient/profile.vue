<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'portal' })

const auth = useAuthStore()
const toast = useClinicToast()

const { data: patientList, refresh } = await useFetch('/api/patients')
const patient = computed(() => patientList.value?.items?.[0] ?? null)

const profileForm = reactive({
  fullName: '',
  nik: '',
  phone: '',
  gender: 'LAKI_LAKI',
  dateOfBirth: '',
  bloodType: '',
  address: '',
  allergies: '',
  emergencyContact: '',
  emergencyPhone: ''
})

watch(
  patient,
  (val) => {
    if (val) {
      profileForm.fullName = val.fullName || ''
      profileForm.nik = val.nik || ''
      profileForm.phone = val.phone || ''
      profileForm.gender = val.gender || 'LAKI_LAKI'
      profileForm.dateOfBirth = val.dateOfBirth ? String(val.dateOfBirth).slice(0, 10) : ''
      profileForm.bloodType = val.bloodType || ''
      profileForm.address = val.address || ''
      profileForm.allergies = val.allergies || ''
      profileForm.emergencyContact = val.emergencyContact || ''
      profileForm.emergencyPhone = val.emergencyPhone || ''
    }
  },
  { immediate: true }
)

const savingProfile = ref(false)
async function saveProfile() {
  if (!patient.value) return
  savingProfile.value = true
  try {
    await $fetch(`/api/patients/${patient.value.id}`, {
      method: 'PATCH',
      body: profileForm
    })
    await auth.fetchMe()
    await refresh()
    toast.success('Profil Diperbarui', 'Data pribadi dan informasi medis Anda berhasil disimpan.')
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Profil',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Periksa kembali input Anda.'
    )
  } finally {
    savingProfile.value = false
  }
}

const pwdForm = reactive({
  currentPassword: '',
  newPassword: ''
})
const savingPwd = ref(false)
async function updatePassword() {
  savingPwd.value = true
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: pwdForm
    })
    toast.success('Kata Sandi Diubah', res.message)
    pwdForm.currentPassword = ''
    pwdForm.newPassword = ''
  } catch (err: unknown) {
    toast.error(
      'Gagal Mengubah Kata Sandi',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  } finally {
    savingPwd.value = false
  }
}
</script>

<template>
  <!-- Figma 18. Patient Profil & Keamanan (/patient/profile) -->
  <div class="flex flex-col gap-[22px]">
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col gap-1.5">
      <span class="text-[11px] font-bold uppercase text-[#137A7F]">
        PENGATURAN AKUN &amp; DATA PASIEN
      </span>
      <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
        Profil Pribadi &amp; Keamanan Akun
      </h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Form Data Pribadi -->
      <form class="lg:col-span-8 bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4" @submit.prevent="saveProfile">
        <div class="flex items-center justify-between pb-3 border-b border-[#D8E6E8]">
          <h2 class="font-heading font-bold text-[16px] text-[#0B253A]">Data Pribadi &amp; Kontak Darurat</h2>
          <span v-if="patient" class="px-3 py-1 rounded-md bg-[#DFF1F2] text-[11px] font-bold text-[#137A7F]">
            No. RM: {{ patient.medicalRecordNo }}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              v-model="profileForm.fullName"
              type="text"
              required
              class="w-full px-3.5 py-2.5 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">NIK (16 Digit)</label>
            <input
              v-model="profileForm.nik"
              type="text"
              maxlength="16"
              class="w-full px-3.5 py-2.5 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nomor Telepon</label>
            <input
              v-model="profileForm.phone"
              type="text"
              required
              class="w-full px-3.5 py-2.5 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
            <input
              v-model="profileForm.dateOfBirth"
              type="date"
              class="w-full px-3.5 py-2.5 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Golongan Darah</label>
            <input
              v-model="profileForm.bloodType"
              type="text"
              placeholder="A / B / AB / O"
              class="w-full px-3.5 py-2.5 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
          <input
            v-model="profileForm.address"
            type="text"
            class="w-full px-3.5 py-2.5 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            Riwayat Alergi Obat / Makanan (Penting bagi Dokter Gigi)
          </label>
          <input
            v-model="profileForm.allergies"
            type="text"
            placeholder="Contoh: Alergi Penisilin / Tidak ada alergi"
            class="w-full px-3.5 py-2.5 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Kontak Darurat</label>
            <input
              v-model="profileForm.emergencyContact"
              type="text"
              class="w-full px-3.5 py-2.5 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Telepon Kontak Darurat</label>
            <input
              v-model="profileForm.emergencyPhone"
              type="text"
              class="w-full px-3.5 py-2.5 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button
            type="submit"
            :disabled="savingProfile"
            class="px-[22px] py-3 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold transition-colors"
          >
            {{ savingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil' }}
          </button>
        </div>
      </form>

      <!-- Ubah Kata Sandi -->
      <form class="lg:col-span-4 bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4 self-start" @submit.prevent="updatePassword">
        <h2 class="font-heading font-bold text-[16px] text-[#0B253A]">Ubah Kata Sandi</h2>

        <div>
          <label class="block text-[12px] font-semibold text-[#0B253A] mb-1">Kata Sandi Saat Ini</label>
          <input
            v-model="pwdForm.currentPassword"
            type="password"
            required
            class="w-full px-4 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-[13px]"
          >
        </div>

        <div>
          <label class="block text-[12px] font-semibold text-[#0B253A] mb-1">
            Kata Sandi Baru (Min. 8 karakter)
          </label>
          <input
            v-model="pwdForm.newPassword"
            type="password"
            required
            minlength="8"
            class="w-full px-4 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-[13px]"
          >
        </div>

        <button
          type="submit"
          :disabled="savingPwd"
          class="w-full py-3 min-h-11 rounded-md bg-[#0B253A] hover:bg-[#137A7F] text-white text-[13px] font-semibold transition-colors"
        >
          {{ savingPwd ? 'Memperbarui...' : 'Perbarui Kata Sandi' }}
        </button>
      </form>
    </div>
  </div>
</template>
