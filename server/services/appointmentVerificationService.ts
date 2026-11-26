import { prisma } from '../utils/prisma'
import {
  evaluateClinicDateStatus,
  normalizeClinicScheduleConfig
} from '../../app/utils/clinicScheduleRules'

export interface AppointmentVerificationInput {
  patientId: string
  doctorId: string
  serviceId: string
  appointmentDate: string // YYYY-MM-DD
  startTime: string // HH:mm
  excludeAppointmentId?: string
}

export interface AppointmentVerificationResult {
  valid: boolean
  errors: string[]
  computedEndTime?: string
  slotKey?: string
  normalizedDate?: Date
}

export function timeToMinutes(timeStr: string): number {
  const [hh, mm] = timeStr.split(':').map(Number)
  if (hh === undefined || mm === undefined || Number.isNaN(hh) || Number.isNaN(mm)) {
    return -1
  }
  return hh * 60 + mm
}

export function minutesToTime(totalMinutes: number): string {
  const hh = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function hasTimeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeToMinutes(startA)
  const eA = timeToMinutes(endA)
  const sB = timeToMinutes(startB)
  const eB = timeToMinutes(endB)
  return sA < eB && sB < eA
}

export function buildSlotKey(doctorId: string, dateStr: string, startTime: string): string {
  return `${doctorId}_${dateStr}_${startTime}`
}

/**
 * Sistem Verifikasi Otomatis Appointment (PRD Bab 11)
 * Memeriksa 8 kriteria wajib sebelum mengonfirmasi appointment menjadi CONFIRMED.
 */
