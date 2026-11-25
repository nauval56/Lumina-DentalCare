export type ClinicDayStatusType =
  | 'OPEN'
  | 'REDUCED_HOURS'
  | 'HOLIDAY_SUNDAY'
  | 'HOLIDAY_NATIONAL'
  | 'SPECIAL_CLOSED'
  | 'WEEKLY_CLOSED'

export interface WeeklyDaySchedule {
  dayOfWeek: number // 0 = Minggu .. 6 = Sabtu
  label: string
  isOpen: boolean
  openTime: string // HH:mm
  closeTime: string // HH:mm
}

export interface SpecialScheduleOverride {
  date: string // YYYY-MM-DD
  type: 'CLOSED' | 'REDUCED_HOURS'
  openTime?: string // HH:mm
  closeTime?: string // HH:mm
  reason: string
}

export interface ClinicScheduleConfig {
  slotIntervalMinutes: 30 | 60
  weeklyHours: WeeklyDaySchedule[]
  specialOverrides: Record<string, SpecialScheduleOverride>
}

export interface EvaluatedClinicDate {
  date: string
  dayOfWeek: number
  status: ClinicDayStatusType
  isOpen: boolean
  isHoliday: boolean
  isSunday: boolean
  isReducedHours: boolean
  badge: string
  reason: string
  openTime: string | null
  closeTime: string | null
}

/**
 * Daftar Hari Libur Nasional Resmi Pemerintah Indonesia (2026–2027)
 * Format YYYY-MM-DD agar kompatibel langsung dengan MySQL DATE & Laravel Carbon.
 */
export const INDONESIA_NATIONAL_HOLIDAYS: Record<string, string> = {
  '2026-01-01': 'Tahun Baru 2026 Masehi',
  '2026-01-16': 'Isra Mikraj Nabi Muhammad SAW',
  '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
  '2026-03-19': 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
  '2026-03-21': 'Hari Raya Idul Fitri 1447 Hijriah',
  '2026-03-22': 'Hari Raya Idul Fitri 1447 Hijriah (Hari Kedua)',
  '2026-04-03': 'Wafat Yesus Kristus',
  '2026-04-05': 'Kebangkitan Yesus Kristus (Paskah)',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-27': 'Hari Raya Idul Adha 1447 Hijriah',
  '2026-05-31': 'Hari Raya Waisak 2570 BE',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-16': '1 Muharam Tahun Baru Islam 1448 Hijriah',
  '2026-08-17': 'Hari Proklamasi Kemerdekaan Republik Indonesia',
  '2026-08-25': 'Maulid Nabi Muhammad SAW',
  '2026-12-25': 'Kelahiran Yesus Kristus (Hari Raya Natal)',
  '2027-01-01': 'Tahun Baru 2027 Masehi'
}

export const DEFAULT_REGULAR_OPEN = '09:00'
export const DEFAULT_REGULAR_CLOSE = '20:00'

export function createDefaultClinicScheduleConfig(): ClinicScheduleConfig {
  return {
    slotIntervalMinutes: 30,
    weeklyHours: [
      { dayOfWeek: 0, label: 'Minggu', isOpen: false, openTime: '00:00', closeTime: '00:00' },
      { dayOfWeek: 1, label: 'Senin', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 2, label: 'Selasa', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 3, label: 'Rabu', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 4, label: 'Kamis', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 5, label: 'Jumat', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 6, label: 'Sabtu', isOpen: true, openTime: '09:00', closeTime: '17:00' }
    ],
    specialOverrides: {}
  }
}

export function normalizeClinicScheduleConfig(rawJson: unknown): ClinicScheduleConfig {
  const defaults = createDefaultClinicScheduleConfig()
  if (!rawJson || typeof rawJson !== 'object') return defaults

  const obj = rawJson as Record<string, unknown>
  const slotIntervalMinutes = obj.slotIntervalMinutes === 60 ? 60 : 30

  let weeklyHours = defaults.weeklyHours
  if (Array.isArray(obj.weeklyHours) && obj.weeklyHours.length === 7) {
    weeklyHours = obj.weeklyHours.map((item: Record<string, unknown>, idx: number) => {
      const def = defaults.weeklyHours[idx]!
      if (idx === 0) {
        return { ...def, isOpen: false }
      }
      return {
        dayOfWeek: idx,
        label: typeof item.label === 'string' ? item.label : def.label,
        isOpen: typeof item.isOpen === 'boolean' ? item.isOpen : def.isOpen,
        openTime: typeof item.openTime === 'string' ? item.openTime : def.openTime,
        closeTime: typeof item.closeTime === 'string' ? item.closeTime : def.closeTime
      }
    })
  }

  const specialOverrides: Record<string, SpecialScheduleOverride> = {}
  if (obj.specialOverrides && typeof obj.specialOverrides === 'object') {
    for (const [dateKey, val] of Object.entries(obj.specialOverrides as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !val || typeof val !== 'object') continue
      const v = val as Record<string, unknown>
      specialOverrides[dateKey] = {
        date: dateKey,
        type: v.type === 'CLOSED' ? 'CLOSED' : 'REDUCED_HOURS',
        openTime: typeof v.openTime === 'string' ? v.openTime : undefined,
        closeTime: typeof v.closeTime === 'string' ? v.closeTime : undefined,
        reason: typeof v.reason === 'string' ? v.reason : 'Penyesuaian jadwal klinik'
      }
    }
  }

  return { slotIntervalMinutes, weeklyHours, specialOverrides }
}

