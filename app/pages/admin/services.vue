<script setup lang="ts">
import { formatRupiah } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const { data, pending, refresh } = await useFetch('/api/services', {
  query: { includeInactive: 'true' }
})
const toast = useClinicToast()

const showForm = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  code: '',
  name: '',
  category: 'Konservasi Gigi',
  shortDesc: '',
  description: '',
  price: 450000,
  durationMinutes: 45,
  isFeatured: true,
  isActive: true
})

function openCreateForm() {
  editingId.value = null
  form.code = ''
  form.name = ''
  form.category = 'Konservasi Gigi'
  form.shortDesc = ''
  form.description = ''
  form.price = 450000
  form.durationMinutes = 45
  form.isFeatured = true
  form.isActive = true
  showForm.value = true
}

function openEditForm(s: Record<string, unknown>) {
  editingId.value = String(s.id)
  form.code = String(s.code || '')
  form.name = String(s.name || '')
  form.category = String(s.category || '')
  form.shortDesc = String(s.shortDesc || '')
  form.description = String(s.description || '')
  form.price = Number(s.price || 0)
  form.durationMinutes = Number(s.durationMinutes || 30)
  form.isFeatured = Boolean(s.isFeatured)
  form.isActive = Boolean(s.isActive)
  showForm.value = true
}

async function saveService() {
  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/services/${editingId.value}`, {
        method: 'PATCH',
        body: {
          name: form.name,
          category: form.category,
          shortDesc: form.shortDesc,
          description: form.description,
          price: form.price,
          durationMinutes: form.durationMinutes,
          isFeatured: form.isFeatured,
          isActive: form.isActive
        }
      })
      toast.success('Layanan Diperbarui', 'Perubahan data layanan perawatan berhasil disimpan.')
    } else {
      await $fetch('/api/services', {
        method: 'POST',
        body: form
      })
      toast.success('Layanan Ditambahkan', 'Layanan perawatan baru berhasil disimpan.')
    }
    showForm.value = false
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Layanan',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Periksa kembali input Anda.'
    )
  } finally {
    saving.value = false
  }
}

async function toggleService(srv: { id: string; isActive: boolean }) {
  await $fetch(`/api/services/${srv.id}`, {
    method: 'PATCH',
    body: { isActive: !srv.isActive }
  })
  toast.info('Layanan Diperbarui', 'Status aktif layanan berhasil diubah.')
  await refresh()
}

async function deleteService(srv: { id: string; name: string }) {
  if (import.meta.client && !window.confirm(`Hapus layanan "${srv.name}"?`)) {
    return
  }
  try {
    const res = await $fetch<{ message: string }>(`/api/services/${srv.id}`, {
      method: 'DELETE'
    })
    toast.success('Layanan Dihapus', res.message)
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menghapus Layanan',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}
</script>

<template>
  <!-- Figma 30. Admin CRUD Layanan & Tarif (/admin/services) -->
  <div class="flex flex-col gap-[22px]">
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold uppercase text-[#137A7F]">
          ADMIN · KATALOG TINDAKAN &amp; TARIF KLINIK (CRUD)
        </span>
        <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
          Manajemen Layanan &amp; Harga (IDR)
        </h1>
      </div>
      <button
        type="button"
        class="px-5 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold transition-colors"
        @click="openCreateForm"
      >
        + Tambah Layanan Baru
      </button>
    </div>

    <form v-if="showForm" class="lumina-card p-6 space-y-4" @submit.prevent="saveService">
      <div class="flex items-center justify-between">
        <h2 class="font-heading font-bold text-base text-[#0B253A]">
          {{ editingId ? 'Edit Layanan Perawatan' : 'Tambah Layanan Perawatan Baru' }}
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
          <label class="block text-xs font-semibold text-slate-700 mb-1">Kode Layanan *</label>
          <input
            v-model="form.code"
            type="text"
            required
            :disabled="Boolean(editingId)"
            placeholder="SRV-XXX"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm disabled:bg-slate-100"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Layanan *</label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="Nama Layanan"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Kategori *</label>
          <input
            v-model="form.category"
            type="text"
            required
            placeholder="Kategori Layanan"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Harga Layanan (IDR) *</label>
          <input
            v-model.number="form.price"
            type="number"
            min="0"
            required
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Durasi Tindakan (Menit) *</label>
          <input
            v-model.number="form.durationMinutes"
            type="number"
            min="15"
            required
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Ringkasan Singkat *</label>
          <input
            v-model="form.shortDesc"
            type="text"
            required
            placeholder="Ringkasan (Min 10 karakter)"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Prosedur Lengkap *</label>
        <textarea
          v-model="form.description"
          rows="2"
          required
          placeholder="Deskripsi prosedur lengkap *"
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
          {{ saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Layanan Baru' }}
        </button>
      </div>
    </form>

    <CommonLoadingSkeleton v-if="pending" :rows="4" />

    <div v-else class="lumina-card overflow-x-auto">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase bg-[#EAF5F6]/60">
            <th class="py-3.5 px-4">Kode</th>
            <th class="py-3.5 px-4">Nama Layanan</th>
            <th class="py-3.5 px-4">Kategori</th>
            <th class="py-3.5 px-4">Durasi</th>
            <th class="py-3.5 px-4">Harga (IDR)</th>
            <th class="py-3.5 px-4">Status</th>
            <th class="py-3.5 px-4 text-right">Aksi (CRUD)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#D8E6E8]/60">
          <tr v-for="s in data?.items || []" :key="s.id">
            <td class="py-3.5 px-4 font-mono text-xs font-bold text-[#137A7F]">{{ s.code }}</td>
            <td class="py-3.5 px-4 font-semibold text-[#0B253A]">{{ s.name }}</td>
            <td class="py-3.5 px-4 text-xs text-slate-600">{{ s.category }}</td>
            <td class="py-3.5 px-4 text-xs font-medium">{{ s.durationMinutes }} Menit</td>
            <td class="py-3.5 px-4 font-bold text-[#0B253A]">{{ formatRupiah(s.price) }}</td>
            <td class="py-3.5 px-4">
              <span
                class="px-2.5 py-1 rounded-md text-xs font-semibold"
                :class="s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
              >
                {{ s.isActive ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="py-3.5 px-4 text-right">
              <div class="inline-flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg border border-[#D8E6E8] text-xs font-semibold text-slate-700 hover:bg-[#F4F9F9]"
                  @click="openEditForm(s)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg border border-[#D8E6E8] text-xs font-semibold hover:bg-[#F4F9F9]"
                  @click="toggleService(s)"
                >
                  {{ s.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                  @click="deleteService(s)"
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
