import { prisma } from '../../utils/prisma'
import {
  INDONESIA_NATIONAL_HOLIDAYS,
  evaluateClinicDateStatus,
  normalizeClinicScheduleConfig
} from '../../../app/utils/clinicScheduleRules'

export default defineEventHandler(async () => {
  const [setting, holidays] = await Promise.all([
    prisma.clinicSetting.findFirst(),
    prisma.clinicHoliday.findMany({ orderBy: { date: 'asc' } })
  ])

  const config = normalizeClinicScheduleConfig(setting?.operatingHoursJson)

  const dbHolidayMap: Record<string, string> = {}
  for (const h of holidays) {
    const dateStr = h.date.toISOString().slice(0, 10)
    dbHolidayMap[dateStr] = h.name
  }

  const mergedHolidays: Record<string, string> = {
    ...INDONESIA_NATIONAL_HOLIDAYS,
    ...dbHolidayMap
  }

  // Hitung pemberitahuan libur / penyesuaian jam terdekat dalam 45 hari ke depan
  const wibNow = new Date(Date.now() + 7 * 60 * 60 * 1000)
  const todayStr = wibNow.toISOString().slice(0, 10)
  const upcomingNotices: Array<{
    date: string
    status: string
    badge: string
    reason: string
    openTime: string | null
    closeTime: string | null
  }> = []

  for (let i = 0; i < 45; i++) {
    const d = new Date(wibNow.getTime() + i * 86400000)
    const dateStr = d.toISOString().slice(0, 10)
    const evaluated = evaluateClinicDateStatus(dateStr, config, dbHolidayMap)
    if (
      evaluated.status === 'HOLIDAY_NATIONAL' ||
      evaluated.status === 'SPECIAL_CLOSED' ||
      (evaluated.status === 'REDUCED_HOURS' && config.specialOverrides[dateStr])
    ) {
      upcomingNotices.push({
        date: dateStr,
        status: evaluated.status,
        badge: evaluated.badge,
        reason: evaluated.reason,
        openTime: evaluated.openTime,
        closeTime: evaluated.closeTime
      })
    }
  }

  return {
    todayStr,
    config,
    holidays: mergedHolidays,
    upcomingNotices: upcomingNotices.slice(0, 5)
  }
})
