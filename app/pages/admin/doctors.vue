<script setup lang="ts">
import { formatRupiah } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const { data, pending, refresh } = await useFetch('/api/doctors', {
  query: { includeInactive: 'true' }
})
const toast = useClinicToast()

const showForm = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  email: '',
  fullName: '',
  titlePrefix: 'drg.',
  titleSuffix: 'Sp.KG',
  licenseNumber: '',
  specialization: 'Konservasi Gigi',
  experienceYears: 5,
  education: '',
  consultationFee: 200000,
  bio: '',
  isActive: true
})

function openCreateForm() {
  editingId.value = null
  form.email = ''
  form.fullName = ''
  form.titlePrefix = 'drg.'
  form.titleSuffix = 'Sp.KG'
  form.licenseNumber = ''
  form.specialization = 'Konservasi Gigi'
  form.experienceYears = 5
  form.education = ''
  form.consultationFee = 200000
  form.bio = ''
  form.isActive = true
  showForm.value = true
}

function openEditForm(doc: Record<string, unknown>) {
  editingId.value = String(doc.id)
  form.email = String((doc.user as Record<string, unknown>)?.email || '')
  form.fullName = String(doc.fullName || '')
  form.titlePrefix = String(doc.titlePrefix || 'drg.')
  form.titleSuffix = String(doc.titleSuffix || '')
  form.licenseNumber = String(doc.licenseNumber || '')
  form.specialization = String(doc.specialization || '')
  form.experienceYears = Number(doc.experienceYears || 5)
  form.education = String(doc.education || '')
  form.consultationFee = Number(doc.consultationFee || 0)
  form.bio = String(doc.bio || '')
  form.isActive = Boolean(doc.isActive)
  showForm.value = true
}

