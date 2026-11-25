export function formatRupiah(value: number | string | null | undefined): string {
  const num = Number(value ?? 0)
  if (Number.isNaN(num)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num)
}

export function formatDateId(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-'
  const d = new Date(dateInput)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(d)
}

export function formatDateTimeId(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-'
  const d = new Date(dateInput)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

const DAY_NAMES_ID: Record<number, string> = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu'
}

export function getDayNameId(dayOfWeek: number): string {
  return DAY_NAMES_ID[dayOfWeek] ?? 'Senin'
}

export function formatDayAndDateId(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-'
  const d =
    typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
      ? new Date(`${dateInput}T00:00:00`)
      : new Date(dateInput)
  if (Number.isNaN(d.getTime())) return '-'
  const dayName = getDayNameId(d.getDay())
  const datePart = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(d)
  return `${dayName}, ${datePart}`
}

export function getDateStringForDayOfWeek(dayOfWeek: number, baseDateInput?: string): string {
  const base =
    baseDateInput && /^\d{4}-\d{2}-\d{2}$/.test(baseDateInput)
      ? new Date(`${baseDateInput}T00:00:00`)
      : new Date()
  const currentDay = base.getDay()
  // Hitung tanggal pada minggu berjalan (Senin..Minggu)
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
  const targetOffset = dayOfWeek === 0 ? mondayOffset + 6 : mondayOffset + (dayOfWeek - 1)
  const target = new Date(base)
  target.setDate(base.getDate() + targetOffset)
  const yyyy = target.getFullYear()
  const mm = String(target.getMonth() + 1).padStart(2, '0')
  const dd = String(target.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function formatScheduleDayAndDate(dayOfWeek: number, baseDateInput?: string): string {
  const dateStr = getDateStringForDayOfWeek(dayOfWeek, baseDateInput)
  return formatDayAndDateId(dateStr)
}

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu Verifikasi',
  CONFIRMED: 'Terkonfirmasi',
  CHECKED_IN: 'Sudah Check-In',
  IN_TREATMENT: 'Sedang Diperiksa',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  RESCHEDULED: 'Dijadwalkan Ulang',
  NO_SHOW: 'Tidak Hadir'
}

export const QUEUE_STATUS_LABELS: Record<string, string> = {
  WAITING: 'Menunggu Panggilan',
  CALLED: 'Dipanggil',
  IN_PROGRESS: 'Di Ruang Periksa',
  COMPLETED: 'Selesai',
  SKIPPED: 'Terlewat',
  CANCELLED: 'Dibatalkan'
}

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  UNPAID: 'Belum Dibayar',
  PARTIALLY_PAID: 'Dibayar Sebagian',
  PAID: 'Lunas',
  CANCELLED: 'Dibatalkan',
  REFUNDED: 'Dikembalikan'
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu Pembayaran',
  WAITING_VERIFICATION: 'Menunggu Verifikasi',
  SUCCESS: 'Berhasil',
  FAILED: 'Gagal',
  EXPIRED: 'Kedaluwarsa',
  REFUNDED: 'Dikembalikan'
}

export const TOOTH_CONDITION_META: Record<
  string,
  { label: string; colorClass: string; fillHex: string; strokeHex: string }
> = {
  SEHAT: {
    label: 'Sehat / Normal',
    colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    fillHex: '#ECFDF5',
    strokeHex: '#10B981'
  },
  KARIES: {
    label: 'Karies / Berlubang',
    colorClass: 'bg-red-100 text-red-800 border-red-300',
    fillHex: '#FEE2E2',
    strokeHex: '#EF4444'
  },
  TAMBALAN: {
    label: 'Tambalan / Restorasi',
    colorClass: 'bg-sky-100 text-sky-800 border-sky-300',
    fillHex: '#E0F2FE',
    strokeHex: '#0EA5E9'
  },
  HILANG: {
    label: 'Gigi Hilang / Dicabut',
    colorClass: 'bg-slate-200 text-slate-700 border-slate-400',
    fillHex: '#E2E8F0',
    strokeHex: '#64748B'
  },
  SISA_AKAR: {
    label: 'Sisa Akar (Radix)',
    colorClass: 'bg-amber-100 text-amber-800 border-amber-300',
    fillHex: '#FEF3C7',
    strokeHex: '#F59E0B'
  },
  IMPLAN: {
    label: 'Implan Gigi',
    colorClass: 'bg-teal-100 text-teal-800 border-teal-300',
    fillHex: '#CCFBF1',
    strokeHex: '#14B8A6'
  },
  MAHKOTA: {
    label: 'Mahkota / Crown',
    colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    fillHex: '#E0E7FF',
    strokeHex: '#6366F1'
  },
  PERAWATAN_SALURAN_AKAR: {
    label: 'Perawatan Saluran Akar',
    colorClass: 'bg-purple-100 text-purple-800 border-purple-300',
    fillHex: '#F3E8FF',
    strokeHex: '#A855F7'
  },
  GOYANG: {
    label: 'Mobilitas / Goyang',
    colorClass: 'bg-orange-100 text-orange-800 border-orange-300',
    fillHex: '#FFEDD5',
    strokeHex: '#F97316'
  },
  FRAKTUR: {
    label: 'Fraktur / Patah',
    colorClass: 'bg-rose-100 text-rose-800 border-rose-300',
    fillHex: '#FFE4E6',
    strokeHex: '#F43F5E'
  }
}
