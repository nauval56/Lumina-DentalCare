<script setup lang="ts">
import { formatDateId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const search = ref('')
const genderFilter = ref('')
const page = ref(1)

const { data, pending, refresh } = await useFetch('/api/patients', {
  query: computed(() => ({
    search: search.value,
    gender: genderFilter.value,
    page: page.value,
    limit: 20
  }))
})

const toast = useClinicToast()
const showModal = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  fullName: '',
  nik: '',
  email: '',
  phone: '',
  gender: 'LAKI_LAKI' as 'LAKI_LAKI' | 'PEREMPUAN',
  dateOfBirth: '',
  address: '',
  allergies: ''
})

function openCreateModal() {
  editingId.value = null
  form.fullName = ''
  form.nik = ''
  form.email = ''
  form.phone = ''
  form.gender = 'LAKI_LAKI'
  form.dateOfBirth = ''
  form.address = ''
  form.allergies = ''
  showModal.value = true
}

function openEditModal(p: Record<string, unknown>) {
  editingId.value = String(p.id)
  form.fullName = String(p.fullName || '')
  form.nik = String(p.nik || '')
  form.email = String(p.email || '')
  form.phone = String(p.phone || '')
  form.gender = (p.gender === 'PEREMPUAN' ? 'PEREMPUAN' : 'LAKI_LAKI')
  form.dateOfBirth = p.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : ''
  form.address = String(p.address || '')
  form.allergies = String(p.allergies || '')
  showModal.value = true
}

async function savePatient() {
  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/patients/${editingId.value}`, {
        method: 'PATCH',
        body: form
      })
      toast.success('Pasien Diperbarui', 'Perubahan data pasien berhasil disimpan.')
    } else {
      await $fetch('/api/patients', {
        method: 'POST',
        body: form
      })
      toast.success('Pasien Ditambahkan', 'Data pasien baru berhasil disimpan.')
    }
    showModal.value = false
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Duplikasi atau kesalahan data pasien.'
    )
  } finally {
    saving.value = false
  }
}

async function deletePatient(p: { id: string; fullName: string; medicalRecordNo: string }) {
  if (import.meta.client && !window.confirm(`Hapus data pasien ${p.fullName} (${p.medicalRecordNo})?`)) {
    return
  }
  try {
    const res = await $fetch<{ message: string }>(`/api/patients/${p.id}`, {
      method: 'DELETE'
    })
    toast.success('Pasien Dihapus', res.message)
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menghapus Pasien',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Tidak dapat menghapus pasien ini.'
    )
  }
}

function exportPatientsCsv() {
  if (!import.meta.client) return
  const rows = [
    ['No Rekam Medis', 'Nama Lengkap', 'NIK', 'Telepon', 'Email', 'Jenis Kelamin', 'Alergi'],
    ...(data.value?.items || []).map((p: Record<string, unknown>) => [
      String(p.medicalRecordNo || ''),
      String(p.fullName || ''),
      String(p.nik || ''),
      String(p.phone || ''),
      String(p.email || ''),
      String(p.gender || ''),
      String(p.allergies || '')
    ])
  ]
  const csvContent = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `data-pasien-lumina-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.info('Export CSV Berhasil', 'Data pasien telah diunduh.')
}
</script>

<template>
  <!-- Figma 28. Admin CRUD Data Pasien (/admin/patients) -->
  <div class="flex flex-col gap-[22px]">
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold uppercase text-[#137A7F]">
          ADMIN · MASTER DATA PASIEN (CRUD)
        </span>
        <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
          Manajemen Pasien ({{ data?.total ?? 0 }})
        </h1>
      </div>
      <div class="flex flex-wrap items-center gap-2.5">
        <CommonSearchInput v-model="search" placeholder="Cari pasien..." />
        <select
          v-model="genderFilter"
          class="px-4 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-[12px] font-semibold bg-white text-[#0B253A]"
        >
          <option value="">Semua Gender</option>
          <option value="LAKI_LAKI">Laki-laki</option>
          <option value="PEREMPUAN">Perempuan</option>
        </select>
        <button
          type="button"
          class="px-4 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] bg-white text-[12px] font-semibold text-[#0B253A] hover:bg-[#DFF1F2]"
          @click="exportPatientsCsv"
        >
          Export CSV
        </button>
        <button
          type="button"
          class="px-4 py-2.5 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
          @click="openCreateModal"
        >
          + Pasien Baru
        </button>
      </div>
    </div>

    <CommonLoadingSkeleton v-if="pending" :rows="4" />

    <div v-else class="lumina-card overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase bg-[#EAF5F6]/60">
            <th class="py-3.5 px-4">No. RM</th>
            <th class="py-3.5 px-4">Nama & NIK</th>
            <th class="py-3.5 px-4">Telepon & Email</th>
            <th class="py-3.5 px-4">Gender & Tgl Lahir</th>
            <th class="py-3.5 px-4">Kunjungan</th>
            <th class="py-3.5 px-4 text-right">Aksi (CRUD)</th>
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
            <td class="py-3.5 px-4 text-xs text-slate-600">
              <div class="font-medium text-[#0B253A]">
                {{ p.gender === 'PEREMPUAN' ? 'Perempuan' : 'Laki-laki' }}
              </div>
              <div>{{ formatDateId(p.dateOfBirth) }}</div>
            </td>
            <td class="py-3.5 px-4 text-xs">
              <span class="px-2.5 py-1 rounded-md bg-[#EAF5F6] text-[#137A7F] font-semibold">
                {{ p._count?.appointments ?? 0 }} Appointment
              </span>
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="inline-flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg border border-[#D8E6E8] text-xs font-semibold text-slate-700 hover:bg-[#F4F9F9]"
                  @click="openEditModal(p)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                  @click="deletePatient(p)"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Tambah / Edit Pasien -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 backdrop-blur-xs p-4"
    >
      <form class="lumina-card max-w-lg w-full p-6 space-y-4" @submit.prevent="savePatient">
        <div class="flex items-center justify-between">
          <h3 class="font-heading font-bold text-lg text-[#0B253A]">
            {{ editingId ? 'Edit Data Pasien' : 'Tambah Pasien Baru' }}
          </h3>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-700"
            @click="showModal = false"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
            <input
              v-model="form.fullName"
              type="text"
              required
              placeholder="Nama Lengkap"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">NIK (16 Digit)</label>
            <input
              v-model="form.nik"
              type="text"
              maxlength="16"
              placeholder="16 Digit NIK"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nomor Telepon *</label>
            <input
              v-model="form.phone"
              type="text"
              required
              placeholder="08xxxxxxxxxx"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="nama@email.id"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
            <select
              v-model="form.gender"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm bg-white"
            >
              <option value="LAKI_LAKI">Laki-laki</option>
              <option value="PEREMPUAN">Perempuan</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
            <input
              v-model="form.dateOfBirth"
              type="date"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
          <input
            v-model="form.address"
            type="text"
            placeholder="Alamat tempat tinggal"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan Alergi Obat / Makanan</label>
          <input
            v-model="form.allergies"
            type="text"
            placeholder="Misal: Alergi Penisilin / Tidak ada"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-md border border-[#D8E6E8] text-xs font-semibold"
            @click="showModal = false"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-5 py-2 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
          >
            {{ saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Pasien Baru' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
