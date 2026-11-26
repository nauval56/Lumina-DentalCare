<script setup lang="ts">
import { formatDateId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const search = ref('')
const { data, pending, refresh } = await useFetch('/api/patients', {
  query: computed(() => ({ search: search.value }))
})
const toast = useClinicToast()

const showForm = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)

const form = reactive({
  fullName: '',
  nik: '',
  email: '',
  phone: '',
  gender: 'LAKI_LAKI' as 'LAKI_LAKI' | 'PEREMPUAN',
  dateOfBirth: '',
  bloodType: '',
  address: '',
  allergies: '',
  emergencyContact: '',
  emergencyPhone: '',
  createPortalAccount: true,
  password: ''
})

function openCreate() {
  editingId.value = null
  form.fullName = ''
  form.nik = ''
  form.email = ''
  form.phone = ''
  form.gender = 'LAKI_LAKI'
  form.dateOfBirth = ''
  form.bloodType = ''
  form.address = ''
  form.allergies = ''
  form.emergencyContact = ''
  form.emergencyPhone = ''
  form.createPortalAccount = true
  form.password = ''
  showForm.value = true
}

function openEdit(p: Record<string, unknown>) {
  editingId.value = String(p.id)
  form.fullName = String(p.fullName || '')
  form.nik = String(p.nik || '')
  form.email = String(p.email || '')
  form.phone = String(p.phone || '')
  form.gender = (p.gender as 'LAKI_LAKI' | 'PEREMPUAN') || 'LAKI_LAKI'
  form.dateOfBirth = p.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : ''
  form.bloodType = String(p.bloodType || '')
  form.address = String(p.address || '')
  form.allergies = String(p.allergies || '')
  form.emergencyContact = String(p.emergencyContact || '')
  form.emergencyPhone = String(p.emergencyPhone || '')
  form.createPortalAccount = false
  form.password = ''
  showForm.value = true
}

