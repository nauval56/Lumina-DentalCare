import { getQuery, createError, setHeader } from 'h3'
import { prisma } from '../../utils/prisma'
import {
  timeToMinutes,
  minutesToTime,
  hasTimeOverlap
} from '../../services/appointmentVerificationService'
import {
  evaluateClinicDateStatus,
  normalizeClinicScheduleConfig
} from '../../../app/utils/clinicScheduleRules'

function getNowWib() {
  const now = new Date()
  // Asia/Jakarta (UTC+7)
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return {
    dateStr: wib.toISOString().slice(0, 10),
    minutes: wib.getUTCHours() * 60 + wib.getUTCMinutes()
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const doctorId = String(query.doctorId || '').trim()
  const dateStr = String(query.date || '').trim()
  const serviceId = String(query.serviceId || '').trim()

  if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parameter doctorId dan date (YYYY-MM-DD) wajib diisi.'
    })
  }

  const nowWib = getNowWib()
  if (dateStr < nowWib.dateStr) {
    return {
      available: false,
      reason: 'Tanggal kunjungan yang dipilih sudah terlewat.',
      slots: []
    }
  }

  setHeader(event, 'Cache-Control', 'no-store')
  const normalizedDate = new Date(`${dateStr}T00:00:00.000Z`)
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`)
  const dayOfWeek = normalizedDate.getUTCDay()

  const [doctor, service, holiday, clinicSetting, allHolidays, existingAppointments] = await Promise.all([
    prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        schedules: {
          where: { dayOfWeek, isActive: true },
          orderBy: { startTime: 'asc' }
        }
      }
    }),
    serviceId ? prisma.service.findUnique({ where: { id: serviceId } }) : Promise.resolve(null),
    prisma.clinicHoliday.findUnique({ where: { date: normalizedDate } }),
    prisma.clinicSetting.findFirst(),
    prisma.clinicHoliday.findMany(),
    prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: normalizedDate, lte: dayEnd },
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_TREATMENT', 'COMPLETED'] }
      },
      select: { startTime: true, endTime: true, status: true }
    })
  ])

  const scheduleConfig = normalizeClinicScheduleConfig(clinicSetting?.operatingHoursJson)
  const dbHolidayMap: Record<string, string> = {}
  for (const h of allHolidays) {
    dbHolidayMap[h.date.toISOString().slice(0, 10)] = h.name
  }
  const clinicDayStatus = evaluateClinicDateStatus(dateStr, scheduleConfig, dbHolidayMap, doctorId)

  if (!doctor || !doctor.isActive) {
    return {
      available: false,
      clinicDayStatus,
      reason: 'Dokter tidak ditemukan atau sedang tidak aktif.',
      slots: []
    }
  }

  if (!clinicDayStatus.isOpen) {
    return {
      available: false,
      clinicDayStatus,
      reason: clinicDayStatus.reason,
      slots: []
    }
  }

  if (holiday && clinicDayStatus.status !== 'SPECIAL_PRACTICE') {
    return {
      available: false,
      clinicDayStatus,
      reason: `Klinik libur pada tanggal tersebut (${holiday.name}).`,
      slots: []
    }
  }

  const effectiveSchedules =
    doctor.schedules.length > 0
      ? doctor.schedules
      : clinicDayStatus.status === 'SPECIAL_PRACTICE' && clinicDayStatus.openTime && clinicDayStatus.closeTime
        ? [
            {
              startTime: clinicDayStatus.openTime,
              endTime: clinicDayStatus.closeTime,
              slotDurationMin: scheduleConfig.slotIntervalMinutes
            }
          ]
        : []

  if (effectiveSchedules.length === 0) {
    return {
      available: false,
      clinicDayStatus,
      reason: 'Dokter tidak memiliki jadwal praktik atau sedang hari libur pada hari yang dipilih.',
      slots: []
    }
  }

  const durationMin = service?.durationMinutes || 30
  const isToday = dateStr === nowWib.dateStr
  const clinicOpenMin = clinicDayStatus.openTime ? timeToMinutes(clinicDayStatus.openTime) : 9 * 60
  const clinicCloseMin = clinicDayStatus.closeTime ? timeToMinutes(clinicDayStatus.closeTime) : 20 * 60
  const slots: Array<{
    startTime: string
    endTime: string
    isAvailable: boolean
    isPast: boolean
    isBooked: boolean
    isOutsideHours: boolean
    reason?: string
  }> = []

  for (const sch of effectiveSchedules) {
    const startMin = timeToMinutes(sch.startTime)
    const endMin = timeToMinutes(sch.endTime)
    const step = scheduleConfig.slotIntervalMinutes || sch.slotDurationMin || 30

    for (let cursor = startMin; cursor + durationMin <= endMin; cursor += step) {
      const slotStart = minutesToTime(cursor)
      const slotEnd = minutesToTime(cursor + durationMin)
      const isPast = isToday && cursor <= nowWib.minutes
      const isOutsideHours = cursor < clinicOpenMin || cursor + durationMin > clinicCloseMin
      const isBooked = existingAppointments.some((appt) =>
        hasTimeOverlap(slotStart, slotEnd, appt.startTime, appt.endTime)
      )

      let reason: string | undefined
      if (isOutsideHours) {
        reason = 'Di Luar Jam Praktek'
      } else if (isBooked) {
        reason = 'Terisi Pasien'
      } else if (isPast) {
        reason = 'Waktu Terlewat'
      }

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        isAvailable: !isPast && !isBooked && !isOutsideHours,
        isPast,
        isBooked,
        isOutsideHours,
        reason
      })
    }
  }

  return {
    available: slots.some((s) => s.isAvailable),
    doctorId,
    date: dateStr,
    durationMinutes: durationMin,
    slotIntervalMinutes: scheduleConfig.slotIntervalMinutes,
    clinicDayStatus,
    slots
  }
})
