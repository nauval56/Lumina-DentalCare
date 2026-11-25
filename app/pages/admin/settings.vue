<script setup lang="ts">
definePageMeta({ layout: 'portal' })

const [{ data: settingData, refresh: refreshSetting }, { data: usersData, refresh: refreshUsers }] =
  await Promise.all([useFetch('/api/settings'), useFetch('/api/users')])

const toast = useClinicToast()

const clinicForm = reactive({
  clinicName: 'Lumina Dental Care',
  tagline: 'Senyum Cerah Dimulai Dari Perawatan Terbaik',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  gmailUser: '',
  gmailAppPassword: ''
})

const gmailConfigured = computed(() =>
  Boolean((settingData.value?.setting?.notificationConfig as Record<string, unknown>)?.gmailConfigured)
)

watch(
  () => settingData.value?.setting,
  (val) => {
    if (val) {
      clinicForm.clinicName = val.clinicName || 'Lumina Dental Care'
      clinicForm.tagline = val.tagline || ''
      clinicForm.address = val.address || ''
      clinicForm.phone = val.phone || ''
      clinicForm.whatsapp = val.whatsapp || ''
      clinicForm.email = val.email || ''
      const notif = (val.notificationConfig || {}) as Record<string, unknown>
      clinicForm.gmailUser = typeof notif.gmailUser === 'string' ? notif.gmailUser : ''
    }
  },
  { immediate: true }
)

const editingUserId = ref<string | null>(null)
const userForm = reactive({
  fullName: '',
  email: '',
  phone: '',
  roleCode: 'RECEPTIONIST' as 'ADMIN' | 'RECEPTIONIST' | 'DOCTOR' | 'PATIENT',
  password: '',
  isActive: true
})

function resetUserForm() {
  editingUserId.value = null
  userForm.fullName = ''
  userForm.email = ''
  userForm.phone = ''
  userForm.roleCode = 'RECEPTIONIST'
  userForm.password = ''
  userForm.isActive = true
}

function openEditUser(u: Record<string, unknown>) {
  editingUserId.value = String(u.id)
  userForm.fullName = String(u.fullName || '')
  userForm.email = String(u.email || '')
  userForm.phone = String(u.phone || '')
  userForm.roleCode = (String(u.role || 'RECEPTIONIST') as 'ADMIN' | 'RECEPTIONIST' | 'DOCTOR' | 'PATIENT')
  userForm.password = ''
  userForm.isActive = Boolean(u.isActive)
}

async function saveClinicSetting() {
  try {
    await $fetch('/api/settings', {
      method: 'PATCH',
      body: clinicForm
    })
    toast.success('Pengaturan Disimpan', 'Profil dan kontak klinik berhasil diperbarui.')
    await refreshSetting()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}

async function saveUserAccount() {
  try {
    if (editingUserId.value) {
      await $fetch(`/api/users/${editingUserId.value}`, {
        method: 'PATCH',
        body: {
          fullName: userForm.fullName,
          email: userForm.email,
          phone: userForm.phone || null,
          roleCode: userForm.roleCode,
          password: userForm.password || undefined,
          isActive: userForm.isActive
        }
      })
      toast.success('Pengguna Diperbarui', 'Perubahan data akun pengguna berhasil disimpan.')
    } else {
      await $fetch('/api/users', {
        method: 'POST',
        body: userForm
      })
      toast.success('Pengguna Dibuat', 'Akun pengguna baru berhasil ditambahkan.')
    }
    resetUserForm()
    await refreshUsers()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Pengguna',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Email sudah terdaftar.'
    )
  }
}

async function toggleUserActive(u: { id: string; isActive: boolean }) {
  await $fetch(`/api/users/${u.id}`, {
    method: 'PATCH',
    body: { isActive: !u.isActive }
  })
  toast.info('Status Akun Diperbarui', 'Status aktif akun pengguna berhasil diubah.')
  await refreshUsers()
}

async function deleteUserAccount(u: { id: string; fullName: string; email: string }) {
  if (import.meta.client && !window.confirm(`Hapus akun pengguna ${u.fullName} (${u.email})?`)) {
    return
  }
  try {
    const res = await $fetch<{ message: string }>(`/api/users/${u.id}`, {
      method: 'DELETE'
    })
    toast.success('Akun Dihapus', res.message)
    await refreshUsers()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menghapus Akun',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Tidak dapat menghapus akun ini.'
    )
  }
}
</script>

