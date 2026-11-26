export type ClinicDayStatusType =
  | 'OPEN'
  | 'REDUCED_HOURS'
  | 'SPECIAL_PRACTICE'
  | 'HOLIDAY_SUNDAY'
  | 'HOLIDAY_NATIONAL'
  | 'SPECIAL_CLOSED'
  | 'DOCTOR_LEAVE'
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

export interface SpecialPracticeDate {
  date: string // YYYY-MM-DD
  reason: string
  openTime?: string // HH:mm
  closeTime?: string // HH:mm
}

export type DoctorLeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface DoctorLeaveRequestItem {
  id: string
  doctorId: string
  doctorName?: string
  leaveDate: string // YYYY-MM-DD
  reason: string
  status: DoctorLeaveStatus
  approvedBy?: string | null
  createdAt: string
  updatedAt: string
}

export interface ClinicScheduleConfig {
  slotIntervalMinutes: 30 | 60
  followNationalHolidays: boolean
  defaultMonthlyLeaveQuota: number
  doctorLeaveQuotas: Record<string, number>
  weeklyHours: WeeklyDaySchedule[]
  specialOverrides: Record<string, SpecialScheduleOverride>
  specialPracticeDates: Record<string, SpecialPracticeDate>
  doctorLeaveRequests: DoctorLeaveRequestItem[]
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
    followNationalHolidays: true,
    defaultMonthlyLeaveQuota: 4,
    doctorLeaveQuotas: {},
    weeklyHours: [
      { dayOfWeek: 0, label: 'Minggu', isOpen: false, openTime: '00:00', closeTime: '00:00' },
      { dayOfWeek: 1, label: 'Senin', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 2, label: 'Selasa', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 3, label: 'Rabu', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 4, label: 'Kamis', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 5, label: 'Jumat', isOpen: true, openTime: '09:00', closeTime: '20:00' },
      { dayOfWeek: 6, label: 'Sabtu', isOpen: true, openTime: '09:00', closeTime: '17:00' }
    ],
    specialOverrides: {},
    specialPracticeDates: {},
    doctorLeaveRequests: []
  }
}

export function normalizeClinicScheduleConfig(rawJson: unknown): ClinicScheduleConfig {
  const defaults = createDefaultClinicScheduleConfig()
  if (!rawJson || typeof rawJson !== 'object') return defaults

  const obj = rawJson as Record<string, unknown>
  const slotIntervalMinutes = obj.slotIntervalMinutes === 60 ? 60 : 30
  const followNationalHolidays =
    typeof obj.followNationalHolidays === 'boolean' ? obj.followNationalHolidays : true
  const defaultMonthlyLeaveQuota =
    typeof obj.defaultMonthlyLeaveQuota === 'number' && obj.defaultMonthlyLeaveQuota >= 0
      ? Math.min(31, Math.floor(obj.defaultMonthlyLeaveQuota))
      : 4

  const doctorLeaveQuotas: Record<string, number> = {}
  if (obj.doctorLeaveQuotas && typeof obj.doctorLeaveQuotas === 'object') {
    for (const [docId, q] of Object.entries(obj.doctorLeaveQuotas as Record<string, unknown>)) {
      if (typeof q === 'number' && q >= 0) {
        doctorLeaveQuotas[docId] = Math.min(31, Math.floor(q))
      }
    }
  }

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

  const specialPracticeDates: Record<string, SpecialPracticeDate> = {}
  if (obj.specialPracticeDates && typeof obj.specialPracticeDates === 'object') {
    for (const [dateKey, val] of Object.entries(obj.specialPracticeDates as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !val || typeof val !== 'object') continue
      const v = val as Record<string, unknown>
      specialPracticeDates[dateKey] = {
        date: dateKey,
        reason: typeof v.reason === 'string' ? v.reason : 'Hari Praktik Khusus',
        openTime: typeof v.openTime === 'string' ? v.openTime : '09:00',
        closeTime: typeof v.closeTime === 'string' ? v.closeTime : '17:00'
      }
    }
  }

  const doctorLeaveRequests: DoctorLeaveRequestItem[] = []
  if (Array.isArray(obj.doctorLeaveRequests)) {
    for (const item of obj.doctorLeaveRequests) {
      if (!item || typeof item !== 'object') continue
      const r = item as Record<string, unknown>
      if (typeof r.id !== 'string' || typeof r.doctorId !== 'string' || typeof r.leaveDate !== 'string') {
        continue
      }
      const status: DoctorLeaveStatus =
        r.status === 'APPROVED' || r.status === 'REJECTED' ? r.status : 'PENDING'
      doctorLeaveRequests.push({
        id: r.id,
        doctorId: r.doctorId,
        doctorName: typeof r.doctorName === 'string' ? r.doctorName : undefined,
        leaveDate: r.leaveDate,
        reason: typeof r.reason === 'string' ? r.reason : '-',
        status,
        approvedBy: typeof r.approvedBy === 'string' ? r.approvedBy : null,
        createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
        updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString()
      })
    }
  }

  return {
    slotIntervalMinutes,
    followNationalHolidays,
    defaultMonthlyLeaveQuota,
    doctorLeaveQuotas,
    weeklyHours,
    specialOverrides,
    specialPracticeDates,
    doctorLeaveRequests
  }
}

