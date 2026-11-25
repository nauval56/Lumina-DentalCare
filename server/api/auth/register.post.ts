import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { hashPassword, generateSecureToken, hashToken } from '../../utils/crypto'
import { createUserSession } from '../../utils/session'
import { enforceRateLimit } from '../../utils/rateLimit'
import { writeAuditLog } from '../../utils/audit'

const registerSchema = z.object({
  fullName: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter').max(150),
  email: z.string().trim().email('Format email tidak valid').max(180),
  phone: z
    .string()
    .trim()
    .min(9, 'Nomor telepon minimal 9 digit')
    .max(25)
    .regex(/^[0-9+()\-\s]+$/, 'Nomor telepon hanya boleh berisi angka dan tanda +'),
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'NIK harus terdiri dari 16 digit angka')
    .optional()
    .or(z.literal('')),
  gender: z.enum(['LAKI_LAKI', 'PEREMPUAN']).optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().trim().max(500).optional(),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(100)
    .regex(/[A-Za-z]/, 'Password harus mengandung huruf')
    .regex(/[0-9]/, 'Password harus mengandung angka')
})

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'auth:register', 10, 60_000)

  const rawBody = await readBody(event)
  const parsed = registerSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data registrasi tidak valid.'
    })
  }

  const data = parsed.data
  const normalizedEmail = data.email.toLowerCase()
  const cleanNik = data.nik ? data.nik.trim() : null

  // Cek duplikasi akun atau pasien (email, nomor telepon, atau NIK)
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  })
  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.'
    })
  }

  const duplicatePatient = await prisma.patient.findFirst({
    where: {
      OR: [
        { email: normalizedEmail },
        { phone: data.phone },
        ...(cleanNik ? [{ nik: cleanNik }] : [])
      ]
    }
  })

  if (duplicatePatient && cleanNik && duplicatePatient.nik === cleanNik) {
    throw createError({
      statusCode: 409,
      statusMessage: 'NIK sudah terdaftar pada data pasien klinik.'
    })
  }

  // Pastikan Role PATIENT tersedia
  const patientRole = await prisma.role.upsert({
    where: { code: 'PATIENT' },
    update: {},
    create: {
      code: 'PATIENT',
      name: 'Pasien',
      description: 'Pasien terdaftar klinik gigi'
    }
  })

  const passwordHash = hashPassword(data.password)
  const rawVerifyToken = generateSecureToken(24)
  const verifyTokenHash = hashToken(rawVerifyToken)

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        roleId: patientRole.id,
        fullName: data.fullName,
        email: normalizedEmail,
        phone: data.phone,
        passwordHash,
        isActive: true,
        isEmailVerified: false
      }
    })

    const count = await tx.patient.count()
    const medicalRecordNo = `RM-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}-${Math.floor(10 + Math.random() * 89)}`

    const patient = duplicatePatient && !duplicatePatient.userId
      ? await tx.patient.update({
          where: { id: duplicatePatient.id },
          data: {
            userId: user.id,
            fullName: data.fullName,
            email: normalizedEmail,
            phone: data.phone,
            nik: cleanNik || duplicatePatient.nik,
            gender: data.gender ?? duplicatePatient.gender,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : duplicatePatient.dateOfBirth,
            address: data.address ?? duplicatePatient.address
          }
        })
      : await tx.patient.create({
          data: {
            userId: user.id,
            medicalRecordNo,
            nik: cleanNik,
            fullName: data.fullName,
            email: normalizedEmail,
            phone: data.phone,
            gender: data.gender ?? null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            address: data.address ?? null
          }
        })

    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: verifyTokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
      }
    })

    await tx.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Selamat Datang di Lumina Dental Care',
        message: `Akun pasien Anda dengan nomor rekam medis ${patient.medicalRecordNo} berhasil dibuat. Anda kini dapat melakukan booking appointment online.`,
        linkUrl: '/patient/appointments'
      }
    })

    return { user, patient }
  })

  await createUserSession(event, result.user.id)

  await writeAuditLog(event, {
    actorId: result.user.id,
    actorRole: 'PATIENT',
    action: 'AUTH_REGISTER_PATIENT',
    entityType: 'User',
    entityId: result.user.id,
    afterJson: {
      email: result.user.email,
      fullName: result.user.fullName,
      medicalRecordNo: result.patient.medicalRecordNo
    }
  })

  return {
    success: true,
    message: 'Registrasi akun pasien berhasil.',
    verificationTokenDevPreview: process.env.NODE_ENV !== 'production' ? rawVerifyToken : undefined,
    user: {
      id: result.user.id,
      fullName: result.user.fullName,
      email: result.user.email,
      phone: result.user.phone,
      role: 'PATIENT',
      roleName: 'Pasien',
      patientId: result.patient.id,
      medicalRecordNo: result.patient.medicalRecordNo
    }
  }
})
