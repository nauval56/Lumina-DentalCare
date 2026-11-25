<script setup lang="ts">
import { formatRupiah, formatDateId } from '~/utils/format'

const [{ data, pending, error, refresh }, { data: clinicScheduleRes }] = await Promise.all([
  useFetch('/api/public/overview'),
  useFetch('/api/clinic-schedule')
])

const tabs = [
  'Pemeriksaan & Odontogram',
  'Perawatan Pencegahan & Scaling',
  'Estetika & Bleaching Gigi',
  'Restorasi & Saluran Akar',
  'Ortodonti & Bedah Mulut'
]
const activeTab = ref(0)

const tabConfigs = [
  {
    badge: 'PEMERIKSAAN & ODONTOGRAM',
    title: 'Pemeriksaan Menyeluruh & Pemetaan 52 Gigi FDI',
    desc: 'Konsultasi dokter spesialis dilengkapi pemeriksaan intraoral dan pencatatan digital Odontogram FDI untuk mendeteksi karies, tambalan lama, maupun kondisi jaringan penyangga gigi sejak dini.',
    keywords: ['konsultasi', 'pemeriksaan', 'odontogram', 'diagnostic', 'diagnostik']
  },
  {
    badge: 'PENCEGAHAN & SCALING',
    title: 'Pembersihan Karang Gigi & Proteksi Email',
    desc: 'Scaling ultrasonik minim nyeri, polishing noda kopi/teh, serta aplikasi fluoride untuk menjaga kesehatan gusi dan mencegah radang periodontal.',
    keywords: ['scaling', 'karang', 'preventive', 'pencegahan', 'polish', 'fluoride']
  },
  {
    badge: 'ESTETIKA & BLEACHING',
    title: 'Perawatan Estetika Senyum & Pemutihan Gigi',
    desc: 'Prosedur bleaching klinis terkontrol dan veneer komposit/porselen untuk mencerahkan warna gigi secara aman tanpa mengikis struktur gigi sehat secara berlebihan.',
    keywords: ['bleaching', 'estetik', 'aesthetic', 'veneer', 'whitening']
  },
  {
    badge: 'RESTORASI & SALURAN AKAR',
    title: 'Tambalan Estetik & Perawatan Endodontik',
    desc: 'Restorasi resin komposit sewarna gigi serta perawatan saluran akar (root canal treatment) presisi untuk mempertahankan fungsi gigi asli Anda.',
    keywords: ['tambal', 'restorasi', 'saluran akar', 'endodontik', 'konservasi', 'crown']
  },
  {
    badge: 'ORTODONTI & BEDAH MULUT',
    title: 'Perataan Lengkung Gigi & Pencabutan Aman',
    desc: 'Perawatan behel ortodonti terukur dan tindakan bedah mulut ringan (pencabutan gigi bungsu/impaksi) dengan protokol sterilisasi autoklaf kelas B.',
    keywords: ['ortodonti', 'behel', 'bedah', 'cabut', 'pencabutan', 'impaksi', 'surgery']
  }
]

const activeTabConfig = computed(() => tabConfigs[activeTab.value] || tabConfigs[0]!)

const activeTabServices = computed(() => {
  const cfg = activeTabConfig.value
  const list = services.value as Array<{
    id: string
    name: string
    category?: string
    shortDesc?: string
    price: number
    durationMinutes: number
  }>
  const matched = list.filter((s) => {
    const haystack = `${s.name} ${s.category || ''} ${s.shortDesc || ''}`.toLowerCase()
    return cfg.keywords.some((kw) => haystack.includes(kw))
  })
  return (matched.length > 0 ? matched : list).slice(0, 3)
})

const services = computed(() => data.value?.services || [])
const doctors = computed(() => data.value?.doctors || [])
const reviews = computed(() => data.value?.reviews || [])
const leadDoctor = computed(() => doctors.value[0] || null)
const featured = computed(() => services.value.slice(0, 3))

const rating = computed(() => {
  if (!reviews.value.length) return '4.9 / 5.0'
  const sum = reviews.value.reduce((a: number, r: { rating?: number }) => a + Number(r.rating || 5), 0)
  return `${(sum / reviews.value.length).toFixed(1)} / 5.0`
})

const metrics = computed(() => [
  { label: 'TINDAKAN KLINIS', value: `${services.value.length} Layanan`, note: 'Tarif IDR transparan' },
  { label: 'STANDAR ODONTOGRAM', value: '52 Gigi FDI', note: 'Permanen & gigi susu' },
  { label: 'RATING ULASAN', value: rating.value, note: 'Ulasan pasien terverifikasi' },
  { label: 'TIM SPESIALIS', value: `${doctors.value.length} Dokter`, note: 'Jadwal praktik aktif' }
])

