import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { hashPassword } from '../../utils/crypto'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const createDoctorSchema = z.object({
  email: z.string().trim().email('Email dokter tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter').default('Lumina123!'),
  phone: z.string().trim().min(9).max(25).optional(),
  licenseNumber: z.string().trim().min(4, 'Nomor SIP dokter wajib diisi'),
  titlePrefix: z.string().trim().max(30).default('drg.'),
  fullName: z.string().trim().min(3, 'Nama dokter wajib diisi').max(150),
  titleSuffix: z.string().trim().max(50).optional().or(z.literal('')),
  specialization: z.string().trim().min(3, 'Spesialisasi wajib diisi').max(120),
  bio: z.string().trim().max(1000).optional().or(z.literal('')),
  experienceYears: z.coerce.number().int().min(0).max(60).default(1),
  education: z.string().trim().max(255).optional().or(z.literal('')),
  consultationFee: z.coerce.number().min(0).default(150000),
  photoUrl: z.string().trim().max(500).optional().or(z.literal('')),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const rawBody = await readBody(event)
  const parsed = createDoctorSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data dokter tidak valid.'
    })
  }

  const d = parsed.data
  const normalizedEmail = d.email.toLowerCase()

  const [existingEmail, existingLicense] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedEmail } }),
    prisma.doctor.findUnique({ where: { licenseNumber: d.licenseNumber } })
  ])

  if (existingEmail) {
    throw createError({ statusCode: 409, statusMessage: 'Email dokter sudah terdaftar.' })
  }
  if (existingLicense) {
    throw createError({ statusCode: 409, statusMessage: 'Nomor SIP dokter sudah terdaftar.' })
  }

  const doctorRole = await prisma.role.upsert({
    where: { code: 'DOCTOR' },
    update: {},
    create: { code: 'DOCTOR', name: 'Dokter Gigi' }
  })

  const created = await prisma.$transaction(async (tx) => {
    const displayName = `${d.titlePrefix ? d.titlePrefix + ' ' : ''}${d.fullName}${d.titleSuffix ? ', ' + d.titleSuffix : ''}`
    const user = await tx.user.create({
      data: {
        roleId: doctorRole.id,
        fullName: displayName,
        email: normalizedEmail,
        phone: d.phone ?? null,
        passwordHash: hashPassword(d.password),
        isActive: d.isActive,
        isEmailVerified: true,
        emailVerifiedAt: new Date()
      }
    })

    const doctor = await tx.doctor.create({
      data: {
        userId: user.id,
        licenseNumber: d.licenseNumber,
        titlePrefix: d.titlePrefix || 'drg.',
        fullName: d.fullName,
        titleSuffix: d.titleSuffix || null,
        specialization: d.specialization,
        bio: d.bio || null,
        experienceYears: d.experienceYears,
        education: d.education || null,
        consultationFee: d.consultationFee,
        photoUrl:
          d.photoUrl ||
          'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80',
        isFeatured: d.isFeatured,
        isActive: d.isActive
      }
    })

    // Buat jadwal default Senin-Jumat 09:00-17:00
    for (let day = 1; day <= 5; day++) {
      await tx.schedule.create({
        data: {
          doctorId: doctor.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMin: 30,
          maxPatients: 12,
          isActive: true
        }
      })
    }

    return doctor
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'DOCTOR_CREATE',
    entityType: 'Doctor',
    entityId: created.id,
    afterJson: { fullName: created.fullName, licenseNumber: created.licenseNumber }
  })

  return {
    success: true,
    message: 'Dokter baru beserta jadwal praktik berhasil ditambahkan.',
    doctor: {
      ...created,
      consultationFee: Number(created.consultationFee)
    }
  }
})