<template>
  <!-- Figma 35. Admin Pengaturan Klinik & SMTP (/admin/settings) -->
  <div class="flex flex-col gap-[22px]">
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col gap-1">
      <span class="text-[11px] font-bold uppercase text-[#137A7F]">
        ADMIN · PENGATURAN SISTEM, PROFIL KLINIK &amp; MANAJEMEN PENGGUNA (RBAC CRUD)
      </span>
      <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
        Pengaturan Klinik &amp; Hak Akses Pengguna
      </h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Profil Klinik -->
      <form class="lg:col-span-6 lumina-card p-6 space-y-4" @submit.prevent="saveClinicSetting">
        <h2 class="font-heading font-bold text-base text-[#0B253A]">
          Profil Klinik & Informasi Kontak
        </h2>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Klinik</label>
          <input
            v-model="clinicForm.clinicName"
            type="text"
            required
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Tagline</label>
          <input
            v-model="clinicForm.tagline"
            type="text"
            required
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Telepon</label>
            <input
              v-model="clinicForm.phone"
              type="text"
              required
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Email Resmi</label>
            <input
              v-model="clinicForm.email"
              type="email"
              required
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap Klinik</label>
          <textarea
            v-model="clinicForm.address"
            rows="2"
            required
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          />
        </div>

        <!-- Pengaturan Pengiriman Email Reset Password via Gmail SMTP -->
        <div class="pt-3 border-t border-[#D8E6E8] space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h3 class="font-heading font-semibold text-sm text-[#0B253A]">
                Integrasi Gmail SMTP (Email Reset Password)
              </h3>
              <p class="text-[11px] text-[#475569]">
                Digunakan untuk mengirim tautan ubah password ke Gmail pengguna.
              </p>
            </div>
            <span
              class="px-2.5 py-1 rounded-md text-[11px] font-bold"
              :class="
                gmailConfigured
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              "
            >
              {{ gmailConfigured ? 'Gmail SMTP Aktif' : 'Belum Dikonfigurasi' }}
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Gmail Pengirim
              </label>
              <input
                v-model="clinicForm.gmailUser"
                type="email"
                placeholder="klinik.anda@gmail.com"
                class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
              >
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Google App Password (16 Digit)
              </label>
              <input
                v-model="clinicForm.gmailAppPassword"
                type="password"
                :placeholder="gmailConfigured ? '•••••••••••• (Tersimpan)' : 'xxxx xxxx xxxx xxxx'"
                class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
              >
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            class="px-5 py-2.5 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
          >
            Simpan Pengaturan Klinik
          </button>
        </div>
      </form>

      <!-- Tambah / Edit Pengguna (RBAC CRUD) -->
      <form class="lg:col-span-6 lumina-card p-6 space-y-4" @submit.prevent="saveUserAccount">
        <div class="flex items-center justify-between">
          <h2 class="font-heading font-bold text-base text-[#0B253A]">
            {{ editingUserId ? 'Edit Akun Pengguna (RBAC)' : 'Tambah Akun Pengguna Baru (RBAC)' }}
          </h2>
          <button
            v-if="editingUserId"
            type="button"
            class="text-xs font-semibold text-[#475569] hover:text-[#0B253A]"
            @click="resetUserForm"
          >
            Batal Edit ✕
          </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
            <input
              v-model="userForm.fullName"
              type="text"
              required
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Role Pengguna *</label>
            <select
              v-model="userForm.roleCode"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm bg-white"
            >
              <option value="RECEPTIONIST">RECEPTIONIST (Resepsionis)</option>
              <option value="ADMIN">ADMIN (Administrator)</option>
              <option value="DOCTOR">DOCTOR (Dokter Gigi)</option>
              <option value="PATIENT">PATIENT (Pasien)</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
            <input
              v-model="userForm.email"
              type="email"
              required
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nomor Telepon</label>
            <input
              v-model="userForm.phone"
              type="text"
              placeholder="08xxxxxxxxxx"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            {{ editingUserId ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password Awal *' }}
          </label>
          <input
            v-model="userForm.password"
            type="password"
            :required="!editingUserId"
            minlength="8"
            placeholder="Minimal 8 karakter"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div class="flex justify-end gap-2">
          <button
            v-if="editingUserId"
            type="button"
            class="px-4 py-2.5 rounded-md border border-[#D8E6E8] text-xs font-semibold"
            @click="resetUserForm"
          >
            Batal
          </button>
          <button
            type="submit"
            class="px-5 py-2.5 rounded-md bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold"
          >
            {{ editingUserId ? 'Simpan Perubahan Akun' : '+ Buat Akun Pengguna' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Tabel Daftar Pengguna -->
    <div class="lumina-card p-6 space-y-4">
      <h2 class="font-heading font-bold text-lg text-[#0B253A]">
        Daftar Akun Pengguna Sistem
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase">
              <th class="py-3 px-3">Nama Lengkap</th>
              <th class="py-3 px-3">Email & Telepon</th>
              <th class="py-3 px-3">Role (RBAC)</th>
              <th class="py-3 px-3">Status</th>
              <th class="py-3 px-3 text-right">Aksi (CRUD)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D8E6E8]/60">
            <tr v-for="u in usersData?.items || []" :key="u.id">
              <td class="py-3 px-3 font-semibold text-[#0B253A]">{{ u.fullName }}</td>
              <td class="py-3 px-3 text-xs text-slate-600">
                <div>{{ u.email }}</div>
                <div class="text-slate-400">{{ u.phone || '-' }}</div>
              </td>
              <td class="py-3 px-3">
                <span class="px-2.5 py-1 rounded-md bg-[#EAF5F6] text-[#137A7F] text-xs font-bold">
                  {{ u.role }}
                </span>
              </td>
              <td class="py-3 px-3">
                <span
                  class="px-2.5 py-1 rounded-md text-xs font-semibold"
                  :class="u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
                >
                  {{ u.isActive ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="py-3 px-3 text-right">
                <div class="inline-flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg border border-[#D8E6E8] text-xs font-semibold text-slate-700 hover:bg-[#F4F9F9]"
                    @click="openEditUser(u)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg border border-[#D8E6E8] text-xs font-semibold hover:bg-[#F4F9F9]"
                    @click="toggleUserActive(u)"
                  >
                    {{ u.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                    @click="deleteUserAccount(u)"
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
  </div>
</template>
