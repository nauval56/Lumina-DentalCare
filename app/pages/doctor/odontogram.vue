<script setup lang="ts">
import { formatDateTimeId } from '~/utils/format'

definePageMeta({ layout: 'portal' })

const route = useRoute()
const toast = useClinicToast()

const { data: patientsData } = await useFetch('/api/patients')
const selectedPatientId = ref(String(route.query.patientId || ''))

watch(
  () => patientsData.value?.items,
  (list) => {
    if (!selectedPatientId.value && list && list.length > 0) {
      selectedPatientId.value = list[0].id
    }
  },
  { immediate: true }
)

const { data: odontoData, refresh } = await useFetch('/api/odontograms', {
  query: computed(() => ({ patientId: selectedPatientId.value }))
})

const selectedPatient = computed(() => {
  const list = (patientsData.value?.items || []) as Array<{
    id: string
    fullName: string
    medicalRecordNo: string
    dateOfBirth?: string | null
  }>
  return list.find((p) => p.id === selectedPatientId.value) || null
})

async function handleSaveTooth(payload: {
  fdiNumber: string
  condition: string
  surfaces: string
  diagnosis: string
  treatment: string
  notes: string
}) {
  if (!selectedPatientId.value) {
    toast.error('Pilih Pasien', 'Silakan pilih pasien terlebih dahulu.')
    return
  }
  try {
    const res = await $fetch<{ success: boolean; message: string }>('/api/odontograms', {
      method: 'POST',
      body: {
        patientId: selectedPatientId.value,
        ...payload
      }
    })
    toast.success('Odontogram Disimpan', res.message)
    await refresh()
  } catch (err: unknown) {
    toast.error(
      'Gagal Menyimpan Odontogram',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Hero Header Doctor Odontogram selaras dengan Landing Page -->
    <div class="rounded-lg bg-[#EAF5F6] border border-[#D8E6E8] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div class="space-y-2">
        <span class="inline-flex items-center px-3.5 py-1 rounded-md bg-[#DFF1F2] text-[#137A7F] text-xs font-bold uppercase tracking-wider">
          Standar Penomoran FDI · 52 Gigi Permanen & Gigi Susu
        </span>
        <h1 class="font-heading font-bold text-2xl sm:text-3xl text-[#0B253A]">
          Manajemen <span class="text-[#137A7F]">Odontogram Klinis</span> Pasien
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 max-w-2xl">
          Pilih pasien, klik nomor gigi standar FDI (11-48 dewasa atau 51-85 gigi susu), dan catat kondisi permukaan M/O/D/B/L, diagnosis, serta tindakan medis secara terstruktur.
        </p>
      </div>

      <div class="w-full lg:w-80 bg-white p-4 rounded-md border border-[#D8E6E8]">
        <label for="doctor-odonto-patient" class="block text-xs font-bold text-[#137A7F] uppercase tracking-wider mb-1.5">
          Pilih Pasien Pemeriksaan
        </label>
        <select
          id="doctor-odonto-patient"
          v-model="selectedPatientId"
          class="w-full px-3.5 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-sm bg-[#EAF5F6]/50 font-semibold text-[#0B253A]"
        >
          <option
            v-for="p in patientsData?.items || []"
            :key="p.id"
            :value="p.id"
          >
            {{ p.medicalRecordNo }} · {{ p.fullName }}
          </option>
        </select>
      </div>
    </div>

    <!-- Interactive Odontogram Component -->
    <OdontogramFdiOdontogramChart
      v-if="odontoData"
      :teeth-catalog="odontoData.teethCatalog || []"
      :latest-by-fdi="odontoData.latestByFdi || {}"
      :history="odontoData.history || []"
      :patient-date-of-birth="odontoData.patient?.dateOfBirth || selectedPatient?.dateOfBirth || null"
      :patient-name="odontoData.patient?.fullName || selectedPatient?.fullName || ''"
      @save-tooth="handleSaveTooth"
    />

    <!-- Riwayat Perubahan Kondisi Gigi Pasien -->
    <div class="bg-white border border-[#D8E6E8] rounded-lg p-6 space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-[#D8E6E8]">
        <div>
          <span class="text-[11px] font-bold uppercase text-[#137A7F]">LOG PEMERIKSAAN GIGI</span>
          <h2 class="font-heading font-bold text-[18px] text-[#0B253A]">
            Riwayat Perubahan Odontogram Pasien
          </h2>
        </div>
        <span class="px-3 py-1 rounded-md bg-[#EAF5F6] text-[#137A7F] text-xs font-bold">
          {{ (odontoData?.history || []).length }} Catatan
        </span>
      </div>

      <div v-if="(odontoData?.history || []).length" class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-[#D8E6E8] text-[11px] font-bold text-[#137A7F] uppercase bg-[#EAF5F6]/60">
              <th class="py-3 px-3">Waktu Pencatatan</th>
              <th class="py-3 px-3">Gigi FDI</th>
              <th class="py-3 px-3">Kondisi &amp; Permukaan</th>
              <th class="py-3 px-3">Diagnosis &amp; Tindakan</th>
              <th class="py-3 px-3">Dokter Pemeriksa</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#D8E6E8]/60">
            <tr v-for="h in odontoData?.history || []" :key="h.id">
              <td class="py-3 px-3 text-xs text-[#475569]">{{ formatDateTimeId(h.recordedAt) }}</td>
              <td class="py-3 px-3 font-bold text-[#0B253A]">
                #{{ h.tooth?.fdiNumber }}
                <span class="block text-xs font-normal text-[#475569]">{{ h.tooth?.nameId }}</span>
              </td>
              <td class="py-3 px-3">
                <CommonStatusBadge :status="h.condition" kind="tooth" />
                <span v-if="h.surfaces" class="text-xs text-[#475569] ml-2">
                  Permukaan: <strong class="text-[#0B253A]">{{ h.surfaces }}</strong>
                </span>
              </td>
              <td class="py-3 px-3 text-xs">
                <div class="font-semibold text-[#0B253A]">{{ h.diagnosis || '-' }}</div>
                <div class="text-[#475569]">{{ h.treatment || h.notes || '-' }}</div>
              </td>
              <td class="py-3 px-3 text-xs text-[#0B253A] font-medium">
                {{ h.doctor?.titlePrefix }} {{ h.doctor?.fullName }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-xs text-[#475569]">
        Belum ada catatan riwayat odontogram untuk pasien ini.
      </p>
    </div>
  </div>
</template>