export function evaluateDoctorLeaveQuota(
  doctorId: string,
  monthPrefix: string, // YYYY-MM
  config: ClinicScheduleConfig
) {
  const quota = config.doctorLeaveQuotas[doctorId] ?? config.defaultMonthlyLeaveQuota ?? 4
  const monthLeaves = config.doctorLeaveRequests.filter(
    (r) => r.doctorId === doctorId && r.leaveDate.startsWith(monthPrefix)
  )
  const approvedCount = monthLeaves.filter((r) => r.status === 'APPROVED').length
  const pendingCount = monthLeaves.filter((r) => r.status === 'PENDING').length
  const remaining = Math.max(0, quota - approvedCount)
  const canRequest = approvedCount + pendingCount < quota
  return {
    doctorId,
    monthPrefix,
    quota,
    used: approvedCount,
    pending: pendingCount,
    remaining,
    canRequest
  }
}

function toMinutes(timeStr: string): number {
  const [hh, mm] = timeStr.split(':').map(Number)
  if (hh === undefined || mm === undefined || Number.isNaN(hh) || Number.isNaN(mm)) return -1
  return hh * 60 + mm
}

export function evaluateClinicDateStatus(
  dateStr: string,
  config: ClinicScheduleConfig,
  dbHolidays: Record<string, string> = {},
  doctorId?: string
): EvaluatedClinicDate {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  const dayOfWeek = Number.isNaN(d.getTime()) ? 1 : d.getUTCDay()

  // 0. Hari Praktik Khusus: Admin mengaktifkan praktik pada tanggal libur tertentu
  const specialPractice = config.specialPracticeDates[dateStr]
  if (specialPractice) {
    // Tetap cek jika dokter tertentu sedang cuti APPROVED
    if (doctorId) {
      const approvedLeave = config.doctorLeaveRequests.find(
        (r) => r.doctorId === doctorId && r.leaveDate === dateStr && r.status === 'APPROVED'
      )
      if (approvedLeave) {
        return {
          date: dateStr,
          dayOfWeek,
          status: 'DOCTOR_LEAVE',
          isOpen: false,
          isHoliday: false,
          isSunday: false,
          isReducedHours: false,
          badge: 'Libur Dokter',
          reason: `Dokter sedang libur/cuti (${approvedLeave.reason})`,
          openTime: null,
          closeTime: null
        }
      }
    }

    return {
      date: dateStr,
      dayOfWeek,
      status: 'SPECIAL_PRACTICE',
      isOpen: true,
      isHoliday: false,
      isSunday: dayOfWeek === 0,
      isReducedHours: false,
      badge: 'Hari Praktik Khusus',
      reason: specialPractice.reason || 'Hari Praktik Khusus diaktifkan Admin',
      openTime: specialPractice.openTime || '09:00',
      closeTime: specialPractice.closeTime || '17:00'
    }
  }

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
  const dbHolidayName = dbHolidays[dateStr]
  const nationalHolidayName =
    config.followNationalHolidays !== false ? INDONESIA_NATIONAL_HOLIDAYS[dateStr] : undefined
  if (nationalHolidayName) {
    return {
      date: dateStr,
      dayOfWeek,
      status: 'HOLIDAY_NATIONAL',
      isOpen: false,
      isHoliday: true,
      isSunday: false,
      isReducedHours: false,
      badge: 'Libur Nasional',
      reason: `Hari Libur Nasional: ${nationalHolidayName}`,
      openTime: null,
      closeTime: null
    }
  }
  if (dbHolidayName) {
    return {
      date: dateStr,
      dayOfWeek,
      status: 'SPECIAL_CLOSED',
      isOpen: false,
      isHoliday: true,
      isSunday: false,
      isReducedHours: false,
      badge: 'Libur Klinik',
      reason: `Libur Klinik: ${dbHolidayName}`,
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
      badge: 'Libur Klinik',
      reason: override.reason || 'Libur Khusus / Cuti Dokter',
      openTime: null,
      closeTime: null
    }
  }

  // 4. Cek Cuti / Libur Dokter yang sudah Approved
  if (doctorId) {
    const approvedLeave = config.doctorLeaveRequests.find(
      (r) => r.doctorId === doctorId && r.leaveDate === dateStr && r.status === 'APPROVED'
    )
    if (approvedLeave) {
      return {
        date: dateStr,
        dayOfWeek,
        status: 'DOCTOR_LEAVE',
        isOpen: false,
        isHoliday: false,
        isSunday: false,
        isReducedHours: false,
        badge: 'Libur Dokter',
        reason: `Dokter sedang libur/cuti (${approvedLeave.reason})`,
        openTime: null,
        closeTime: null
      }
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
      badge: 'Libur Klinik',
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
    badge: 'Hari Kerja',
    reason: `Operasional reguler (${dayRule.openTime} - ${dayRule.closeTime} WIB)`,
    openTime: dayRule.openTime,
    closeTime: dayRule.closeTime
  }
}
