import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'
import {
  evaluateDoctorLeaveQuota,
  normalizeClinicScheduleConfig
} from '../../../app/utils/clinicScheduleRules'

const createLeaveSchema = z.object({
  doctorId: z.string().optional(),
  leaveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal cuti harus YYYY-MM-DD'),
  reason: z.string().trim().min(3, 'Alasan hari libur wajib diisi minimal 3 karakter').max(200)
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['DOCTOR', 'ADMIN'])
  const rawBody = await readBody(event)
  const parsed = createLeaveSchema.safeParse(rawBody)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Pengajuan hari libur tidak valid.'
    })
  }

  const targetDoctorId =
    actor.role === 'DOCTOR' ? actor.doctorId : parsed.data.doctorId || actor.doctorId
  if (!targetDoctorId) {
    throw createError({ statusCode: 400, statusMessage: 'Dokter wajib dipilih.' })
  }

  const [doctor, setting] = await Promise.all([
    prisma.doctor.findUnique({ where: { id: targetDoctorId } }),
    prisma.clinicSetting.findFirst()
  ])

  if (!doctor) {
    throw createError({ statusCode: 404, statusMessage: 'Profil dokter tidak ditemukan.' })
  }

  const config = normalizeClinicScheduleConfig(setting?.operatingHoursJson)
  const monthPrefix = parsed.data.leaveDate.slice(0, 7)
  const quotaCheck = evaluateDoctorLeaveQuota(targetDoctorId, monthPrefix, config)

  if (!quotaCheck.canRequest) {
    throw createError({
      statusCode: 400,
      statusMessage: `Kuota libur bulan ${monthPrefix} sudah habis (maksimal ${quotaCheck.quota} hari/bulan, terpakai ${quotaCheck.used}, menunggu ${quotaCheck.pending}).`
    })
  }

  const duplicate = config.doctorLeaveRequests.find(
    (r) =>
      r.doctorId === targetDoctorId &&
      r.leaveDate === parsed.data.leaveDate &&
      r.status !== 'REJECTED'
  )
  if (duplicate) {
    throw createError({
      statusCode: 400,
      statusMessage: `Sudah terdapat pengajuan libur pada tanggal ${parsed.data.leaveDate}.`
    })
  }

  const nowIso = new Date().toISOString()
  const newRequest = {
    id: randomUUID(),
    doctorId: targetDoctorId,
    doctorName: `${doctor.titlePrefix || 'drg.'} ${doctor.fullName}`,
    leaveDate: parsed.data.leaveDate,
    reason: parsed.data.reason,
    status: (actor.role === 'ADMIN' ? 'APPROVED' : 'PENDING') as 'APPROVED' | 'PENDING',
    approvedBy: actor.role === 'ADMIN' ? actor.fullName : null,
    createdAt: nowIso,
    updatedAt: nowIso
  }

  const updatedConfig = normalizeClinicScheduleConfig({
    ...config,
    doctorLeaveRequests: [newRequest, ...config.doctorLeaveRequests]
  })

  if (setting) {
    await prisma.clinicSetting.update({
      where: { id: setting.id },
      data: { operatingHoursJson: updatedConfig as unknown as object }
    })
  } else {
    await prisma.clinicSetting.create({
      data: {
        clinicName: 'Lumina Dental Care',
        tagline: 'Klinik Gigi Spesialis & Keluarga',
        address: 'Pontianak',
        phone: '0561-700000',
        email: 'halo@luminadental.id',
        operatingHoursJson: updatedConfig as unknown as object
      }
    })
  }

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'DOCTOR_LEAVE_REQUEST',
    entityType: 'DoctorLeaveRequest',
    entityId: newRequest.id,
    afterJson: newRequest
  })

  return {
    success: true,
    message:
      newRequest.status === 'APPROVED'
        ? 'Hari libur dokter langsung disetujui dan jam praktik tanggal tersebut dinonaktifkan.'
        : 'Pengajuan hari libur berhasil dikirim ke Admin untuk persetujuan.',
    request: newRequest
  }
})