export async function verifyAppointmentRequest(
  input: AppointmentVerificationInput
): Promise<AppointmentVerificationResult> {
  const errors: string[] = []

  // Validasi format tanggal & jam
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.appointmentDate)) {
    return { valid: false, errors: ['Format tanggal kunjungan harus YYYY-MM-DD.'] }
  }
  const startMin = timeToMinutes(input.startTime)
  if (startMin < 0 || startMin >= 24 * 60) {
    return { valid: false, errors: ['Format waktu mulai tidak valid (gunakan HH:mm).'] }
  }

  const normalizedDate = new Date(`${input.appointmentDate}T00:00:00.000Z`)
  const dayEnd = new Date(`${input.appointmentDate}T23:59:59.999Z`)
  const dayOfWeek = normalizedDate.getUTCDay()

  // Validasi waktu tidak boleh sudah terlewat (Asia/Jakarta UTC+7)
  const wibNow = new Date(Date.now() + 7 * 60 * 60 * 1000)
  const todayWibStr = wibNow.toISOString().slice(0, 10)
  const nowMinutesWib = wibNow.getUTCHours() * 60 + wibNow.getUTCMinutes()
  if (input.appointmentDate < todayWibStr) {
    errors.push('Tanggal kunjungan sudah terlewat. Silakan pilih tanggal hari ini atau mendatang.')
  } else if (input.appointmentDate === todayWibStr && startMin <= nowMinutesWib) {
    errors.push('Slot waktu yang dipilih sudah terlewat. Silakan pilih jam praktik yang masih tersedia.')
  }

  const [patient, doctor, service, holiday, clinicSetting, allHolidays] = await Promise.all([
    prisma.patient.findUnique({ where: { id: input.patientId } }),
    prisma.doctor.findUnique({
      where: { id: input.doctorId },
      include: { schedules: { where: { dayOfWeek, isActive: true } } }
    }),
    prisma.service.findUnique({ where: { id: input.serviceId } }),
    prisma.clinicHoliday.findUnique({ where: { date: normalizedDate } }),
    prisma.clinicSetting.findFirst(),
    prisma.clinicHoliday.findMany()
  ])

  // 1. Data pasien valid
  if (!patient || !patient.fullName || !patient.phone) {
    errors.push('Data pasien tidak ditemukan atau belum lengkap.')
  }

  // 2. Dokter tersedia
  if (!doctor || !doctor.isActive) {
    errors.push('Dokter yang dipilih sedang tidak aktif atau tidak tersedia.')
  }

  // 3. Layanan tersedia & durasi sesuai
  if (!service || !service.isActive) {
    errors.push('Layanan perawatan gigi yang dipilih sedang tidak tersedia.')
  }

  const durationMinutes = service?.durationMinutes && service.durationMinutes > 0 ? service.durationMinutes : 30
  const endMin = startMin + durationMinutes
  const computedEndTime = minutesToTime(endMin)

  // 4. Klinik & Dokter beroperasi pada waktu tersebut (bukan libur nasional, cuti dokter, & sesuai jam operasional)
  const scheduleConfig = normalizeClinicScheduleConfig(clinicSetting?.operatingHoursJson)
  const dbHolidayMap: Record<string, string> = {}
  for (const h of allHolidays) {
    dbHolidayMap[h.date.toISOString().slice(0, 10)] = h.name
  }
  const clinicDayStatus = evaluateClinicDateStatus(
    input.appointmentDate,
    scheduleConfig,
    dbHolidayMap,
    input.doctorId
  )

  if (holiday && clinicDayStatus.status !== 'SPECIAL_PRACTICE') {
    errors.push(`Klinik tutup pada tanggal ${input.appointmentDate} (${holiday.name}).`)
  }

  if (!clinicDayStatus.isOpen) {
    errors.push(clinicDayStatus.reason)
  } else if (clinicDayStatus.openTime && clinicDayStatus.closeTime) {
    const clinicOpenMin = timeToMinutes(clinicDayStatus.openTime)
    const clinicCloseMin = timeToMinutes(clinicDayStatus.closeTime)
    if (startMin < clinicOpenMin || endMin > clinicCloseMin) {
      errors.push(
        `Waktu kunjungan berada di luar jam operasional klinik (${clinicDayStatus.openTime} - ${clinicDayStatus.closeTime} WIB).`
      )
    }
  }

  // 5. Dokter memiliki jadwal praktik pada hari & jam tersebut (atau Hari Praktik Khusus)
  if (doctor) {
    const matchingSchedule = doctor.schedules.find((sch) => {
      const schStart = timeToMinutes(sch.startTime)
      const schEnd = timeToMinutes(sch.endTime)
      return startMin >= schStart && endMin <= schEnd
    })

    if (!matchingSchedule && clinicDayStatus.status !== 'SPECIAL_PRACTICE') {
      errors.push('Dokter tidak memiliki jadwal praktik pada hari dan rentang jam yang dipilih.')
    } else if (matchingSchedule) {
      // Periksa kuota maksimum pasien pada jadwal tersebut
      const activeCount = await prisma.appointment.count({
        where: {
          doctorId: input.doctorId,
          appointmentDate: { gte: normalizedDate, lte: dayEnd },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_TREATMENT', 'COMPLETED'] },
          ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {})
        }
      })
      if (activeCount >= matchingSchedule.maxPatients) {
        errors.push('Kuota pasien dokter pada jadwal praktik hari tersebut sudah penuh.')
      }
    }
  }

  // 6 & 7. Slot masih tersedia & tidak ada konflik jadwal (dokter maupun pasien)
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: normalizedDate, lte: dayEnd },
      status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_TREATMENT', 'COMPLETED'] },
      OR: [{ doctorId: input.doctorId }, { patientId: input.patientId }],
      ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {})
    }
  })

  for (const appt of existingAppointments) {
    if (
      appt.doctorId === input.doctorId &&
      hasTimeOverlap(input.startTime, computedEndTime, appt.startTime, appt.endTime)
    ) {
      errors.push(
        `Slot waktu ${input.startTime} - ${computedEndTime} sudah terisi untuk dokter ini. Silakan pilih slot waktu lain.`
      )
      break
    }
    if (
      appt.patientId === input.patientId &&
      hasTimeOverlap(input.startTime, computedEndTime, appt.startTime, appt.endTime)
    ) {
      errors.push(
        `Pasien sudah memiliki jadwal appointment aktif pada waktu yang beririsan (${appt.startTime} - ${appt.endTime}).`
      )
      break
    }
  }

  const slotKey = buildSlotKey(input.doctorId, input.appointmentDate, input.startTime)

  return {
    valid: errors.length === 0,
    errors,
    computedEndTime,
    slotKey,
    normalizedDate
  }
}
