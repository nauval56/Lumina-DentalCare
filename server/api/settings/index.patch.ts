import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const updateSettingSchema = z.object({
  clinicName: z.string().trim().min(3).max(150),
  tagline: z.string().trim().min(3).max(255),
  address: z.string().trim().min(5).max(500),
  phone: z.string().trim().min(6).max(40),
  whatsapp: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email(),
  gmailUser: z.string().trim().email('Masukkan alamat Gmail yang valid').optional().or(z.literal('')),
  gmailAppPassword: z.string().trim().max(100).optional(),
  operatingHoursJson: z.record(z.any()).optional(),
  notificationConfig: z.record(z.any()).optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const rawBody = await readBody(event)
  const parsed = updateSettingSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data pengaturan klinik tidak valid.'
    })
  }

  const d = parsed.data
  const existing = await prisma.clinicSetting.findFirst()
  const prevNotif = ((existing?.notificationConfig || {}) as Record<string, unknown>) || {}
  const mergedNotif: Record<string, unknown> = {
    ...prevNotif,
    ...(d.notificationConfig || {})
  }
  if (d.gmailUser !== undefined) {
    mergedNotif.gmailUser = d.gmailUser.trim()
  }
  if (d.gmailAppPassword !== undefined && d.gmailAppPassword.trim() !== '') {
    mergedNotif.gmailAppPassword = d.gmailAppPassword.replace(/\s+/g, '')
  }

  const updated = existing
    ? await prisma.clinicSetting.update({
        where: { id: existing.id },
        data: {
          clinicName: d.clinicName,
          tagline: d.tagline,
          address: d.address,
          phone: d.phone,
          whatsapp: d.whatsapp ?? existing.whatsapp,
          email: d.email,
          operatingHoursJson: d.operatingHoursJson ?? (existing.operatingHoursJson as object),
          notificationConfig: mergedNotif as object
        }
      })
    : await prisma.clinicSetting.create({
        data: {
          clinicName: d.clinicName,
          tagline: d.tagline,
          address: d.address,
          phone: d.phone,
          whatsapp: d.whatsapp ?? null,
          email: d.email,
          operatingHoursJson: d.operatingHoursJson ?? {},
          notificationConfig: mergedNotif as object
        }
      })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'CLINIC_SETTING_UPDATE',
    entityType: 'ClinicSetting',
    entityId: updated.id,
    afterJson: { clinicName: updated.clinicName, phone: updated.phone, email: updated.email }
  })

  return {
    success: true,
    message: 'Pengaturan sistem klinik berhasil disimpan.',
    setting: updated
  }
})
