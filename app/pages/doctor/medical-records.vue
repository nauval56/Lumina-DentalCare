<script setup lang="ts">
import { formatDateId, formatRupiah } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const route = useRoute()
const toast = useClinicToast()

const [
  { data: apptData, refresh: refreshAppt },
  { data: recordsData, refresh: refreshRecords },
  { data: servicesData },
  { data: medicinesData }
] = await Promise.all([
  useFetch('/api/appointments'),
  useFetch('/api/medical-records'),
  useFetch('/api/services'),
  useFetch('/api/medicines')
])

const eligibleAppointments = computed(() =>
  (apptData.value?.items || []).filter(
    (a: { medicalRecord?: unknown; status: string }) =>
      !a.medicalRecord && a.status !== 'CANCELLED'
  )
)

const form = reactive({
  appointmentId: String(route.query.appointmentId || ''),
  chiefComplaint: '',
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
  clinicalNotes: '',
  diagnoses: [{ icdCode: 'K02.1', name: 'Karies Dentin', severity: 'Sedang', notes: '' }],
  treatments: [{ serviceId: '', toothNumber: '16', name: '', fee: 350000, notes: '' }],
  prescriptionItems: [] as Array<{
    medicineId: string
    dosage: string
    frequency: string
    duration: string
    quantity: number
    instructions: string
  }>
})

watch(
  () => form.appointmentId,
  (id) => {
    const appt = eligibleAppointments.value.find((a: { id: string }) => a.id === id)
    if (appt) {
      form.chiefComplaint = appt.chiefComplaint || ''
      form.subjective = appt.chiefComplaint || ''
      if (appt.service) {
        form.treatments[0] = {
          serviceId: appt.service.id,
          toothNumber: 'ALL',
          name: appt.service.name,
          fee: Number(appt.service.price),
          notes: ''
        }
      }
    }
  },
  { immediate: true }
)

function applyServicePreset(idx: number, serviceId: string) {
  const srv = (servicesData.value?.items || []).find((s: { id: string }) => s.id === serviceId)
  if (srv && form.treatments[idx]) {
    form.treatments[idx].serviceId = srv.id
    form.treatments[idx].name = srv.name
    form.treatments[idx].fee = Number(srv.price || 0)
  }
}

function addDiagnosis() {
  form.diagnoses.push({ icdCode: '', name: '', severity: 'Ringan', notes: '' })
}

function removeDiagnosis(idx: number) {
  if (idx <= 0 || form.diagnoses.length <= 1) return
  form.diagnoses.splice(idx, 1)
}

function addTreatment() {
  form.treatments.push({ serviceId: '', toothNumber: '', name: '', fee: 0, notes: '' })
}

function removeTreatment(idx: number) {
  if (idx <= 0 || form.treatments.length <= 1) return
  form.treatments.splice(idx, 1)
}

function addPrescriptionItem() {
  const firstMed = medicinesData.value?.items?.[0]
  form.prescriptionItems.push({
    medicineId: firstMed?.id || '',
    dosage: '500 mg',
    frequency: '3 x 1 sehari',
    duration: '5 Hari',
    quantity: 10,
    instructions: 'Diminum sesudah makan'
  })
}

const totalTreatmentFee = computed(() =>
  form.treatments.reduce((sum, tr) => sum + Number(tr.fee || 0), 0)
)

const saving = ref(false)
async function submitMedicalRecord() {
  saving.value = true
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/medical-records', {
      method: 'POST',
      body: form
    })
    toast.success('Treatment Record Tersimpan & Terkirim ke Admin', res.message)
    form.appointmentId = ''
    form.chiefComplaint = ''
    form.subjective = ''
    form.objective = ''
    form.assessment = ''
    form.plan = ''
    form.clinicalNotes = ''
    form.prescriptionItems = []
    await Promise.all([refreshRecords(), refreshAppt()])
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Treatment Record',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Periksa kembali input Anda.'
    )
  } finally {
    saving.value = false
  }
}

// Edit Rekam Medis Berotorisasi dengan pencatatan revisi
const editingRecord = ref<Record<string, unknown> | null>(null)
const editForm = reactive({
  assessment: '',
  plan: '',
  clinicalNotes: '',
  revisionNote: ''
})

function openEdit(rec: Record<string, unknown>) {
  editingRecord.value = rec
  editForm.assessment = String(rec.assessment || '')
  editForm.plan = String(rec.plan || '')
  editForm.clinicalNotes = String(rec.clinicalNotes || '')
  editForm.revisionNote = ''
}

