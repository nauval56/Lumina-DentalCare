<script setup lang="ts">
definePageMeta({ layout: 'portal' })

const dateFilter = ref(new Date().toISOString().slice(0, 10))
const toast = useClinicToast()

const [
  { data: queueData, refresh: refreshQueue },
  { data: apptData, refresh: refreshAppt }
] = await Promise.all([
  useFetch('/api/queues', {
    query: computed(() => ({ date: dateFilter.value }))
  }),
  useFetch('/api/appointments')
])

const readyForCheckin = computed(() =>
  (apptData.value?.items || []).filter(
    (a: { status: string; queue?: unknown }) =>
      ['CONFIRMED', 'PENDING'].includes(a.status) && !a.queue
  )
)

async function checkin(appointmentId: string) {
  try {
    const res = await $fetch<{ message: string }>('/api/queues/checkin', {
      method: 'POST',
      body: { appointmentId }
    })
    toast.success('Nomor Antrean Dibuat', res.message)
    await Promise.all([refreshQueue(), refreshAppt()])
  } catch (err: unknown) {
    toast.error(
      'Gagal Check-In',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}

async function updateStatus(id: string, status: string) {
  try {
    const res = await $fetch<{ message: string }>(`/api/queues/${id}`, {
      method: 'PATCH',
      body: { status }
    })
    toast.info('Status Antrean Diperbarui', res.message)
    await refreshQueue()
  } catch (err: unknown) {
    toast.error(
      'Gagal Memperbarui',
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Terjadi kesalahan.'
    )
  }
}
</script>

<template>
  <!-- Figma 23/25. Receptionist Antrean & Check-In (/receptionist/queues) -->
  <div class="flex flex-col gap-[22px]">
    <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-[26px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] font-bold uppercase text-[#137A7F]">
          PEMANTAUAN ANTREAN DOKTER &amp; CHECK-IN PASIEN
        </span>
        <h1 class="font-heading font-bold text-[24px] text-[#0B253A]">
          Manajemen Antrean Klinik
        </h1>
      </div>
      <div>
        <input
          v-model="dateFilter"
          type="date"
          class="px-4 py-2.5 min-h-11 rounded-md border border-[#D8E6E8] text-[13px] bg-white text-[#0B253A]"
        >
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Daftar Siap Check-In -->
      <div class="lg:col-span-5 lumina-card p-6 space-y-4">
        <h2 class="font-heading font-bold text-base text-[#0B253A]">
          Appointment Siap Check-In
        </h2>
        <div v-if="readyForCheckin.length" class="space-y-2.5">
          <div
            v-for="a in readyForCheckin"
            :key="a.id"
            class="p-3.5 rounded-md border border-[#D8E6E8] flex items-center justify-between gap-3"
          >
            <div>
              <span class="font-mono text-xs font-bold text-[#137A7F]">{{ a.bookingCode }}</span>
              <p class="font-semibold text-sm text-[#0B253A]">{{ a.patient?.fullName }}</p>
              <p class="text-xs text-[#475569]">
                {{ a.startTime }} WIB · {{ a.doctor?.titlePrefix }} {{ a.doctor?.fullName }}
              </p>
            </div>
            <button
              type="button"
              class="px-3.5 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold shrink-0"
              @click="checkin(a.id)"
            >
              Check-In
            </button>
          </div>
        </div>
        <p v-else class="text-xs text-[#475569]">
          Tidak ada appointment yang menunggu check-in.
        </p>
      </div>

      <!-- Board Nomor Antrean Aktif -->
      <div class="lg:col-span-7 lumina-card p-6 space-y-4">
        <h2 class="font-heading font-bold text-base text-[#0B253A]">
          Daftar Nomor Antrean ({{ dateFilter }})
        </h2>

        <div v-if="(queueData?.items || []).length" class="space-y-3">
          <div
            v-for="q in queueData?.items || []"
            :key="q.id"
            class="p-4 rounded-md border border-[#D8E6E8] flex flex-wrap items-center justify-between gap-3"
          >
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-md bg-[#137A7F] text-white font-heading font-bold text-sm flex items-center justify-center">
                {{ q.queueNumber }}
              </div>
              <div>
                <p class="font-semibold text-sm text-[#0B253A]">{{ q.patient?.fullName }}</p>
                <p class="text-xs text-[#475569]">
                  Dokter: {{ q.doctor?.titlePrefix }} {{ q.doctor?.fullName }} · {{ q.appointment?.service?.name }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <CommonStatusBadge :status="q.status" kind="queue" />
              <button
                v-if="q.status === 'WAITING'"
                type="button"
                class="px-3.5 py-2 min-h-11 rounded-md bg-amber-500 text-white text-xs font-semibold"
                @click="updateStatus(q.id, 'CALLED')"
              >
                Panggil
              </button>
              <button
                v-if="q.status === 'CALLED' || q.status === 'WAITING'"
                type="button"
                class="px-3.5 py-2 min-h-11 rounded-md bg-[#137A7F] text-white text-xs font-semibold"
                @click="updateStatus(q.id, 'IN_PROGRESS')"
              >
                Masuk Ruang
              </button>
              <button
                v-if="
                  q.status === 'IN_PROGRESS' &&
                  q.appointment?.medicalRecord?.invoices?.some((inv: { status: string }) => inv.status === 'PAID')
                "
                type="button"
                class="px-3.5 py-2 min-h-11 rounded-md bg-emerald-600 text-white text-xs font-semibold"
                @click="updateStatus(q.id, 'COMPLETED')"
              >
                Selesai
              </button>
              <span
                v-else-if="q.status === 'IN_PROGRESS'"
                class="px-3 py-1.5 rounded-md bg-[#FFFBEB] border border-amber-200 text-[#B45309] text-xs font-semibold"
              >
                Menunggu Dokter &amp; Pembayaran
              </span>
            </div>
          </div>
        </div>
        <CommonEmptyState
          v-else
          title="Belum Ada Antrean pada Tanggal Ini"
          description="Lakukan check-in pasien dari panel sebelah kiri untuk menerbitkan nomor antrean."
        />
      </div>
    </div>
  </div>
</template>
