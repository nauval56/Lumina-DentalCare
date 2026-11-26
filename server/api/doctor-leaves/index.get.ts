import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import {
  evaluateDoctorLeaveQuota,
  normalizeClinicScheduleConfig
} from '../../../app/utils/clinicScheduleRules'

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN', 'DOCTOR'])
  const query = getQuery(event)
  const monthPrefix =
    typeof query.month === 'string' && /^\d{4}-\d{2}$/.test(query.month)
      ? query.month
      : new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7)

  const [setting, doctors] = await Promise.all([
    prisma.clinicSetting.findFirst(),
    prisma.doctor.findMany({
      where: { isActive: true },
      select: { id: true, titlePrefix: true, fullName: true, specialization: true },
      orderBy: { fullName: 'asc' }
    })
  ])

  const config = normalizeClinicScheduleConfig(setting?.operatingHoursJson)
  const doctorIdFilter = actor.role === 'DOCTOR' ? actor.doctorId : String(query.doctorId || '').trim()

  const requests = config.doctorLeaveRequests
    .filter((r) => (!doctorIdFilter ? true : r.doctorId === doctorIdFilter))
    .sort((a, b) => b.leaveDate.localeCompare(a.leaveDate))

  const quotaSummaries = doctors
    .filter((d) => (!doctorIdFilter ? true : d.id === doctorIdFilter))
    .map((d) => ({
      doctorName: `${d.titlePrefix || 'drg.'} ${d.fullName}`,
      ...evaluateDoctorLeaveQuota(d.id, monthPrefix, config)
    }))

  return {
    monthPrefix,
    defaultMonthlyLeaveQuota: config.defaultMonthlyLeaveQuota,
    doctorLeaveQuotas: config.doctorLeaveQuotas,
    requests,
    quotaSummaries
  }
})
