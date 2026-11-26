import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'
import { hashPassword } from '../../utils/crypto'

const createPatientSchema = z.object({
  fullName: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter').max(150),
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'NIK harus 16 digit angka')
    .optional()
    .or(z.literal('')),
  email: z.string().trim().email('Email tidak valid').optional().or(z.literal('')),
  phone: z.string().trim().min(9, 'Nomor telepon minimal 9 digit').max(25),
  dateOfBirth: z.string().optional().or(z.literal('')),
  gender: z.enum(['LAKI_LAKI', 'PEREMPUAN']).optional(),
  bloodType: z.string().trim().max(5).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  allergies: z.string().trim().max(500).optional().or(z.literal('')),
  medicalNotes: z.string().trim().max(500).optional().or(z.literal('')),
  emergencyContact: z.string().trim().max(150).optional().or(z.literal('')),
  emergencyPhone: z.string().trim().max(30).optional().or(z.literal('')),
  createPortalAccount: z.boolean().optional(),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, 'Kata sandi wajib kombinasi huruf dan angka')
    .optional()
    .or(z.literal(''))
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['RECEPTIONIST', 'ADMIN'])
  const rawBody = await readBody(event)
  const parsed = createPatientSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data pasien tidak valid.'
    })
  }

  const data = parsed.data
  const cleanNik = data.nik ? data.nik.trim() : null
  const cleanEmail = data.email ? data.email.trim().toLowerCase() : null

  // Pencegahan duplikasi pasien berdasarkan NIK, Nomor Telepon + Nama, atau Email
  const existingDuplicate = await prisma.patient.findFirst({
    where: {
      OR: [
        ...(cleanNik ? [{ nik: cleanNik }] : []),
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        { AND: [{ phone: data.phone }, { fullName: data.fullName }] }
      ]
    }
  })

  if (existingDuplicate) {
    throw createError({
      statusCode: 409,
      statusMessage: `Pasien sudah terdaftar dengan No. RM ${existingDuplicate.medicalRecordNo} (${existingDuplicate.fullName}).`
    })
  }

  if (data.createPortalAccount) {
    if (!cleanEmail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Alamat email wajib diisi untuk mengaktifkan akun login Patient Portal.'
      })
    }
    if (!data.password || data.password.length < 8) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Kata sandi akun portal minimal 8 karakter.'
      })
    }
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } })
    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: `Email ${cleanEmail} sudah terdaftar sebagai akun pengguna.`
      })
    }
  }

  const count = await prisma.patient.count()
  const medicalRecordNo = `RM-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}-${Math.floor(10 + Math.random() * 89)}`

  const created = await prisma.$transaction(async (tx) => {
    let linkedUserId: string | null = null
    if (data.createPortalAccount && cleanEmail && data.password) {
      const patientRole = await tx.role.findUnique({ where: { code: 'PATIENT' } })
      if (!patientRole) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Role PATIENT tidak ditemukan di database.'
        })
      }
      const passwordHash = await hashPassword(data.password)
      const user = await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          fullName: data.fullName,
          phone: data.phone,
          roleId: patientRole.id,
          isActive: true,
          emailVerifiedAt: new Date()
        }
      })
      linkedUserId = user.id

      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'GENERAL',
          title: 'Selamat Datang di Lumina Dental Care',
          message: `Akun Patient Portal Anda telah aktif dengan No. Rekam Medis ${medicalRecordNo}. Silakan cek jadwal kunjungan dan riwayat medis Anda.`,
          linkUrl: '/patient'
        }
      })
    }

    return tx.patient.create({
      data: {
        userId: linkedUserId,
        medicalRecordNo,
        nik: cleanNik,
        fullName: data.fullName,
        email: cleanEmail,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender ?? null,
        bloodType: data.bloodType || null,
        address: data.address || null,
        allergies: data.allergies || null,
        medicalNotes: data.medicalNotes || null,
        emergencyContact: data.emergencyContact || null,
        emergencyPhone: data.emergencyPhone || null
      }
    })
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'PATIENT_CREATE',
    entityType: 'Patient',
    entityId: created.id,
    afterJson: {
      medicalRecordNo: created.medicalRecordNo,
      fullName: created.fullName,
      phone: created.phone
    }
  })

  return {
    success: true,
    message: 'Data pasien berhasil ditambahkan.',
    patient: created
  }
})