async function saveDoctor() {
  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/doctors/${editingId.value}`, {
        method: 'PATCH',
        body: {
          fullName: form.fullName,
          titlePrefix: form.titlePrefix,
          titleSuffix: form.titleSuffix || null,
          licenseNumber: form.licenseNumber,
          specialization: form.specialization,
          experienceYears: form.experienceYears,
          education: form.education || null,
          consultationFee: form.consultationFee,
          bio: form.bio || null,
          isActive: form.isActive
        }
      })
      toast.success('Dokter Diperbarui', 'Perubahan data dokter gigi berhasil disimpan.')
    } else {
      await $fetch('/api/doctors', {
        method: 'POST',
        body: form
      })
      toast.success('Dokter Ditambahkan', 'Data dokter dan jadwal default berhasil dibuat.')
    }
    showForm.value = false
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Dokter',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Periksa kembali input Anda.'
    )
  } finally {
    saving.value = false
  }
}

async function toggleActive(doc: { id: string; isActive: boolean }) {
  await $fetch(`/api/doctors/${doc.id}`, {
    method: 'PATCH',
    body: { isActive: !doc.isActive }
  })
  toast.info('Status Dokter Diperbarui', 'Status aktif dokter telah diubah.')
  await refresh()
}

async function deleteDoctor(doc: { id: string; fullName: string }) {
  if (import.meta.client && !window.confirm(`Hapus data dokter ${doc.fullName}?`)) {
    return
  }
  try {
    const res = await $fetch<{ message: string }>(`/api/doctors/${doc.id}`, {
      method: 'DELETE'
    })
    toast.success('Proses Berhasil', res.message)
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menghapus Dokter',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}
</script>

<template>
  <!-- Figma 29. Admin CRUD Dokter Gigi (/admin/doctors) -->
  <div class="flex flex-col gap-[22px]">
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold uppercase text-[#137A7F]">
          ADMIN · TENAGA MEDIS KLINIK (CRUD)
        </span>
        <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
          Manajemen Dokter Gigi &amp; Spesialisasi
        </h1>
      </div>
      <button
        type="button"
        class="px-5 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold transition-colors"
        @click="openCreateForm"
      >
        + Tambah Dokter Baru
      </button>
    </div>

    <form v-if="showForm" class="lumina-card p-6 space-y-4" @submit.prevent="saveDoctor">
      <div class="flex items-center justify-between">
        <h2 class="font-heading font-bold text-base text-[#0B253A]">
          {{ editingId ? 'Edit Data Dokter Gigi' : 'Tambah Dokter Gigi Baru' }}
        </h2>
        <button
          type="button"
          class="text-xs text-[#475569] hover:text-[#0B253A]"
          @click="showForm = false"
        >
          Tutup ✕
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Gelar Depan</label>
          <input
            v-model="form.titlePrefix"
            type="text"
            placeholder="drg."
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Dokter *</label>
          <input
            v-model="form.fullName"
            type="text"
            required
            placeholder="Nama Lengkap Dokter"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Gelar Spesialis</label>
          <input
            v-model="form.titleSuffix"
            type="text"
            placeholder="Mis: Sp.KG / Sp.Ort"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Nomor SIP *</label>
          <input
            v-model="form.licenseNumber"
            type="text"
            required
            placeholder="Nomor SIP Resmi"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div v-if="!editingId">
          <label class="block text-xs font-semibold text-slate-700 mb-1">Email Login Dokter *</label>
          <input
            v-model="form.email"
            type="email"
            required
            placeholder="dokter@luminadental.id"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Spesialisasi *</label>
          <input
            v-model="form.specialization"
            type="text"
            required
            placeholder="Spesialisasi"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Tarif Konsultasi (IDR) *</label>
          <input
            v-model.number="form.consultationFee"
            type="number"
            min="0"
            required
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Pengalaman (Tahun)</label>
          <input
            v-model.number="form.experienceYears"
            type="number"
            min="0"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Pendidikan / Universitas</label>
          <input
            v-model="form.education"
            type="text"
            placeholder="Fakultas Kedokteran Gigi"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Biografi Singkat Dokter</label>
        <textarea
          v-model="form.bio"
          rows="2"
          placeholder="Profil singkat pengalaman klinis dokter"
          class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
        />
      </div>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-md border border-[#D8E6E8] text-xs font-semibold"
          @click="showForm = false"
        >
          Batal
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="px-5 py-2 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
        >
          {{ saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Dokter Baru' }}
        </button>
      </div>
    </form>

    <CommonLoadingSkeleton v-if="pending" :rows="3" />

    <div v-else class="lumina-card overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase bg-[#EAF5F6]/60">
            <th class="py-3.5 px-4">Dokter</th>
            <th class="py-3.5 px-4">Nomor SIP</th>
            <th class="py-3.5 px-4">Spesialisasi</th>
            <th class="py-3.5 px-4">Tarif Konsultasi</th>
            <th class="py-3.5 px-4">Status</th>
            <th class="py-3.5 px-4 text-right">Aksi (CRUD)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#D8E6E8]/60">
          <tr v-for="doc in data?.items || []" :key="doc.id">
            <td class="py-3.5 px-4">
              <div class="font-semibold text-[#0B253A]">
                {{ doc.titlePrefix }} {{ doc.fullName }}{{ doc.titleSuffix ? `, ${doc.titleSuffix}` : '' }}
              </div>
              <div class="text-xs text-[#475569]">{{ doc.user?.email }}</div>
            </td>
            <td class="py-3.5 px-4 font-mono text-xs text-slate-700">{{ doc.licenseNumber }}</td>
            <td class="py-3.5 px-4 text-xs font-semibold text-teal-700">{{ doc.specialization }}</td>
            <td class="py-3.5 px-4 font-bold text-[#0B253A]">{{ formatRupiah(doc.consultationFee) }}</td>
            <td class="py-3.5 px-4">
              <span
                class="px-2.5 py-1 rounded-md text-xs font-semibold"
                :class="
                  doc.isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                "
              >
                {{ doc.isActive ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="inline-flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg border border-[#D8E6E8] text-xs font-semibold text-slate-700 hover:bg-[#F4F9F9]"
                  @click="openEditForm(doc)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg border border-[#D8E6E8] text-xs font-semibold hover:bg-[#F4F9F9]"
                  @click="toggleActive(doc)"
                >
                  {{ doc.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                  @click="deleteDoctor(doc)"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
