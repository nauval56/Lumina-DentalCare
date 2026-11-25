import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const weeklyWithOffDaySchema = z.object({
  mode: z.literal('WEEKLY_WITH_OFF_DAY'),
  doctorId: z.string().min(1, 'Dokter wajib dipilih'),
  offDayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam mulai HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam selesai HH:mm'),
  slotDurationMin: z.coerce.number().int().min(15).max(120).default(30),
  maxPatients: z.coerce.number().int().min(1).max(50).default(12)
})

const upsertScheduleSchema = z.object({
  id: z.string().optional(),
  doctorId: z.string().min(1, 'Dokter wajib dipilih'),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam mulai HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format jam selesai HH:mm'),
  slotDurationMin: z.coerce.number().int().min(15).max(120).default(30),
  maxPatients: z.coerce.number().int().min(1).max(50).default(12),
  isActive: z.boolean().default(true)
})

const createHolidaySchema = z.object({
  id: z.string().optional(),
  isHoliday: z.literal(true),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
  name: z.string().trim().min(3, 'Nama hari libur wajib diisi').max(150),
  doctorId: z.string().optional().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')),
  description: z.string().trim().max(255).optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN', 'DOCTOR'])
  const rawBody = await readBody(event)

  // Jika yang login adalah DOCTOR, pastikan hanya bisa mengatur jadwalnya sendiri
  if (actor.role === 'DOCTOR') {
    if (!actor.doctorId) {
      throw createError({ statusCode: 403, statusMessage: 'Profil dokter tidak ditemukan.' })
    }
    rawBody.doctorId = actor.doctorId
  }

  // 1. Mode Hari Libur Tanggal Tertentu (dengan opsi Dokter + Jam Mulai & Jam Selesai)
  if (rawBody?.isHoliday === true) {
    const parsedHoliday = createHolidaySchema.safeParse(rawBody)
    if (!parsedHoliday.success) {
      throw createError({
        statusCode: 400,
        statusMessage: parsedHoliday.error.issues[0]?.message || 'Data hari libur tidak valid.'
      })
    }

    const hData = parsedHoliday.data
    let docLabel = ''
    if (hData.doctorId) {
      const doc = await prisma.doctor.findUnique({ where: { id: hData.doctorId } })
      if (doc) {
        docLabel = `${doc.titlePrefix || 'drg.'} ${doc.fullName}`
      }
    }

    const timeRange =
      hData.startTime && hData.endTime ? `${hData.startTime} - ${hData.endTime} WIB` : 'Seharian Penuh'
    const composedDesc = [
      docLabel ? `Dokter: ${docLabel}` : 'Seluruh Klinik',
      `Jam: ${timeRange}`,
      hData.description || ''
    ]
      .filter(Boolean)
      .join(' · ')

    const holidayDate = new Date(`${hData.date}T00:00:00.000Z`)

    const holiday = hData.id
      ? await prisma.clinicHoliday.update({
          where: { id: hData.id },
          data: {
            date: holidayDate,
            name: hData.name,
            description: composedDesc
          }
        })
      : await prisma.clinicHoliday.upsert({
          where: { date: holidayDate },
          update: {
            name: hData.name,
            description: composedDesc
          },
          create: {
            date: holidayDate,
            name: hData.name,
            description: composedDesc
          }
        })

    await writeAuditLog(event, {
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CLINIC_HOLIDAY_UPSERT',
      entityType: 'ClinicHoliday',
      entityId: holiday.id,
      afterJson: { date: hData.date, name: holiday.name, description: composedDesc }
    })

    return {
      success: true,
      message: 'Jadwal hari libur berhasil disimpan.',
      holiday
    }
  }

  // 2. Mode Pengaturan Mingguan: Dokter Memilih 1 Hari Libur + Jam Mulai & Jam Selesai
  if (rawBody?.mode === 'WEEKLY_WITH_OFF_DAY') {
    const parsedWeekly = weeklyWithOffDaySchema.safeParse(rawBody)
    if (!parsedWeekly.success) {
      throw createError({
        statusCode: 400,
        statusMessage: parsedWeekly.error.issues[0]?.message || 'Input jadwal mingguan tidak valid.'
      })
    }

    const w = parsedWeekly.data
    if (w.startTime >= w.endTime) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Jam selesai praktik harus lebih besar dari jam mulai.'
      })
    }

    await prisma.$transaction(async (tx) => {
      await tx.schedule.deleteMany({
        where: { doctorId: w.doctorId }
      })

      for (const day of [0, 1, 2, 3, 4, 5, 6]) {
        const isOffDay = day === w.offDayOfWeek
        await tx.schedule.create({
          data: {
            doctorId: w.doctorId,
            dayOfWeek: day,
            startTime: w.startTime,
            endTime: w.endTime,
            slotDurationMin: w.slotDurationMin,
            maxPatients: w.maxPatients,
            isActive: !isOffDay
          }
        })
      }
    })

    await writeAuditLog(event, {
      actorId: actor.id,
      actorRole: actor.role,
      action: 'SCHEDULE_WEEKLY_OFFDAY_SET',
      entityType: 'Schedule',
      entityId: w.doctorId,
      afterJson: w
    })

    return {
      success: true,
      message: 'Jadwal praktik mingguan dan 1 hari libur dokter berhasil disimpan.'
    }
  }

  // 3. Mode Tambah / Edit Jadwal Per Hari (bisa Aktif atau Libur + Jam Mulai & Jam Selesai)
  const parsed = upsertScheduleSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data jadwal praktik tidak valid.'
    })
  }

  const d = parsed.data
  if (d.startTime >= d.endTime) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Jam selesai harus lebih besar dari jam mulai.'
    })
  }

  const schedule = await prisma.$transaction(async (tx) => {
    if (d.id) {
      return tx.schedule.update({
        where: { id: d.id },
        data: {
          doctorId: d.doctorId,
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
          slotDurationMin: d.slotDurationMin,
          maxPatients: d.maxPatients,
          isActive: d.isActive
        }
      })
    }

    // Hapus jadwal lama pada hari yang sama untuk dokter ini agar jam mulai baru tidak duplikat
    await tx.schedule.deleteMany({
      where: {
        doctorId: d.doctorId,
        dayOfWeek: d.dayOfWeek
      }
    })

    return tx.schedule.create({
      data: {
        doctorId: d.doctorId,
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime,
        endTime: d.endTime,
        slotDurationMin: d.slotDurationMin,
        maxPatients: d.maxPatients,
        isActive: d.isActive
      }
    })
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'SCHEDULE_UPSERT',
    entityType: 'Schedule',
    entityId: schedule.id,
    afterJson: d
  })

  return {
    success: true,
    message: d.isActive
      ? 'Jadwal praktik dokter berhasil disimpan.'
      : 'Hari libur dokter berhasil disimpan.',
    schedule
  }
})