async function saveRevision() {
  if (!editingRecord.value) return
  try {
    const res = await $fetch<{ success: boolean; message: string }>(
      `/api/medical-records/${editingRecord.value.id}`,
      {
        method: 'PATCH',
        body: editForm
      }
    )
    toast.success('Revisi Disimpan', res.message)
    editingRecord.value = null
    await refreshRecords()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Revisi',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}
</script>

<template>
  <!-- 1. Tampilan Treatment Record SOAP Dokter (Figma 21 & Terhubung Langsung ke Invoice Admin) -->
  <div class="flex flex-col gap-[22px]">
    <!-- Hero Banner -->
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
      <div class="flex flex-col gap-1.5">
        <span class="self-start px-3.5 py-1 rounded-md bg-[#DFF1F2] border border-[#D8E6E8] text-[#137A7F] text-[11px] font-bold uppercase tracking-wider">
          Portal Dokter · Pemeriksaan SOAP, Diagnosis, Tindakan &amp; Resep
        </span>
        <h1 class="font-heading font-bold text-[24px] sm:text-[26px] text-[#0B253A]">
          Treatment Record SOAP &amp; <span class="text-[#137A7F]">Resep Obat Dokter</span>
        </h1>
        <p class="text-[13px] text-[#475569] max-w-2xl">
          Catat hasil pemeriksaan klinis SOAP, diagnosis ICD-10, tindakan medis beserta tarif layanan, dan resep obat. Data treatment record yang selesai dicatat otomatis terhubung ke modul Invoice Admin.
        </p>
      </div>
      <NuxtLink
        to="/doctor/odontogram"
        class="inline-flex items-center gap-2 px-5 py-3 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold shrink-0 transition-colors"
      >
        <UIcon name="i-lucide-heart-pulse" class="w-4 h-4" />
        <span>Buka Peta Odontogram FDI</span>
      </NuxtLink>
    </div>

    <!-- Form Treatment Record SOAP -->
    <form class="bg-white border border-[#D8E6E8] rounded-lg p-6 sm:p-8 space-y-6" @submit.prevent="submitMedicalRecord">
      <div class="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#D8E6E8]">
        <div>
          <span class="text-[11px] font-bold uppercase text-[#137A7F]">FORMULIR PEMERIKSAAN KLINIS</span>
          <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
            Treatment Record SOAP, Tindakan &amp; Resep Obat
          </h2>
        </div>
        <span class="px-3.5 py-1.5 rounded-md bg-[#DFF1F2] border border-[#D8E6E8] text-[#137A7F] text-xs font-bold">
          Terhubung ke Invoice Admin
        </span>
      </div>

      <!-- Bagian 1: Pilih Appointment Pasien -->
      <div class="p-4 rounded-md bg-[#EAF5F6]/70 border border-[#D8E6E8] space-y-2">
        <label for="tr-appointment" class="block text-[12px] font-bold text-[#0B253A]">
          1. Pilih Kunjungan Appointment Pasien *
        </label>
        <select
          id="tr-appointment"
          v-model="form.appointmentId"
          required
          class="w-full px-4 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-[13px] bg-white text-[#0B253A]"
        >
          <option value="">-- Pilih Pasien dari Daftar Appointment --</option>
          <option
            v-for="a in eligibleAppointments"
            :key="a.id"
            :value="a.id"
          >
            {{ a.bookingCode }} · {{ a.patient?.fullName }} ({{ a.patient?.medicalRecordNo }}) · {{ a.service?.name }}
          </option>
        </select>
        <p v-if="eligibleAppointments.length === 0" class="text-[11px] text-[#B45309] font-medium">
          Semua appointment aktif saat ini sudah memiliki treatment record atau belum ada pasien baru.
        </p>
      </div>

      <!-- Bagian 2: Catatan Klinis SOAP -->
      <div class="space-y-4">
        <h3 class="font-heading font-bold text-[14px] text-[#0B253A]">
          2. Catatan Klinis SOAP (Subjective, Objective, Assessment, Plan)
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label for="tr-chief" class="text-[12px] font-semibold text-[#0B253A]">
              Keluhan Utama (Chief Complaint) *
            </label>
            <textarea
              id="tr-chief"
              v-model="form.chiefComplaint"
              rows="2"
              required
              placeholder="Keluhan utama yang disampaikan pasien"
              class="w-full px-4 py-2.5 rounded-md border border-[#D8E6E8] text-[13px] text-[#0B253A]"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="tr-subjective" class="text-[12px] font-semibold text-[#0B253A]">
              S (Subjective / Anamnesis Tambahan)
            </label>
            <textarea
              id="tr-subjective"
              v-model="form.subjective"
              rows="2"
              placeholder="Riwayat nyeri, durasi, alergi, riwayat penyakit..."
              class="w-full px-4 py-2.5 rounded-md border border-[#D8E6E8] text-[13px] text-[#0B253A]"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="tr-objective" class="text-[12px] font-semibold text-[#0B253A]">
              O (Objective / Pemeriksaan Intraoral)
            </label>
            <textarea
              id="tr-objective"
              v-model="form.objective"
              rows="2"
              placeholder="Temuan klinis gigi, gusi, perkusi, sondasi, vitalitas..."
              class="w-full px-4 py-2.5 rounded-md border border-[#D8E6E8] text-[13px] text-[#0B253A]"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="tr-assessment" class="text-[12px] font-semibold text-[#0B253A]">
              A (Assessment / Ringkasan Diagnosis) *
            </label>
            <input
              id="tr-assessment"
              v-model="form.assessment"
              type="text"
              required
              placeholder="Contoh: K02.1 Karies Dentin Gigi 16"
              class="w-full px-4 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-[13px] text-[#0B253A]"
            >
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="tr-plan" class="text-[12px] font-semibold text-[#0B253A]">
              P (Plan / Rencana Perawatan)
            </label>
            <input
              id="tr-plan"
              v-model="form.plan"
              type="text"
              placeholder="Rencana tindakan lanjutan atau kontrol berkala"
              class="w-full px-4 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-[13px] text-[#0B253A]"
            >
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="tr-notes" class="text-[12px] font-semibold text-[#0B253A]">
              Catatan Edukasi Pasien
            </label>
            <input
              id="tr-notes"
              v-model="form.clinicalNotes"
              type="text"
              placeholder="Instruksi pascatindakan untuk pasien"
              class="w-full px-4 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-[13px] text-[#0B253A]"
            >
          </div>
        </div>
      </div>

      <!-- Bagian 3: Rincian Diagnosis (ICD-10) -->
      <div class="space-y-3 pt-4 border-t border-[#D8E6E8]">
        <div class="flex items-center justify-between">
          <h3 class="font-heading font-bold text-[14px] text-[#0B253A]">
            3. Rincian Diagnosis (ICD-10)
          </h3>
          <button
            type="button"
            class="px-3.5 py-1.5 min-h-11 rounded-md bg-[#EAF5F6] border border-[#D8E6E8] text-xs font-semibold text-[#137A7F] hover:bg-[#DFF1F2]"
            @click="addDiagnosis"
          >
            + Tambah Diagnosis
          </button>
        </div>
        <div
          v-for="(diag, idx) in form.diagnoses"
          :key="idx"
          class="p-3.5 rounded-md bg-[#F4F9F9] border border-[#D8E6E8] grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
        >
          <input
            v-model="diag.icdCode"
            type="text"
            placeholder="Kode ICD (Mis: K02.1)"
            class="sm:col-span-2 px-3.5 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white text-xs text-[#0B253A]"
          >
          <input
            v-model="diag.name"
            type="text"
            required
            placeholder="Nama Diagnosis *"
            class="sm:col-span-5 px-3.5 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white text-xs text-[#0B253A]"
          >
          <input
            v-model="diag.severity"
            type="text"
            placeholder="Keparahan (Ringan/Sedang)"
            class="sm:col-span-3 px-3.5 py-2 min-h-11 rounded-md border border-[#D8E6E8] bg-white text-xs text-[#0B253A]"
          >
          <div class="sm:col-span-2 flex justify-end">
            <button
              v-if="idx > 0"
              type="button"
              class="w-full sm:w-auto px-3 py-2 min-h-11 rounded-md bg-rose-50 hover:bg-rose-100 text-[#BE123C] border border-rose-200 text-xs font-semibold transition-colors"
              @click="removeDiagnosis(idx)"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>

      <!-- Bagian 4: Tindakan Medis & Tarif Layanan -->
      <div class="space-y-3 pt-4 border-t border-[#D8E6E8]">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-heading font-bold text-[14px] text-[#0B253A]">
              4. Tindakan Medis &amp; Tarif Layanan (Dikirim ke Invoice Admin)
            </h3>
            <p class="text-[11px] text-[#475569]">
              Pilih dari katalog layanan atau masukkan tarif tindakan aktual. Total tarif tindakan: <strong class="text-[#137A7F]">{{ formatRupiah(totalTreatmentFee) }}</strong>
            </p>
          </div>
          <button
            type="button"
            class="px-3.5 py-1.5 min-h-11 rounded-md bg-[#EAF5F6] border border-[#D8E6E8] text-xs font-semibold text-[#137A7F] hover:bg-[#DFF1F2]"
            @click="addTreatment"
          >
            + Tambah Tindakan
          </button>
        </div>
        <div
          v-for="(tr, idx) in form.treatments"
          :key="idx"
          class="p-3.5 rounded-md bg-[#F4F9F9] border border-[#D8E6E8] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
        >
          <select
            :value="tr.serviceId"
            class="sm:col-span-3 px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs bg-white text-[#0B253A]"
            @change="applyServicePreset(idx, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">-- Pilih Katalog Layanan (Opsional) --</option>
            <option v-for="srv in servicesData?.items || []" :key="srv.id" :value="srv.id">
              {{ srv.name }} ({{ formatRupiah(srv.price) }})
            </option>
          </select>
          <input
            v-model="tr.toothNumber"
            type="text"
            placeholder="No. Gigi FDI (16/ALL)"
            class="sm:col-span-2 px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs bg-white text-[#0B253A]"
          >
          <input
            v-model="tr.name"
            type="text"
            required
            placeholder="Nama Tindakan *"
            class="sm:col-span-3 px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs bg-white text-[#0B253A]"
          >
          <input
            v-model.number="tr.fee"
            type="number"
            min="0"
            required
            placeholder="Tarif (IDR)"
            class="sm:col-span-2 px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs bg-white font-semibold text-[#137A7F]"
          >
          <div class="sm:col-span-2 flex justify-end">
            <button
              v-if="idx > 0"
              type="button"
              class="w-full sm:w-auto px-3 py-2 min-h-11 rounded-md bg-rose-50 hover:bg-rose-100 text-[#BE123C] border border-rose-200 text-xs font-semibold transition-colors"
              @click="removeTreatment(idx)"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>

      <!-- Bagian 5: Daftar Resep Obat -->
      <div class="space-y-3 pt-4 border-t border-[#D8E6E8]">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-heading font-bold text-[14px] text-[#0B253A]">
              5. Resep Obat Dokter (Opsional)
            </h3>
            <p class="text-[11px] text-[#475569]">
              Resep disimpan ke rekam medis pasien tanpa langsung memotong stok. Pasien dapat memilih membeli di klinik atau apotek luar.
            </p>
          </div>
          <button
            type="button"
            class="px-4 py-2 min-h-11 rounded-md bg-[#EAF5F6] text-[#137A7F] border border-[#D8E6E8] hover:bg-[#DFF1F2] text-xs font-semibold"
            @click="addPrescriptionItem"
          >
            + Tambah Obat ke Resep
          </button>
        </div>

        <div
          v-for="(rx, idx) in form.prescriptionItems"
          :key="idx"
          class="p-3.5 rounded-md bg-[#F4F9F9] border border-[#D8E6E8] grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-center"
        >
          <select
            v-model="rx.medicineId"
            required
            class="sm:col-span-2 px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs bg-white text-[#0B253A]"
          >
            <option
              v-for="m in medicinesData?.items || []"
              :key="m.id"
              :value="m.id"
            >
              {{ m.name }} (Stok: {{ m.availableStock }} {{ m.unit }})
            </option>
          </select>
          <input
            v-model="rx.dosage"
            type="text"
            required
            placeholder="Dosis (500 mg)"
            class="px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs bg-white text-[#0B253A]"
          >
          <input
            v-model="rx.frequency"
            type="text"
            required
            placeholder="Frekuensi (3x1)"
            class="px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs bg-white text-[#0B253A]"
          >
          <input
            v-model="rx.duration"
            type="text"
            required
            placeholder="Durasi (5 Hari)"
            class="px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs bg-white text-[#0B253A]"
          >
          <div class="flex items-center gap-1.5">
            <input
              v-model.number="rx.quantity"
              type="number"
              min="1"
              required
              placeholder="Jml"
              class="w-full px-3 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs bg-white text-[#0B253A]"
            >
            <button
              type="button"
              class="p-2 min-h-11 text-[#BE123C] hover:bg-[#FFF1F2] rounded-md"
              aria-label="Hapus obat dari resep"
              @click="form.prescriptionItems.splice(idx, 1)"
            >
              <UIcon name="i-lucide-trash-2" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div class="flex justify-end pt-2">
        <button
          type="submit"
          :disabled="saving"
          class="inline-flex items-center gap-2 px-6 py-3 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold transition-colors"
        >
          <UIcon name="i-lucide-check-circle-2" class="w-5 h-5" />
          <span>{{ saving ? 'Menyimpan Treatment Record...' : 'Simpan Treatment Record & Kirim ke Admin' }}</span>
        </button>
      </div>
    </form>

    <!-- Daftar Arsip Treatment Record & Status Koneksi Invoice Admin -->
    <div class="bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-[#D8E6E8]">
        <div>
          <span class="text-[11px] font-bold uppercase text-[#137A7F]">RIWAYAT KLINIS</span>
          <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
            Arsip Treatment Record &amp; Status Invoice Admin
          </h2>
        </div>
        <span class="px-3 py-1 rounded-md bg-[#EAF5F6] text-[#137A7F] text-xs font-bold">
          {{ (recordsData?.items || []).length }} Catatan
        </span>
      </div>

      <div v-if="(recordsData?.items || []).length" class="space-y-4">
        <div
          v-for="rec in recordsData?.items || []"
          :key="rec.id"
          class="p-5 rounded-md bg-[#F4F9F9] border border-[#D8E6E8] space-y-3"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span class="font-mono text-xs font-bold text-[#137A7F]">
                {{ rec.patient?.medicalRecordNo }} · {{ rec.patient?.fullName }}
              </span>
              <h3 class="font-heading font-bold text-[16px] text-[#0B253A]">
                {{ rec.assessment }}
              </h3>
              <p class="text-xs text-[#475569]">
                Tanggal Periksa: {{ formatDateId(rec.visitDate) }} · Revisi #{{ rec.revisionNumber }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="rec.appointment?.invoice"
                class="px-3 py-1 rounded-md bg-[#ECFDF5] text-[#15803D] border border-[#D8E6E8] text-[11px] font-bold"
              >
                Invoice Admin: {{ rec.appointment.invoice.invoiceNumber }} ({{ rec.appointment.invoice.status }})
              </span>
              <span
                v-else
                class="px-3 py-1 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#D8E6E8] text-[11px] font-bold"
              >
                Menunggu Pembuatan Invoice Admin
              </span>
              <button
                type="button"
                class="px-3.5 py-2 min-h-11 rounded-md bg-white border border-[#D8E6E8] text-xs font-semibold text-[#0B253A] hover:bg-[#EAF5F6]"
                @click="openEdit(rec)"
              >
                Revisi SOAP
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#475569]">
            <p><strong class="text-[#0B253A]">Keluhan / Subjective:</strong> {{ rec.subjective || rec.chiefComplaint }}</p>
            <p v-if="rec.objective"><strong class="text-[#0B253A]">Objective:</strong> {{ rec.objective }}</p>
            <p v-if="rec.plan"><strong class="text-[#0B253A]">Plan:</strong> {{ rec.plan }}</p>
            <p v-if="rec.clinicalNotes"><strong class="text-[#0B253A]">Catatan Edukasi:</strong> {{ rec.clinicalNotes }}</p>
          </div>

          <div v-if="rec.treatments?.length" class="flex flex-wrap gap-2">
            <span
              v-for="tr in rec.treatments"
              :key="tr.id"
              class="px-3 py-1 rounded-md bg-[#DFF1F2] text-[#137A7F] text-xs font-semibold"
            >
              {{ tr.name }} ({{ formatRupiah(tr.fee) }})
            </span>
          </div>
        </div>
      </div>
      <p v-else class="text-xs text-[#475569]">Belum ada arsip treatment record.</p>
    </div>

    <!-- Modal Revisi Rekam Medis Berotorisasi -->
    <div
      v-if="editingRecord"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0B253A]/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
    >
      <form class="bg-white border border-[#D8E6E8] rounded-lg max-w-lg w-full p-6 space-y-4" @submit.prevent="saveRevision">
        <h3 class="font-heading font-bold text-[18px] text-[#0B253A]">
          Revisi Treatment Record (Tercatat di Audit Log)
        </h3>
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">Assessment / Diagnosis</label>
          <input
            v-model="editForm.assessment"
            type="text"
            required
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">Plan / Rencana Perawatan</label>
          <input
            v-model="editForm.plan"
            type="text"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">Catatan Klinis</label>
          <textarea
            v-model="editForm.clinicalNotes"
            rows="2"
            class="w-full px-3.5 py-2.5 rounded-md border border-[#D8E6E8] text-sm"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#0B253A] mb-1">
            Alasan Perubahan Rekam Medis *
          </label>
          <input
            v-model="editForm.revisionNote"
            type="text"
            required
            minlength="3"
            placeholder="Wajib diisi untuk jejak audit medis"
            class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm"
          >
        </div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 min-h-11 rounded-md border border-[#D8E6E8] text-xs font-semibold text-[#0B253A]"
            @click="editingRecord = null"
          >
            Batal
          </button>
          <button
            type="submit"
            class="px-5 py-2 min-h-11 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-xs font-semibold"
          >
            Simpan Revisi
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