const showClinicTourModal = ref(false)
const activeTourIndex = ref(0)
const tourSlides = [
  {
    src: '/images/treatment-room-autoclave.jpg',
    title: 'Ruang Tindakan Dental Unit & Sterilisasi Autoklaf Kelas B',
    desc: 'Dilengkapi kamera intraoral digital, monitor klinis, serta instrumen medis tersegel sesuai standar PPI.'
  },
  {
    src: '/images/hero-dental-clinic.jpg',
    title: 'Suite Perawatan Privat dengan Pencahayaan Alami',
    desc: 'Tata ruang tenang bernuansa mint untuk meminimalkan kecemasan pasien selama konsultasi dan tindakan.'
  },
  {
    src: '/images/patient-smile-care.jpg',
    title: 'Pendampingan & Edukasi Kondisi Gigi Secara Transparan',
    desc: 'Dokter menjelaskan peta Odontogram FDI dan rencana perawatan secara jelas sebelum tindakan dimulai.'
  }
]
</script>

<template>
  <div>
    <LandingHeroSection />

    <div v-if="pending" class="bg-white max-w-[1440px] mx-auto px-5 lg:px-20 py-10">
      <CommonLoadingSkeleton :rows="3" />
    </div>
    <div v-else-if="error" class="bg-white max-w-[1440px] mx-auto px-5 lg:px-20 py-10">
      <CommonErrorState message="Gagal memuat data klinik dari server." @retry="refresh" />
    </div>

    <section class="bg-white rounded-t-lg">
      <div class="max-w-[1440px] mx-auto px-5 lg:px-20 pt-8 pb-14 flex flex-col gap-11">
        <div class="overflow-x-auto">
          <div class="flex items-start justify-between min-w-max gap-4" role="tablist" aria-label="Kategori layanan">
            <button
              v-for="(t, i) in tabs"
              :key="t"
              type="button"
              role="tab"
              :aria-selected="activeTab === i"
              class="min-h-11 w-[210px] flex flex-col items-center justify-end gap-[10px] cursor-pointer"
              @click="activeTab = i"
            >
              <span class="flex items-center gap-2">
                <img src="/figma/tooth.svg" alt="" width="20" height="20" class="size-5">
                <span
                  class="text-[13px] whitespace-nowrap"
                  :class="activeTab === i ? 'font-bold text-[#137A7F]' : 'font-medium text-[#475569]'"
                >{{ t }}</span>
              </span>
              <span class="w-full" :class="activeTab === i ? 'h-[3px] bg-[#137A7F]' : 'h-px bg-[#D8E6E8]'" />
            </button>
          </div>
        </div>

        <div
          role="tabpanel"
          :aria-label="activeTabConfig.badge"
          class="bg-[#F4F9F9] border border-[#D8E6E8] rounded-lg p-5 sm:p-6 flex flex-col gap-5"
        >
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div class="flex flex-col gap-1.5 max-w-2xl">
              <p class="text-[11px] font-bold text-[#137A7F]">{{ activeTabConfig.badge }}</p>
              <h3 class="font-heading font-bold text-[20px] text-[#0B253A]">{{ activeTabConfig.title }}</h3>
              <p class="text-[13px] text-[#475569]">{{ activeTabConfig.desc }}</p>
            </div>
            <NuxtLink
              to="/services"
              class="min-h-11 px-4 rounded-md bg-white border border-[#D8E6E8] hover:border-[#137A7F] text-[13px] font-semibold text-[#137A7F] inline-flex items-center justify-center shrink-0 self-start lg:self-center"
            >
              Lihat Semua Layanan
            </NuxtLink>
          </div>

          <div v-if="activeTabServices.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              v-for="srv in activeTabServices"
              :key="srv.id"
              class="bg-white border border-[#D8E6E8] rounded-md p-4 flex flex-col justify-between gap-3"
            >
              <div class="flex flex-col gap-1">
                <span class="text-[11px] font-bold text-[#137A7F] uppercase">{{ srv.category || 'Layanan Klinis' }}</span>
                <p class="font-heading font-bold text-[15px] text-[#0B253A]">{{ srv.name }}</p>
                <p v-if="srv.shortDesc" class="text-[12px] text-[#475569] line-clamp-2">{{ srv.shortDesc }}</p>
              </div>
              <div class="flex items-center justify-between gap-2 pt-2 border-t border-[#E2ECEE]">
                <span class="text-[12px] font-bold text-[#137A7F]">{{ formatRupiah(srv.price) }} · {{ srv.durationMinutes }} mnt</span>
                <NuxtLink
                  :to="`/patient/appointments?serviceId=${srv.id}`"
                  class="text-[12px] font-semibold text-[#0B253A] hover:text-[#137A7F]"
                >
                  Booking &rarr;
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col lg:flex-row gap-12 items-center">
          <div class="flex-1 min-w-0 flex flex-col gap-4">
            <p class="text-[12px] font-bold text-[#137A7F]">TENTANG KAMI</p>
            <h2 class="font-heading font-bold text-[30px] text-[#0B253A] max-w-[580px]">
              Kami menghadirkan perawatan gigi terpersonalisasi dengan empati dan teknologi klinis mutakhir.
            </h2>
            <p class="text-[14px] text-[#475569] max-w-[560px]">
              Misi kami adalah memberikan pelayanan kedokteran gigi spesialis dalam suasana nyaman dan steril menggunakan rekam medis SOAP, peta Odontogram FDI 52 gigi, serta pengelolaan obat FEFO yang transparan.
            </p>
            <div class="flex items-center gap-[14px]">
              <div class="flex gap-[6px]">
                <span
                  v-for="ini in ['BS', 'RK', 'AF']"
                  :key="ini"
                  class="bg-[#DFF1F2] border-2 border-white rounded-full size-[38px] flex items-center justify-center text-[12px] font-bold text-[#137A7F]"
                >{{ ini }}</span>
              </div>
              <p class="text-[13px] font-semibold text-[#475569]">
                Dipercaya oleh Pasien &amp; Keluarga<br>di Klinik Lumina Dental Care Pontianak
              </p>
            </div>
          </div>

          <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg overflow-hidden w-full lg:w-[560px] shrink-0 flex flex-col">
            <div class="relative h-[220px] w-full bg-[#0B253A]">
              <img
                src="/images/treatment-room-autoclave.jpg"
                alt="Pratinjau ruang tindakan dental unit dan area sterilisasi autoklaf Lumina Dental Care"
                width="560"
                height="220"
                loading="lazy"
                class="w-full h-full object-cover"
              >
              <button
                type="button"
                aria-label="Buka pratinjau tur ruang tindakan dan sterilisasi"
                class="absolute inset-0 bg-[#0B253A]/35 hover:bg-[#0B253A]/45 transition-colors flex flex-col items-center justify-center gap-2 text-white cursor-pointer"
                @click="activeTourIndex = 0; showClinicTourModal = true"
              >
                <span class="bg-white rounded-full size-14 flex items-center justify-center shadow-sm">
                  <img src="/figma/play.svg" alt="" width="22" height="22" class="size-[22px]">
                </span>
                <span class="bg-[#0B253A]/85 px-3 py-1 rounded-md text-[11px] font-semibold">
                  Lihat Tur Virtual Fasilitas (3 Foto)
                </span>
              </button>
            </div>
            <div class="p-4 flex flex-col gap-1">
              <p class="font-heading font-bold text-[15px] text-[#0B253A]">Pratinjau Ruang Tindakan Dental Unit &amp; Sterilisasi Autoklaf</p>
              <p class="text-[12px] text-[#475569]">Protokol klinis satu klinik satu cabang dengan standar higienitas tertinggi</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div
            v-for="m in metrics"
            :key="m.label"
            class="bg-white border border-[#D8E6E8] rounded-lg p-5 h-[108px] flex items-center gap-4"
          >
            <span class="bg-[#DFF1F2] rounded-full size-12 shrink-0 flex items-center justify-center">
              <img src="/figma/clipboard.svg" alt="" width="22" height="22" class="size-[22px]">
            </span>
            <span class="flex flex-col gap-[3px] min-w-0">
              <span class="text-[11px] font-bold text-[#137A7F]">{{ m.label }}</span>
              <span class="font-heading font-bold text-[24px] text-[#0B253A] whitespace-nowrap">{{ m.value }}</span>
              <span class="text-[12px] text-[#475569]">{{ m.note }}</span>
            </span>
          </div>
        </div>

        <div class="flex flex-col lg:flex-row gap-7 items-start">
          <div class="flex-1 min-w-0 w-full bg-white border border-[#D8E6E8] rounded-lg p-6 flex flex-col sm:flex-row gap-6 items-start">
            <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-lg p-3 w-full sm:w-[210px] shrink-0 flex flex-col items-center gap-3">
              <img
                :src="leadDoctor?.photoUrl || '/images/lead-doctor-amanda.jpg'"
                :alt="`Foto ${leadDoctor ? `${leadDoctor.titlePrefix || ''} ${leadDoctor.fullName}`.trim() : 'drg. Amanda Putri'}`"
                width="210"
                height="210"
                loading="lazy"
                class="w-full h-[196px] object-cover object-top rounded-md border border-[#D8E6E8] bg-white"
              >
              <p class="font-heading font-bold text-[15px] text-[#0B253A] text-center">
                {{ leadDoctor ? `${leadDoctor.titlePrefix || ''} ${leadDoctor.fullName}`.trim() : 'drg. Amanda Putri' }}
              </p>
              <span class="bg-[#DFF1F2] border border-[#D8E6E8] rounded-full px-[14px] py-[6px] text-[11px] font-bold text-[#137A7F] text-center">
                {{ leadDoctor ? leadDoctor.specialization : 'Sp.KG · Konservasi' }}
              </span>
            </div>
            <div class="flex-1 min-w-0 flex flex-col gap-[10px] items-start">
              <p class="text-[11px] font-bold text-[#137A7F]">DOKTER SPESIALIS UTAMA</p>
              <p class="font-heading font-bold text-[22px] text-[#0B253A]">
                {{ leadDoctor ? `${leadDoctor.titlePrefix || ''} ${leadDoctor.fullName}${leadDoctor.titleSuffix ? ', ' + leadDoctor.titleSuffix : ''}`.trim() : 'drg. Amanda Putri, Sp.KG' }}
              </p>
              <p class="text-[13px] font-medium text-[#475569]">
                {{ leadDoctor?.education || 'Spesialis Konservasi Gigi · SIP 446/011/DINKES-PTK' }}
              </p>
              <p class="text-[12px] font-bold text-[#137A7F]">★ {{ rating.split(' ')[0] }} (Ulasan Pasien Terverifikasi Database)</p>
              <div
                v-for="c in [
                  `${leadDoctor?.experienceYears || 8}+ Tahun Pengalaman Klinis Endodontik`,
                  'Spesialis Restorasi Estetik & Saluran Akar',
                  'Pencatatan Peta Odontogram FDI 52 Gigi'
                ]"
                :key="c"
                class="flex items-center gap-2"
              >
                <img src="/figma/check.svg" alt="" width="18" height="18" class="size-[18px]">
                <span class="text-[13px] font-medium text-[#0B253A]">{{ c }}</span>
              </div>
            </div>
          </div>

          <div class="bg-[#F4F9F9] border border-[#D8E6E8] rounded-lg p-6 w-full lg:w-[500px] shrink-0 flex flex-col gap-4">
            <p class="font-heading font-bold text-[18px] text-[#0B253A]">Klinik Modern &amp; Antrean Real-Time</p>
            <img
              src="/images/patient-smile-care.jpg"
              alt="Konsultasi pasien bersama dokter gigi di Lumina Dental Care"
              width="460"
              height="160"
              loading="lazy"
              class="w-full h-[145px] object-cover rounded-md border border-[#D8E6E8]"
            >
            <div class="bg-[#EAF5F6] border border-[#D8E6E8] rounded-md p-[18px] flex flex-col gap-2">
              <p class="text-[13px] font-semibold text-[#137A7F]">Ruang Tindakan Dental Unit Digital &amp; Radiografi Intraoral</p>
              <p class="text-[12px] text-[#475569]">Terhubung langsung dengan papan antrean resepsionis, rekam medis dokter, dan kasir.</p>
            </div>
            <div class="bg-white border border-[#D8E6E8] rounded-lg p-[18px] flex flex-col gap-3">
              <p class="text-[13px] font-bold text-[#0B253A]">Appointment Klinik Hari Ini</p>
              <div class="flex gap-8">
                <div class="flex flex-col gap-0.5">
                  <span class="font-heading font-bold text-[24px] text-[#0B253A]">{{ data?.today?.completed ?? 0 }}</span>
                  <span class="text-[12px] text-[#475569]">Selesai Diperiksa</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="font-heading font-bold text-[24px] text-[#137A7F]">{{ data?.today?.confirmed ?? 0 }}</span>
                  <span class="text-[12px] text-[#475569]">Jadwal Terkonfirmasi</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Jadwal Operasional Mingguan & Pemberitahuan Libur / Penyesuaian Jam Terdekat -->
        <div class="bg-[#F4F9F9] border border-[#D8E6E8] rounded-lg p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="space-y-3">
            <div>
              <p class="text-[11px] font-bold text-[#137A7F]">JADWAL OPERASIONAL KLINIK</p>
              <h3 class="font-heading font-bold text-[18px] text-[#0B253A]">
                Jam Praktek Mingguan Lumina Dental Care
              </h3>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div
                v-for="day in clinicScheduleRes?.config?.weeklyHours || []"
                :key="day.dayOfWeek"
                class="p-2.5 rounded-md border text-xs"
                :class="
                  day.dayOfWeek === 0 || !day.isOpen
                    ? 'bg-[#FFF1F2] border-rose-200 text-[#BE123C]'
                    : 'bg-white border-[#D8E6E8] text-[#0B253A]'
                "
              >
                <strong class="block">{{ day.label }}</strong>
                <span class="text-[11px] font-semibold">
                  {{ day.dayOfWeek === 0 || !day.isOpen ? 'Libur' : `${day.openTime} - ${day.closeTime}` }}
                </span>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <p class="text-[11px] font-bold text-[#137A7F]">PEMBERITAHUAN TERDEKAT</p>
              <h3 class="font-heading font-bold text-[18px] text-[#0B253A]">
                Info Hari Libur Nasional &amp; Penyesuaian Jam Praktek
              </h3>
            </div>
            <div v-if="(clinicScheduleRes?.upcomingNotices || []).length" class="space-y-2">
              <div
                v-for="notice in clinicScheduleRes?.upcomingNotices || []"
                :key="notice.date"
                class="p-3 rounded-md border bg-white flex flex-wrap items-center justify-between gap-2 text-xs"
                :class="notice.status === 'REDUCED_HOURS' ? 'border-amber-300' : 'border-rose-200'"
              >
                <div>
                  <strong class="text-[#0B253A]">{{ formatDateId(notice.date) }}</strong>
                  <span class="text-[#475569] block">{{ notice.reason }}</span>
                </div>
                <span
                  class="px-2.5 py-1 rounded-md text-[11px] font-bold"
                  :class="notice.status === 'REDUCED_HOURS' ? 'bg-[#FFFBEB] text-[#B45309]' : 'bg-[#FFF1F2] text-[#BE123C]'"
                >
                  {{ notice.badge }}
                </span>
              </div>
            </div>
            <p v-else class="text-xs text-[#475569] bg-white border border-[#D8E6E8] rounded-md p-3.5">
              Seluruh jadwal praktek Senin–Sabtu berjalan normal. Hari Minggu &amp; tanggal merah pemerintah otomatis libur.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Modal Tur Virtual Ruang Tindakan & Sterilisasi -->
    <div
      v-if="showClinicTourModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clinic-tour-title"
      class="fixed inset-0 z-50 bg-[#0B253A]/60 flex items-center justify-center p-4"
      @click.self="showClinicTourModal = false"
    >
      <div class="bg-white border border-[#D8E6E8] rounded-lg max-w-2xl w-full p-5 sm:p-6 flex flex-col gap-4 shadow-xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[11px] font-bold text-[#137A7F]">TUR VIRTUAL FASILITAS KLINIK</p>
            <h3 id="clinic-tour-title" class="font-heading font-bold text-[18px] text-[#0B253A]">
              {{ tourSlides[activeTourIndex]?.title }}
            </h3>
          </div>
          <button
            type="button"
            class="min-h-11 px-3 rounded-md border border-[#D8E6E8] text-[13px] font-semibold text-[#0B253A] hover:bg-[#EAF5F6]"
            @click="showClinicTourModal = false"
          >
            Tutup
          </button>
        </div>

        <img
          :src="tourSlides[activeTourIndex]?.src"
          :alt="tourSlides[activeTourIndex]?.title"
          width="640"
          height="360"
          class="w-full h-[260px] sm:h-[340px] object-cover rounded-md border border-[#D8E6E8]"
        >

        <p class="text-[13px] text-[#475569]">
          {{ tourSlides[activeTourIndex]?.desc }}
        </p>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(slide, idx) in tourSlides"
              :key="slide.src"
              type="button"
              class="min-h-11 px-3.5 rounded-md text-[12px] font-semibold border transition-colors"
              :class="activeTourIndex === idx ? 'bg-[#137A7F] border-[#137A7F] text-white' : 'bg-[#F4F9F9] border-[#D8E6E8] text-[#0B253A] hover:bg-[#EAF5F6]'"
              @click="activeTourIndex = idx"
            >
              Foto {{ idx + 1 }}
            </button>
          </div>
          <NuxtLink
            to="/patient/appointments"
            class="min-h-11 px-4 rounded-md bg-[#137A7F] hover:bg-[#0E5F63] text-white text-[13px] font-semibold inline-flex items-center"
            @click="showClinicTourModal = false"
          >
            Booking Kunjungan
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
