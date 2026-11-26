<script setup lang="ts">
import { formatRupiah, formatDateId, formatDateTimeId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const [
  { data: invData, pending, refresh: refreshInv },
  { data: txData, refresh: refreshTx }
] = await Promise.all([
  useFetch('/api/inventory'),
  useFetch('/api/inventory/transactions')
])

const toast = useClinicToast()

// 3 Tab Utama yang Mudah Dipahami Admin
const activeTab = ref<'MEDICINES' | 'BATCHES' | 'HISTORY'>('MEDICINES')

// Filter & Pencarian
const searchQuery = ref('')
const stockFilter = ref<'ALL' | 'LOW' | 'SAFE'>('ALL')
const batchMedicineFilter = ref('')
const batchStatusFilter = ref<'ALL' | 'SAFE' | 'NEAR_EXPIRY' | 'EXPIRED'>('ALL')

// Daftar Obat Terfilter
const filteredMedicines = computed(() => {
  const list = invData.value?.items || []
  return list.filter((m: { name: string; code: string; category: string; isLowStock: boolean }) => {
    const q = searchQuery.value.trim().toLowerCase()
    const matchSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.code.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
    const matchStock =
      stockFilter.value === 'ALL' ||
      (stockFilter.value === 'LOW' && m.isLowStock) ||
      (stockFilter.value === 'SAFE' && !m.isLowStock)
    return matchSearch && matchStock
  })
})

// Daftar Semua Batch FEFO yang Diratakan (Flat Table) agar Mudah Dibaca & Diedit
interface FlatBatchRow {
  id: string
  medicineId: string
  medicineCode: string
  medicineName: string
  unit: string
  batchNumber: string
  expiryDate: string
  remainingQty: number
  purchasePrice: number
  supplierName: string
  isExpired: boolean
  isNearExpiry: boolean
  fefoRank: number | null
}

const flattenedBatches = computed<FlatBatchRow[]>(() => {
  const medicines = invData.value?.items || []
  const rows: FlatBatchRow[] = []

  for (const m of medicines) {
    let rankCounter = 1
    for (const b of m.batches || []) {
      const canUseForFefo = !b.isExpired && b.remainingQty > 0
      rows.push({
        id: b.id,
        medicineId: m.id,
        medicineCode: m.code,
        medicineName: m.name,
        unit: m.unit,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        remainingQty: b.remainingQty,
        purchasePrice: Number(b.purchasePrice || 0),
        supplierName: b.supplierName || '-',
        isExpired: Boolean(b.isExpired),
        isNearExpiry: Boolean(b.isNearExpiry),
        fefoRank: canUseForFefo ? rankCounter++ : null
      })
    }
  }

  return rows.filter((r) => {
    const matchMed = !batchMedicineFilter.value || r.medicineId === batchMedicineFilter.value
    const matchStatus =
      batchStatusFilter.value === 'ALL' ||
      (batchStatusFilter.value === 'EXPIRED' && r.isExpired) ||
      (batchStatusFilter.value === 'NEAR_EXPIRY' && r.isNearExpiry && !r.isExpired) ||
      (batchStatusFilter.value === 'SAFE' && !r.isExpired && !r.isNearExpiry)
    return matchMed && matchStatus
  })
})

// ============================================================================
// 1. MODAL TAMBAH / EDIT MASTER OBAT
// ============================================================================
const showMedicineModal = ref(false)
const savingMedicine = ref(false)
const editingMedicineId = ref<string | null>(null)

const medForm = reactive({
  code: '',
  name: '',
  genericName: '',
  category: 'Antibiotik',
  unit: 'Tablet',
  unitPrice: 3500,
  minimumStock: 25
})

function openCreateMedicineModal() {
  editingMedicineId.value = null
  medForm.code = `MED-${Math.floor(100 + Math.random() * 900)}`
  medForm.name = ''
  medForm.genericName = ''
  medForm.category = 'Antibiotik'
  medForm.unit = 'Tablet'
  medForm.unitPrice = 3500
  medForm.minimumStock = 25
  showMedicineModal.value = true
}

function openEditMedicineModal(m: Record<string, unknown>) {
  editingMedicineId.value = String(m.id)
  medForm.code = String(m.code || '')
  medForm.name = String(m.name || '')
  medForm.genericName = String(m.genericName || '')
  medForm.category = String(m.category || 'Antibiotik')
  medForm.unit = String(m.unit || 'Tablet')
  medForm.unitPrice = Number(m.unitPrice || 0)
  medForm.minimumStock = Number(m.minimumStock || 10)
  showMedicineModal.value = true
}

async function saveMedicine() {
  savingMedicine.value = true
  try {
    if (editingMedicineId.value) {
      await $fetch(`/api/medicines/${editingMedicineId.value}`, {
        method: 'PATCH',
        body: {
          name: medForm.name,
          genericName: medForm.genericName || null,
          category: medForm.category,
          unit: medForm.unit,
          unitPrice: medForm.unitPrice,
          minimumStock: medForm.minimumStock
        }
      })
      toast.success('Obat Diperbarui', 'Perubahan data obat berhasil disimpan.')
    } else {
      await $fetch('/api/medicines', { method: 'POST', body: medForm })
      toast.success('Obat Ditambahkan', 'Jenis obat baru berhasil ditambahkan ke daftar.')
    }
    showMedicineModal.value = false
    await refreshInv()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Obat',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  } finally {
    savingMedicine.value = false
  }
}

async function deleteMedicine(m: { id: string; name: string }) {
  if (import.meta.client && !window.confirm(`Hapus obat "${m.name}" dari daftar?`)) {
    return
  }
  try {
    const res = await $fetch<{ message: string }>('/api/inventory/adjustment', {
      method: 'POST',
      body: {
        action: 'DELETE_MEDICINE',
        medicineId: m.id
      }
    })
    toast.success('Obat Dihapus', res.message)
    await Promise.all([refreshInv(), refreshTx()])
  } catch (err: unknown) {
    toast.error(
      'Gagal Menghapus Obat',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}

// ============================================================================
// 2. MODAL TAMBAH / EDIT BATCH & TANGGAL KEDALUWARSA (STOK MASUK / EDIT BATCH)
// ============================================================================
const showBatchModal = ref(false)
const savingBatch = ref(false)
const editingBatchId = ref<string | null>(null)
const batchModalForm = reactive({
  medicineId: '',
  batchNumber: '',
  expiryDate: '2027-12-31',
  remainingQty: 50,
  purchasePrice: 2000,
  supplierName: 'PT Kimia Farma Trading'
})

function openCreateBatchModal(preselectedMedicineId?: string) {
  editingBatchId.value = null
  batchModalForm.medicineId = preselectedMedicineId || (invData.value?.items?.[0]?.id ?? '')
  batchModalForm.batchNumber = `BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  batchModalForm.expiryDate = '2027-12-31'
  batchModalForm.remainingQty = 50
  batchModalForm.purchasePrice = 2000
  batchModalForm.supplierName = 'PT Kimia Farma Trading'
  showBatchModal.value = true
}

function openEditBatchModal(b: {
  id: string
  medicineId: string
  batchNumber: string
  expiryDate: string
  remainingQty: number
  purchasePrice: number
  supplierName: string
}) {
  editingBatchId.value = b.id
  batchModalForm.medicineId = b.medicineId
  batchModalForm.batchNumber = b.batchNumber
  batchModalForm.expiryDate = b.expiryDate ? String(b.expiryDate).slice(0, 10) : '2027-12-31'
  batchModalForm.remainingQty = Number(b.remainingQty ?? 0)
  batchModalForm.purchasePrice = Number(b.purchasePrice ?? 0)
  batchModalForm.supplierName = b.supplierName === '-' ? '' : b.supplierName
  showBatchModal.value = true
}

async function saveBatchCrud() {
  savingBatch.value = true
  try {
    if (editingBatchId.value) {
      const res = await $fetch<{ message: string }>('/api/inventory/adjustment', {
        method: 'POST',
        body: {
          action: 'UPDATE_BATCH',
          batchId: editingBatchId.value,
          batchNumber: batchModalForm.batchNumber,
          expiryDate: batchModalForm.expiryDate,
          remainingQty: batchModalForm.remainingQty,
          purchasePrice: batchModalForm.purchasePrice,
          supplierName: batchModalForm.supplierName || null
        }
      })
      toast.success('Batch Diperbarui', res.message)
    } else {
      const res = await $fetch<{ message: string }>('/api/inventory/stock-in', {
        method: 'POST',
        body: {
          medicineId: batchModalForm.medicineId,
          batchNumber: batchModalForm.batchNumber,
          expiryDate: batchModalForm.expiryDate,
          quantity: batchModalForm.remainingQty,
          purchasePrice: batchModalForm.purchasePrice,
          supplierName: batchModalForm.supplierName,
          notes: `Stok Masuk Batch (${batchModalForm.batchNumber})`
        }
      })
      toast.success('Stok Batch Ditambahkan', res.message)
    }
    showBatchModal.value = false
    await Promise.all([refreshInv(), refreshTx()])
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Batch',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Periksa kembali input batch Anda.'
    )
  } finally {
    savingBatch.value = false
  }
}

async function deleteBatchCrud(b: { id: string; batchNumber: string; medicineName?: string }) {
  if (
    import.meta.client &&
    !window.confirm(`Hapus Batch "${b.batchNumber}"${b.medicineName ? ` (${b.medicineName})` : ''}?`)
  ) {
    return
  }
  try {
    const res = await $fetch<{ message: string }>('/api/inventory/adjustment', {
      method: 'POST',
      body: {
        action: 'DELETE_BATCH',
        batchId: b.id
      }
    })
    toast.success('Batch Dihapus', res.message)
    await Promise.all([refreshInv(), refreshTx()])
  } catch (err: unknown) {
    toast.error(
      'Gagal Menghapus Batch',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}

// ============================================================================
// 3. MODAL PAKAI / KELUARKAN STOK OBAT (OTOMATIS FEFO)
// ============================================================================
const showStockOutModal = ref(false)
const savingStockOut = ref(false)
const stockOutForm = reactive({
  medicineId: '',
  quantity: 5,
  notes: 'Pemakaian obat ruang tindakan klinik'
})

function openStockOutModal(preselectedMedicineId?: string) {
  stockOutForm.medicineId = preselectedMedicineId || (invData.value?.items?.[0]?.id ?? '')
  stockOutForm.quantity = 5
  stockOutForm.notes = 'Pemakaian obat ruang tindakan klinik'
  showStockOutModal.value = true
}

async function submitStockOut() {
  savingStockOut.value = true
  try {
    const res = await $fetch<{ message: string }>('/api/inventory/stock-out', {
      method: 'POST',
      body: stockOutForm
    })
    toast.success('Stok Keluar Berhasil', res.message)
    showStockOutModal.value = false
    await Promise.all([refreshInv(), refreshTx()])
  } catch (err: unknown) {
    toast.error(
      'Stok Keluar Ditolak',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Stok tidak mencukupi.'
    )
  } finally {
    savingStockOut.value = false
  }
}

function getMutationLabel(type: string) {
  const map: Record<string, { label: string; badgeClass: string }> = {
    STOCK_IN: { label: 'Stok Masuk', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    STOCK_OUT: { label: 'Stok Keluar (FEFO)', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
    PRESCRIPTION_DISPENSE: {
      label: 'Resep Pasien (FEFO)',
      badgeClass: 'bg-[#EAF5F6] text-[#137A7F] border-[#D8E6E8]'
    },
    ADJUSTMENT_IN: {
      label: 'Penyesuaian (+)',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200'
    },
    ADJUSTMENT_OUT: {
      label: 'Penyesuaian (-)',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    EXPIRED_DISPOSAL: {
      label: 'Pemusnahan ED',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300'
    }
  }
  return map[type] || { label: type, badgeClass: 'bg-slate-100 text-slate-700 border-[#D8E6E8]' }
}
</script>

<template>
  <!-- Figma 33. Admin CRUD Obat, Batch FEFO & Kedaluwarsa (/admin/inventory) -->
  <div class="flex flex-col gap-[22px]">
    <!-- Header & Tombol Aksi Utama -->
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold uppercase text-[#137A7F]">
          ADMIN · PUSAT PENGELOLAAN OBAT &amp; STOK KLINIK (FEFO)
        </span>
        <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
          Manajemen Obat &amp; Tanggal Kedaluwarsa
        </h1>
        <p class="text-[13px] text-[#475569]">
          Kelola daftar obat, tambah stok masuk beserta tanggal kedaluwarsanya, dan pantau pemakaian obat dengan metode FEFO.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[12px] font-semibold transition-colors"
          @click="openCreateMedicineModal()"
        >
          <UIcon name="i-lucide-plus-circle" class="w-4 h-4" />
          <span>+ Tambah Obat</span>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 min-h-11 rounded-md bg-white border border-[#D8E6E8] hover:bg-[#DFF1F2] text-[#0B253A] text-[12px] font-semibold transition-colors"
          @click="openStockOutModal()"
        >
          <UIcon name="i-lucide-package-minus" class="w-4 h-4" />
          <span>Catat Obat Keluar (FEFO)</span>
        </button>
      </div>
    </div>

    <!-- 4 Kartu Ringkasan Kondisi Obat -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <DashboardCard
        title="Total Jenis Obat"
        :value="invData?.summary?.totalMedicines ?? 0"
        subtitle="Terdaftar di klinik"
        icon="i-lucide-pill"
        tone="sky"
      />
      <DashboardCard
        title="Stok Menipis"
        :value="invData?.summary?.lowStockCount ?? 0"
        subtitle="Perlu ditambah stoknya"
        icon="i-lucide-alert-triangle"
        :tone="(invData?.summary?.lowStockCount ?? 0) > 0 ? 'amber' : 'emerald'"
      />
      <DashboardCard
        title="Hampir Kedaluwarsa"
        :value="invData?.summary?.nearExpiryCount ?? 0"
        subtitle="Kurang dari 60 hari"
        icon="i-lucide-calendar-clock"
        :tone="(invData?.summary?.nearExpiryCount ?? 0) > 0 ? 'rose' : 'emerald'"
      />
      <DashboardCard
        title="Sudah Kedaluwarsa"
        :value="invData?.summary?.expiredCount ?? 0"
        subtitle="Tidak akan dipakai otomatis"
        icon="i-lucide-shield-alert"
        tone="teal"
      />
    </div>

    <!-- Navigasi 3 Tab Rapi (Agar Admin Tidak Bingung) -->
    <div class="lumina-card p-2 flex flex-wrap gap-2 bg-slate-100/80">
      <button
        type="button"
        class="flex-1 min-w-[200px] py-3 px-4 rounded-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all"
        :class="
          activeTab === 'MEDICINES'
            ? 'bg-white text-[#137A7F] shadow-xs'
            : 'text-slate-600 hover:bg-white/60'
        "
        @click="activeTab = 'MEDICINES'"
      >
        <UIcon name="i-lucide-list-checks" class="w-4 h-4" />
        <span>1. Daftar Obat ({{ (invData?.items || []).length }})</span>
      </button>

      <button
        type="button"
        class="flex-1 min-w-[220px] py-3 px-4 rounded-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all"
        :class="
          activeTab === 'BATCHES'
            ? 'bg-white text-[#137A7F] shadow-xs'
            : 'text-slate-600 hover:bg-white/60'
        "
        @click="activeTab = 'BATCHES'"
      >
        <UIcon name="i-lucide-calendar-check-2" class="w-4 h-4" />
        <span>2. Batch & Tanggal Kedaluwarsa ({{ flattenedBatches.length }})</span>
      </button>

      <button
        type="button"
        class="flex-1 min-w-[200px] py-3 px-4 rounded-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all"
        :class="
          activeTab === 'HISTORY'
            ? 'bg-white text-[#137A7F] shadow-xs'
            : 'text-slate-600 hover:bg-white/60'
        "
        @click="activeTab = 'HISTORY'"
      >
        <UIcon name="i-lucide-history" class="w-4 h-4" />
        <span>3. Riwayat Keluar-Masuk Stok</span>
      </button>
    </div>

    <CommonLoadingSkeleton v-if="pending" :rows="4" />

    <!-- ====================================================================== -->
    <!-- TAB 1: DAFTAR OBAT (MASTER OBAT)                                       -->
    <!-- ====================================================================== -->
    <div v-else-if="activeTab === 'MEDICINES'" class="lumina-card p-6 space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="font-heading font-bold text-lg text-[#0B253A]">
            Daftar Obat Klinik
          </h2>
          <p class="text-xs text-[#475569]">
            Klik <strong>"+ Tambah Stok"</strong> pada baris obat untuk memasukkan jumlah stok baru dan tanggal kedaluwarsanya.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama atau kode obat..."
            class="px-3.5 py-2 rounded-md border border-[#D8E6E8] text-xs w-56"
          >
          <select
            v-model="stockFilter"
            class="px-3.5 py-2 rounded-md border border-[#D8E6E8] text-xs font-semibold bg-white"
          >
            <option value="ALL">Semua Kondisi Stok</option>
            <option value="LOW">Stok Menipis Saja</option>
            <option value="SAFE">Stok Aman Saja</option>
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase bg-[#F4F9F9]/80">
              <th class="py-3.5 px-4">Kode & Nama Obat</th>
              <th class="py-3.5 px-4">Kategori</th>
              <th class="py-3.5 px-4">Harga Jual</th>
              <th class="py-3.5 px-4">Total Stok Tersedia</th>
              <th class="py-3.5 px-4">Kedaluwarsa Terdekat</th>
              <th class="py-3.5 px-4 text-right">Aksi Mudah (CRUD)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D8E6E8]/60">
            <tr v-for="m in filteredMedicines" :key="m.id" class="hover:bg-[#F4F9F9]/60">
              <td class="py-3.5 px-4">
                <span class="font-mono text-xs font-bold text-[#137A7F]">{{ m.code }}</span>
                <div class="font-semibold text-[#0B253A]">{{ m.name }}</div>
              </td>
              <td class="py-3.5 px-4 text-xs text-slate-600">{{ m.category }}</td>
              <td class="py-3.5 px-4 font-medium text-[#0B253A]">
                {{ formatRupiah(m.unitPrice) }} <span class="text-xs text-slate-400">/ {{ m.unit }}</span>
              </td>
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-2">
                  <span
                    class="px-3 py-1 rounded-md text-xs font-bold"
                    :class="
                      m.isLowStock
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    "
                  >
                    {{ m.availableStock }} {{ m.unit }}
                  </span>
                  <span v-if="m.isLowStock" class="text-[11px] font-bold text-amber-700">
                    (Stok Menipis!)
                  </span>
                </div>
                <span class="block text-[11px] text-slate-400 mt-0.5">
                  Batas minimal: {{ m.minimumStock }} {{ m.unit }} · ({{ (m.batches || []).length }} Batch)
                </span>
              </td>
              <td class="py-3.5 px-4 text-xs">
                <span v-if="m.nextExpiryDate" class="font-semibold text-[#0B253A]">
                  {{ formatDateId(m.nextExpiryDate) }}
                </span>
                <span v-else class="text-slate-400">Belum ada batch aktif</span>
              </td>
              <td class="py-3.5 px-4 text-right">
                <div class="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                  <button
                    type="button"
                    class="px-3 py-2 min-h-11 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold"
                    @click="openCreateBatchModal(m.id)"
                  >
                    + Tambah Stok
                  </button>
                  <button
                    type="button"
                    class="px-3 py-2 min-h-11 rounded-md bg-[#EAF5F6] hover:bg-sky-100 text-[#137A7F] border border-[#D8E6E8] text-xs font-semibold"
                    @click="batchMedicineFilter = m.id; activeTab = 'BATCHES'"
                  >
                    Lihat Batch ({{ (m.batches || []).length }})
                  </button>
                  <button
                    type="button"
                    class="px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs font-semibold text-slate-700 hover:bg-[#F4F9F9]"
                    @click="openEditMedicineModal(m)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="px-3 py-2 min-h-11 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                    @click="deleteMedicine(m)"
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

    <!-- ====================================================================== -->
    <!-- TAB 2: BATCH & TANGGAL KEDALUWARSA (TABEL RAPI & MUDAH CRUD)           -->
    <!-- ====================================================================== -->
    <div v-else-if="activeTab === 'BATCHES'" class="lumina-card p-6 space-y-5">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="font-heading font-bold text-lg text-[#0B253A]">
            Tabel Batch Obat & Tanggal Kedaluwarsa (Urutan FEFO)
          </h2>
          <p class="text-xs text-[#475569]">
            Sistem otomatis mengurutkan dari tanggal kedaluwarsa yang paling dekat (<strong>Prioritas #1 dipakai lebih dulu</strong>). Anda dapat menambah, mengedit, atau menghapus batch dengan mudah di tabel ini.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <select
            v-model="batchMedicineFilter"
            class="px-3.5 py-2 rounded-md border border-[#D8E6E8] text-xs font-semibold bg-white"
          >
            <option value="">Semua Jenis Obat</option>
            <option v-for="m in invData?.items || []" :key="m.id" :value="m.id">
              {{ m.name }}
            </option>
          </select>

          <select
            v-model="batchStatusFilter"
            class="px-3.5 py-2 rounded-md border border-[#D8E6E8] text-xs font-semibold bg-white"
          >
            <option value="ALL">Semua Status Kedaluwarsa</option>
            <option value="SAFE">Masih Aman</option>
            <option value="NEAR_EXPIRY">Hampir Kedaluwarsa (&lt; 60 Hari)</option>
            <option value="EXPIRED">Sudah Kedaluwarsa</option>
          </select>

          <button
            type="button"
            class="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            @click="openCreateBatchModal(batchMedicineFilter || undefined)"
          >
            + Tambah Batch Baru
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-[#D8E6E8] text-xs text-[#475569] uppercase bg-[#F4F9F9]/80">
              <th class="py-3.5 px-4">Urutan Pakai (FEFO)</th>
              <th class="py-3.5 px-4">Nama Obat</th>
              <th class="py-3.5 px-4">Nomor Batch</th>
              <th class="py-3.5 px-4">Tanggal Kedaluwarsa (ED)</th>
              <th class="py-3.5 px-4">Sisa Stok Batch</th>
              <th class="py-3.5 px-4">Supplier</th>
              <th class="py-3.5 px-4 text-right">Aksi Batch (CRUD)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D8E6E8]/60">
            <tr v-for="b in flattenedBatches" :key="b.id" class="hover:bg-[#F4F9F9]/60">
              <td class="py-3.5 px-4">
                <span
                  v-if="b.isExpired"
                  class="px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold"
                >
                  Diblokir (Kedaluwarsa)
                </span>
                <span
                  v-else-if="b.remainingQty === 0"
                  class="px-2.5 py-1 rounded-md bg-slate-100 text-[#475569] text-xs font-semibold"
                >
                  Stok Habis
                </span>
                <span
                  v-else-if="b.fefoRank === 1"
                  class="px-2.5 py-1 rounded-md bg-[#EAF5F6] text-[#137A7F] border border-[#D8E6E8] text-xs font-bold"
                >
                  Prioritas #1 (Pakai Duluan)
                </span>
                <span
                  v-else
                  class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  Antrean FEFO #{{ b.fefoRank }}
                </span>
              </td>
              <td class="py-3.5 px-4">
                <div class="font-semibold text-[#0B253A]">{{ b.medicineName }}</div>
                <span class="font-mono text-xs text-slate-400">{{ b.medicineCode }}</span>
              </td>
              <td class="py-3.5 px-4 font-mono text-xs font-bold text-[#137A7F]">
                {{ b.batchNumber }}
              </td>
              <td class="py-3.5 px-4 text-xs">
                <div class="font-semibold text-[#0B253A]">{{ formatDateId(b.expiryDate) }}</div>
                <span v-if="b.isExpired" class="text-[11px] font-bold text-rose-600">
                  Sudah melewati batas kedaluwarsa
                </span>
                <span v-else-if="b.isNearExpiry" class="text-[11px] font-bold text-amber-600">
                  Mendekati kedaluwarsa (&lt; 60 hari)
                </span>
                <span v-else class="text-[11px] text-emerald-600 font-medium">
                  Masa berlaku aman
                </span>
              </td>
              <td class="py-3.5 px-4">
                <span class="font-bold text-[#0B253A]">{{ b.remainingQty }}</span>
                <span class="text-xs text-[#475569]"> {{ b.unit }}</span>
              </td>
              <td class="py-3.5 px-4 text-xs text-slate-600">
                {{ b.supplierName }}
              </td>
              <td class="py-3.5 px-4 text-right">
                <div class="inline-flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg border border-[#D8E6E8] bg-white text-xs font-semibold text-slate-700 hover:bg-[#F4F9F9]"
                    @click="openEditBatchModal(b)"
                  >
                    Edit Batch & ED
                  </button>
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold"
                    @click="deleteBatchCrud(b)"
                  >
                    Hapus Batch
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ====================================================================== -->
    <!-- TAB 3: RIWAYAT KELUAR-MASUK STOK (BUKU CATATAN MUTASI)                 -->
    <!-- ====================================================================== -->
    <div v-else class="lumina-card p-6 space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="font-heading font-bold text-lg text-[#0B253A]">
            Riwayat Keluar-Masuk Stok Obat
          </h2>
          <p class="text-xs text-[#475569]">
            Catatan otomatis setiap kali ada penambahan stok batch baru, pemakaian obat, resep dokter, atau koreksi stok.
          </p>
        </div>
        <button
          type="button"
          class="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
          @click="openStockOutModal()"
        >
          - Catat Pemakaian Obat
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-[#D8E6E8] text-[#475569] uppercase bg-[#F4F9F9]/80">
              <th class="py-3 px-4">Waktu</th>
              <th class="py-3 px-4">Nama Obat & Batch</th>
              <th class="py-3 px-4">Jenis Aktivitas</th>
              <th class="py-3 px-4">Jumlah</th>
              <th class="py-3 px-4">Stok Sebelum → Sesudah</th>
              <th class="py-3 px-4">Keterangan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D8E6E8]/60">
            <tr v-for="tx in (txData?.items || []).slice(0, 30)" :key="tx.id">
              <td class="py-3 px-4 text-[#475569]">{{ formatDateTimeId(tx.createdAt) }}</td>
              <td class="py-3 px-4">
                <strong class="text-[#0B253A]">{{ tx.medicine?.name }}</strong>
                <span v-if="tx.batch" class="block text-[#475569] font-mono">
                  Batch: {{ tx.batch.batchNumber }}
                </span>
              </td>
              <td class="py-3 px-4">
                <span
                  class="px-2.5 py-1 rounded-md border font-semibold text-[11px]"
                  :class="getMutationLabel(tx.type).badgeClass"
                >
                  {{ getMutationLabel(tx.type).label }}
                </span>
              </td>
              <td
                class="py-3 px-4 font-bold text-sm"
                :class="tx.quantity >= 0 ? 'text-emerald-600' : 'text-rose-600'"
              >
                {{ tx.quantity >= 0 ? `+${tx.quantity}` : tx.quantity }}
              </td>
              <td class="py-3 px-4 font-mono">
                {{ tx.balanceBefore }} → <strong>{{ tx.balanceAfter }}</strong>
              </td>
              <td class="py-3 px-4 text-slate-600">{{ tx.notes }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ====================================================================== -->
    <!-- MODAL 1: TAMBAH / EDIT JENIS OBAT                                      -->
    <!-- ====================================================================== -->
    <div
      v-if="showMedicineModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 backdrop-blur-xs p-4"
    >
      <form class="lumina-card max-w-lg w-full p-6 space-y-4" @submit.prevent="saveMedicine">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-[#137A7F]">
              Data Obat Klinik
            </span>
            <h3 class="font-heading font-bold text-lg text-[#0B253A]">
              {{ editingMedicineId ? 'Edit Data Obat' : 'Tambah Jenis Obat Baru' }}
            </h3>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-700"
            @click="showMedicineModal = false"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Kode Obat *</label>
            <input
              v-model="medForm.code"
              type="text"
              required
              :disabled="Boolean(editingMedicineId)"
              placeholder="MED-001"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm disabled:bg-slate-100"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Kategori *</label>
            <input
              v-model="medForm.category"
              type="text"
              required
              placeholder="Antibiotik / Analgesik"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Obat *</label>
          <input
            v-model="medForm.name"
            type="text"
            required
            placeholder="Contoh: Amoxicillin 500mg"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Satuan *</label>
            <input
              v-model="medForm.unit"
              type="text"
              required
              placeholder="Tablet / Kapsul"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Harga Jual (IDR) *</label>
            <input
              v-model.number="medForm.unitPrice"
              type="number"
              min="0"
              required
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Batas Stok Minimal *</label>
            <input
              v-model.number="medForm.minimumStock"
              type="number"
              min="1"
              required
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-md border border-[#D8E6E8] text-xs font-semibold"
            @click="showMedicineModal = false"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="savingMedicine"
            class="px-5 py-2 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
          >
            {{ savingMedicine ? 'Menyimpan...' : editingMedicineId ? 'Simpan Perubahan' : 'Simpan Obat Baru' }}
          </button>
        </div>
      </form>
    </div>

    <!-- ====================================================================== -->
    <!-- MODAL 2: TAMBAH / EDIT BATCH & TANGGAL KEDALUWARSA                     -->
    <!-- ====================================================================== -->
    <div
      v-if="showBatchModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 backdrop-blur-xs p-4"
    >
      <form class="lumina-card max-w-lg w-full p-6 space-y-4" @submit.prevent="saveBatchCrud">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Stok & Tanggal Kedaluwarsa (FEFO)
            </span>
            <h3 class="font-heading font-bold text-lg text-[#0B253A]">
              {{ editingBatchId ? 'Edit Batch & Tanggal Kedaluwarsa' : 'Tambah Stok / Batch Obat Baru' }}
            </h3>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-700"
            @click="showBatchModal = false"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Obat *</label>
          <select
            v-model="batchModalForm.medicineId"
            required
            :disabled="Boolean(editingBatchId)"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm bg-white disabled:bg-slate-100"
          >
            <option value="">-- Pilih Obat --</option>
            <option v-for="m in invData?.items || []" :key="m.id" :value="m.id">
              {{ m.code }} · {{ m.name }}
            </option>
          </select>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nomor Batch *</label>
            <input
              v-model="batchModalForm.batchNumber"
              type="text"
              required
              placeholder="BATCH-2027A"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm font-mono"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Kedaluwarsa (ED) *
            </label>
            <input
              v-model="batchModalForm.expiryDate"
              type="date"
              required
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              {{ editingBatchId ? 'Sisa Stok Batch Ini *' : 'Jumlah Stok Masuk *' }}
            </label>
            <input
              v-model.number="batchModalForm.remainingQty"
              type="number"
              min="0"
              required
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Harga Beli Satuan (IDR)
            </label>
            <input
              v-model.number="batchModalForm.purchasePrice"
              type="number"
              min="0"
              class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
            >
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            Nama Distributor / Supplier
          </label>
          <input
            v-model="batchModalForm.supplierName"
            type="text"
            placeholder="PT Kimia Farma Trading"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-md border border-[#D8E6E8] text-xs font-semibold"
            @click="showBatchModal = false"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="savingBatch"
            class="px-5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
          >
            {{ savingBatch ? 'Menyimpan...' : editingBatchId ? 'Simpan Perubahan Batch' : 'Simpan Stok Masuk' }}
          </button>
        </div>
      </form>
    </div>

    <!-- ====================================================================== -->
    <!-- MODAL 3: CATAT PEMAKAIAN OBAT / STOK KELUAR OTOMATIS FEFO              -->
    <!-- ====================================================================== -->
    <div
      v-if="showStockOutModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 backdrop-blur-xs p-4"
    >
      <form class="lumina-card max-w-md w-full p-6 space-y-4" @submit.prevent="submitStockOut">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Pemakaian Obat Klinik
            </span>
            <h3 class="font-heading font-bold text-lg text-[#0B253A]">
              Catat Obat Keluar (Otomatis FEFO)
            </h3>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-700"
            @click="showStockOutModal = false"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <p class="text-xs text-[#475569]">
          Sistem akan otomatis mengurangi stok dari batch yang tanggal kedaluwarsanya paling dekat.
        </p>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Obat *</label>
          <select
            v-model="stockOutForm.medicineId"
            required
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm bg-white"
          >
            <option value="">-- Pilih Obat --</option>
            <option v-for="m in invData?.items || []" :key="m.id" :value="m.id">
              {{ m.name }} (Tersedia: {{ m.availableStock }} {{ m.unit }})
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Jumlah yang Dipakai / Keluar *</label>
          <input
            v-model.number="stockOutForm.quantity"
            type="number"
            min="1"
            required
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Keterangan Pemakaian *</label>
          <input
            v-model="stockOutForm.notes"
            type="text"
            required
            placeholder="Contoh: Pemakaian ruang tindakan gigi"
            class="w-full px-3.5 py-2 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-md border border-[#D8E6E8] text-xs font-semibold"
            @click="showStockOutModal = false"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="savingStockOut"
            class="px-5 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
          >
            {{ savingStockOut ? 'Memproses...' : 'Keluarkan Stok' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