async function savePatient() {
  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/patients/${editingId.value}`, {
        method: 'PATCH',
        body: form
      })
      toast.success('Pasien Diperbarui', 'Data pasien berhasil diperbarui.')
    } else {
      const res = await $fetch<{ patient: { medicalRecordNo: string } }>('/api/patients', {
        method: 'POST',
        body: form
      })
      toast.success('Pasien Terdaftar', `Nomor Rekam Medis: ${res.patient.medicalRecordNo}`)
    }
    showForm.value = false
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Pasien',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Duplikasi data terdeteksi.'
    )
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- Figma 24. Receptionist Registrasi Pasien Baru (/receptionist/patients) -->
  <div class="flex flex-col gap-[22px]">
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold uppercase text-[#137A7F]">
          PENDAFTARAN &amp; PENCARIAN PASIEN (ANTI-DUPLIKASI NIK / TELEPON)
        </span>
        <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
          Manajemen Data Pasien Klinik
        </h1>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="w-64">
          <CommonSearchInput v-model="search" placeholder="Cari No. RM, nama, NIK, HP..." />
        </div>
        <button
          type="button"
          class="px-5 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold shrink-0 transition-colors"
          @click="openCreate"
        >
          + Tambah Pasien
        </button>
      </div>
    </div>

    <!-- Form Tambah / Edit Pasien -->
    <form
      v-if="showForm"
      class="lumina-card p-6 space-y-4 border-[#D8E6E8]"
      @submit.prevent="savePatient"
    >
      <div class="flex items-center justify-between pb-3 border-b border-[#D8E6E8]">
        <div>
          <span class="text-[11px] font-bold uppercase text-[#137A7F]">
            {{ editingId ? 'PEMBARUAN DATA PASIEN' : 'REGISTRASI PASIEN BARU & SINKRONISASI PORTAL' }}
          </span>
          <h2 class="font-heading font-bold text-base text-[#0B253A]">
            {{ editingId ? 'Edit Data Pasien' : 'Registrasi Pasien Baru (Setara Pendaftaran Publik + Nomor RM)' }}
          </h2>
        </div>
        <button
          type="button"
          class="px-3 py-1.5 min-h-11 rounded-md border border-[#D8E6E8] text-xs font-semibold text-[#475569] hover:bg-[#EAF5F6]"
          @click="showForm = false"
        >
          Tutup
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">Nama Lengkap KTP *</label>
          <input
            v-model="form.fullName"
            type="text"
            required
            minlength="3"
            placeholder="Sesuai KTP"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">NIK (16 Digit, Opsional)</label>
          <input
            v-model="form.nik"
            type="text"
            maxlength="16"
            placeholder="617101xxxxxxxxxx"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">
            Alamat Email {{ !editingId && form.createPortalAccount ? '*' : '' }}
          </label>
          <input
            v-model="form.email"
            type="email"
            :required="!editingId && form.createPortalAccount"
            placeholder="nama@email.id"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">Telepon / WhatsApp *</label>
          <input
            v-model="form.phone"
            type="tel"
            required
            placeholder="0812xxxxxxxx"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">Jenis Kelamin</label>
          <select
            v-model="form.gender"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm bg-white"
          >
            <option value="LAKI_LAKI">Laki-laki</option>
            <option value="PEREMPUAN">Perempuan</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">Tanggal Lahir</label>
          <input
            v-model="form.dateOfBirth"
            type="date"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">Golongan Darah</label>
          <input
            v-model="form.bloodType"
            type="text"
            maxlength="5"
            placeholder="A / B / AB / O"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-[#0B253A] mb-1">Alamat Domisili</label>
        <input
          v-model="form.address"
          type="text"
          placeholder="Alamat lengkap di Pontianak / sekitarnya"
          class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
        >
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">Riwayat Alergi Obat / Makanan</label>
          <input
            v-model="form.allergies"
            type="text"
            placeholder="Misal: Penisilin / Tidak ada"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">Nama Kontak Darurat</label>
          <input
            v-model="form.emergencyContact"
            type="text"
            placeholder="Keluarga terdekat"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">No. HP Kontak Darurat</label>
          <input
            v-model="form.emergencyPhone"
            type="tel"
            placeholder="0812xxxxxxxx"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-[#0B253A] mb-1">
          Kata Sandi {{ !editingId ? '*' : '' }} (Min. 8 karakter kombinasi huruf &amp; angka)
        </label>
        <input
          v-model="form.password"
          type="password"
          :required="!editingId"
          minlength="8"
          pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
          title="Kata sandi minimal 8 karakter dan wajib mengandung kombinasi huruf serta angka"
          autocomplete="new-password"
          placeholder="Minimal 8 karakter (huruf & angka)"
          class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] bg-white text-sm"
        >
      </div>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs font-semibold"
          @click="showForm = false"
        >
          Batal
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="px-5 py-2 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
        >
          {{ saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan Data' : 'Daftarkan Pasien & Sinkronkan' }}
        </button>
      </div>
    </form>

    <CommonLoadingSkeleton v-if="pending" :rows="4" />

    <div v-else class="lumina-card overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase bg-[#EAF5F6]/60">
            <th class="py-3.5 px-4">No. Rekam Medis</th>
            <th class="py-3.5 px-4">Nama & NIK</th>
            <th class="py-3.5 px-4">Kontak</th>
            <th class="py-3.5 px-4">Tgl Lahir & Alergi</th>
            <th class="py-3.5 px-4 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#D8E6E8]/60">
          <tr v-for="p in data?.items || []" :key="p.id">
            <td class="py-3.5 px-4 font-mono text-xs font-bold text-[#137A7F]">
              {{ p.medicalRecordNo }}
            </td>
            <td class="py-3.5 px-4">
              <div class="font-semibold text-[#0B253A]">{{ p.fullName }}</div>
              <div class="text-xs text-[#475569]">NIK: {{ p.nik || '-' }}</div>
            </td>
            <td class="py-3.5 px-4 text-xs">
              <div class="font-medium text-[#0B253A]">{{ p.phone }}</div>
              <div class="text-[#475569]">{{ p.email || '-' }}</div>
            </td>
            <td class="py-3.5 px-4 text-xs">
              <div>{{ formatDateId(p.dateOfBirth) }}</div>
              <div v-if="p.allergies" class="text-rose-600 font-semibold">
                Alergi: {{ p.allergies }}
              </div>
            </td>
            <td class="py-3.5 px-4 text-right">
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg border border-[#D8E6E8] text-xs font-semibold hover:bg-[#F4F9F9]"
                @click="openEdit(p)"
              >
                Edit
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