function toMinutes(timeStr: string): number {
  const [hh, mm] = timeStr.split(':').map(Number)
  if (hh === undefined || mm === undefined || Number.isNaN(hh) || Number.isNaN(mm)) return -1
  return hh * 60 + mm
}

export function evaluateClinicDateStatus(
  dateStr: string,
  config: ClinicScheduleConfig,
  dbHolidays: Record<string, string> = {}
): EvaluatedClinicDate {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  const dayOfWeek = Number.isNaN(d.getTime()) ? 1 : d.getUTCDay()

  // 1. Aturan Libur Tetap: Setiap hari Minggu otomatis Libur
  if (dayOfWeek === 0) {
    return {
      date: dateStr,
      dayOfWeek,
      status: 'HOLIDAY_SUNDAY',
      isOpen: false,
      isHoliday: true,
      isSunday: true,
      isReducedHours: false,
      badge: 'Libur',
      reason: 'Hari Minggu (Libur Tetap Mingguan Klinik)',
      openTime: null,
      closeTime: null
    }
  }

  // 2. Tanggal Merah / Libur Nasional Pemerintah Indonesia & Libur DB
  const nationalHolidayName = dbHolidays[dateStr] || INDONESIA_NATIONAL_HOLIDAYS[dateStr]
  if (nationalHolidayName) {
    return {
      date: dateStr,
      dayOfWeek,
      status: 'HOLIDAY_NATIONAL',
      isOpen: false,
      isHoliday: true,
      isSunday: false,
      isReducedHours: false,
      badge: 'Libur',
      reason: `Hari Libur Nasional: ${nationalHolidayName}`,
      openTime: null,
      closeTime: null
    }
  }

  // 3. Aturan Fleksibel Hari Biasa (Senin - Sabtu): Override Tanggal Tertentu
  const override = config.specialOverrides[dateStr]
  if (override?.type === 'CLOSED') {
    return {
      date: dateStr,
      dayOfWeek,
      status: 'SPECIAL_CLOSED',
      isOpen: false,
      isHoliday: false,
      isSunday: false,
      isReducedHours: false,
      badge: 'Klinik Tutup',
      reason: override.reason || 'Libur Khusus / Cuti Dokter',
      openTime: null,
      closeTime: null
    }
  }

  const dayRule = config.weeklyHours.find((w) => w.dayOfWeek === dayOfWeek)
  if (!dayRule || !dayRule.isOpen) {
    return {
      date: dateStr,
      dayOfWeek,
      status: 'WEEKLY_CLOSED',
      isOpen: false,
      isHoliday: false,
      isSunday: false,
      isReducedHours: false,
      badge: 'Klinik Tutup',
      reason: 'Klinik tidak beroperasi pada hari ini',
      openTime: null,
      closeTime: null
    }
  }

  if (override?.type === 'REDUCED_HOURS' && override.openTime && override.closeTime) {
    return {
      date: dateStr,
      dayOfWeek,
      status: 'REDUCED_HOURS',
      isOpen: true,
      isHoliday: false,
      isSunday: false,
      isReducedHours: true,
      badge: 'Jam Praktek Terbatas',
      reason: override.reason || `Penyesuaian jam operasional (${override.openTime} - ${override.closeTime} WIB)`,
      openTime: override.openTime,
      closeTime: override.closeTime
    }
  }

  // Cek apakah jam mingguan lebih singkat dari jam reguler (09:00 - 20:00)
  const isShorterThanRegular =
    toMinutes(dayRule.openTime) > toMinutes(DEFAULT_REGULAR_OPEN) ||
    toMinutes(dayRule.closeTime) < toMinutes(DEFAULT_REGULAR_CLOSE)

  if (isShorterThanRegular) {
    return {
      date: dateStr,
      dayOfWeek,
      status: 'REDUCED_HOURS',
      isOpen: true,
      isHoliday: false,
      isSunday: false,
      isReducedHours: true,
      badge: 'Jam Praktek Terbatas',
      reason: `Jam operasional ${dayRule.label}: ${dayRule.openTime} - ${dayRule.closeTime} WIB`,
      openTime: dayRule.openTime,
      closeTime: dayRule.closeTime
    }
  }

  return {
    date: dateStr,
    dayOfWeek,
    status: 'OPEN',
    isOpen: true,
    isHoliday: false,
    isSunday: false,
    isReducedHours: false,
    badge: 'Buka Normal',
    reason: `Operasional reguler (${dayRule.openTime} - ${dayRule.closeTime} WIB)`,
    openTime: dayRule.openTime,
    closeTime: dayRule.closeTime
  }
}
