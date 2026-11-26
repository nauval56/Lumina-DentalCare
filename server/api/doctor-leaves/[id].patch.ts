import { z } from 'zod'
import { readBody, getRouterParam, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'
import {
  evaluateDoctorLeaveQuota,
  normalizeClinicScheduleConfig
} from '../../../app/utils/clinicScheduleRules'

const updateLeaveStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'])
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  const rawBody = await readBody(event)
  const parsed = updateLeaveStatusSchema.safeParse(rawBody)

  if (!id || !parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Permintaan persetujuan libur tidak valid.' })
  }

  const setting = await prisma.clinicSetting.findFirst()
  const config = normalizeClinicScheduleConfig(setting?.operatingHoursJson)
  const idx = config.doctorLeaveRequests.findIndex((r) => r.id === id)

  if (idx === -1 || !setting) {
    throw createError({ statusCode: 404, statusMessage: 'Pengajuan hari libur tidak ditemukan.' })
  }

  const target = config.doctorLeaveRequests[idx]!

  if (parsed.data.status === 'APPROVED' && target.status !== 'APPROVED') {
    const monthPrefix = target.leaveDate.slice(0, 7)
    const quota = evaluateDoctorLeaveQuota(target.doctorId, monthPrefix, config)
    if (quota.used >= quota.quota) {
      throw createError({
        statusCode: 400,
        statusMessage: `Tidak dapat menyetujui: kuota libur dokter bulan ${monthPrefix} sudah mencapai batas (${quota.quota} hari).`
      })
    }
  }

  const updatedItem = {
    ...target,
    status: parsed.data.status,
    approvedBy: actor.fullName,
    updatedAt: new Date().toISOString()
  }

  const nextRequests = [...config.doctorLeaveRequests]
  nextRequests[idx] = updatedItem

  const updatedConfig = normalizeClinicScheduleConfig({
    ...config,
    doctorLeaveRequests: nextRequests
  })

  await prisma.clinicSetting.update({
    where: { id: setting.id },
    data: { operatingHoursJson: updatedConfig as unknown as object }
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: `DOCTOR_LEAVE_${parsed.data.status}`,
    entityType: 'DoctorLeaveRequest',
    entityId: id,
    afterJson: updatedItem
  })

  return {
    success: true,
    message:
      parsed.data.status === 'APPROVED'
        ? 'Pengajuan hari libur dokter disetujui. Jam praktik pada tanggal tersebut dinonaktifkan.'
        : 'Pengajuan hari libur dokter ditolak.',
    request: updatedItem
  }
})
