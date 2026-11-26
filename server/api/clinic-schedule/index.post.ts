import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'
import { normalizeClinicScheduleConfig } from '../../../app/utils/clinicScheduleRules'

const scheduleConfigSchema = z.object({
  slotIntervalMinutes: z.union([z.literal(30), z.literal(60)]).optional(),
  followNationalHolidays: z.boolean().optional(),
  defaultMonthlyLeaveQuota: z.number().int().min(0).max(31).optional(),
  doctorLeaveQuotas: z.record(z.string(), z.number().int().min(0).max(31)).optional(),
  weeklyHours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        label: z.string().min(1),
        isOpen: z.boolean(),
        openTime: z.string().regex(/^\d{2}:\d{2}$/),
        closeTime: z.string().regex(/^\d{2}:\d{2}$/)
      })
    )
    .length(7)
    .optional(),
  specialOverrides: z
    .record(
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        type: z.enum(['CLOSED', 'REDUCED_HOURS']),
        openTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        reason: z.string().trim().min(2).max(200)
      })
    )
    .optional(),
  specialPracticeDates: z
    .record(
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().trim().min(2).max(200),
        openTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional()
      })
    )
    .optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const rawBody = await readBody(event)
  const parsed = scheduleConfigSchema.safeParse(rawBody)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Konfigurasi jadwal praktek tidak valid.'
    })
  }

  const existing = await prisma.clinicSetting.findFirst()
  const current = normalizeClinicScheduleConfig(existing?.operatingHoursJson)

  const merged = normalizeClinicScheduleConfig({
    ...current,
    ...parsed.data,
    doctorLeaveRequests: current.doctorLeaveRequests
  })

  if (existing) {
    await prisma.clinicSetting.update({
      where: { id: existing.id },
      data: {
        operatingHoursJson: merged as unknown as object
      }
    })
  } else {
    await prisma.clinicSetting.create({
      data: {
        clinicName: 'Lumina Dental Care',
        tagline: 'Klinik Gigi Spesialis & Keluarga',
        address: 'Pontianak',
        phone: '0561-700000',
        email: 'halo@luminadental.id',
        operatingHoursJson: merged as unknown as object
      }
    })
  }

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'UPDATE_CLINIC_SCHEDULE',
    entityType: 'ClinicSetting',
    entityId: existing?.id || 'default',
    afterJson: merged
  })

  return {
    success: true,
    message: 'Pengaturan jadwal praktek dan kuota libur berhasil disimpan.',
    config: merged
  }
})
