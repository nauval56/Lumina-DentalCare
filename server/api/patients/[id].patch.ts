import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const updatePatientSchema = z.object({
  fullName: z.string().trim().min(3).max(150).optional(),
  nik: z.string().trim().regex(/^\d{16}$/, 'NIK harus 16 digit').optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().min(9).max(25).optional(),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['LAKI_LAKI', 'PEREMPUAN']).optional().nullable(),
  bloodType: z.string().trim().max(5).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  allergies: z.string().trim().max(500).optional().or(z.literal('')),
  medicalNotes: z.string().trim().max(500).optional().or(z.literal('')),
  emergencyContact: z.string().trim().max(150).optional().or(z.literal('')),
  emergencyPhone: z.string().trim().max(30).optional().or(z.literal(''))
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID pasien diperlukan.' })
  }

  if (user.role === 'PATIENT' && user.patientId !== id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda hanya dapat memperbarui profil milik Anda sendiri.'
    })
  }

  if (!['PATIENT', 'RECEPTIONIST', 'ADMIN'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Akses ditolak.' })
  }

  const existing = await prisma.patient.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Pasien tidak ditemukan.' })
  }

  const body = await readBody(event)
  const parsed = updatePatientSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data perubahan pasien tidak valid.'
    })
  }

  const d = parsed.data
  const cleanNik = d.nik !== undefined ? (d.nik ? d.nik.trim() : null) : existing.nik

  if (cleanNik && cleanNik !== existing.nik) {
    const dupNik = await prisma.patient.findUnique({ where: { nik: cleanNik } })
    if (dupNik) {
      throw createError({ statusCode: 409, statusMessage: 'NIK sudah terdaftar pada pasien lain.' })
    }
  }

  const updated = await prisma.patient.update({
    where: { id },
    data: {
      fullName: d.fullName ?? existing.fullName,
      nik: cleanNik,
      email: d.email !== undefined ? (d.email ? d.email.toLowerCase() : null) : existing.email,
      phone: d.phone ?? existing.phone,
      dateOfBirth:
        d.dateOfBirth !== undefined
          ? d.dateOfBirth
            ? new Date(d.dateOfBirth)
            : null
          : existing.dateOfBirth,
      gender: d.gender !== undefined ? d.gender : existing.gender,
      bloodType: d.bloodType !== undefined ? d.bloodType || null : existing.bloodType,
      address: d.address !== undefined ? d.address || null : existing.address,
      allergies: d.allergies !== undefined ? d.allergies || null : existing.allergies,
      medicalNotes: d.medicalNotes !== undefined ? d.medicalNotes || null : existing.medicalNotes,
      emergencyContact:
        d.emergencyContact !== undefined ? d.emergencyContact || null : existing.emergencyContact,
      emergencyPhone:
        d.emergencyPhone !== undefined ? d.emergencyPhone || null : existing.emergencyPhone
    }
  })

  if (existing.userId && (d.fullName || d.phone)) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: {
        fullName: d.fullName ?? undefined,
        phone: d.phone ?? undefined
      }
    }).catch(() => {})
  }

  await writeAuditLog(event, {
    actorId: user.id,
    actorRole: user.role,
    action: 'PATIENT_UPDATE',
    entityType: 'Patient',
    entityId: id,
    beforeJson: { fullName: existing.fullName, phone: existing.phone },
    afterJson: { fullName: updated.fullName, phone: updated.phone }
  })

  return {
    success: true,
    message: 'Data pasien berhasil diperbarui.',
    patient: updated
  }
})
