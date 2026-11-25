import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { FDI_TEETH_CATALOG } from '../../utils/fdiTeeth'
import { writeAuditLog } from '../../utils/audit'

const createOdontogramSchema = z.object({
  patientId: z.string().min(1, 'Pasien wajib dipilih'),
  medicalRecordId: z.string().optional(),
  fdiNumber: z.string().trim().min(2, 'Nomor gigi FDI wajib dipilih'),
  condition: z.enum([
    'SEHAT',
    'KARIES',
    'TAMBALAN',
    'HILANG',
    'SISA_AKAR',
    'IMPLAN',
    'MAHKOTA',
    'PERAWATAN_SALURAN_AKAR',
    'GOYANG',
    'FRAKTUR'
  ]),
  surfaces: z.string().trim().max(50).optional(),
  diagnosis: z.string().trim().max(255).optional(),
  treatment: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(1000).optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['DOCTOR', 'ADMIN'])
  const rawBody = await readBody(event)
  const parsed = createOdontogramSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data odontogram tidak valid.'
    })
  }

  const d = parsed.data
  let doctorId = actor.doctorId
  if (!doctorId) {
    const firstDoctor = await prisma.doctor.findFirst({ where: { isActive: true } })
    if (!firstDoctor) {
      throw createError({ statusCode: 400, statusMessage: 'Data dokter tidak ditemukan.' })
    }
    doctorId = firstDoctor.id
  }

  const fdiMeta = FDI_TEETH_CATALOG.find((t) => t.fdiNumber === d.fdiNumber)
  if (!fdiMeta) {
    throw createError({ statusCode: 400, statusMessage: `Nomor gigi FDI ${d.fdiNumber} tidak valid.` })
  }

  const tooth = await prisma.tooth.upsert({
    where: { fdiNumber: d.fdiNumber },
    update: {},
    create: fdiMeta
  })

  const created = await prisma.odontogram.create({
    data: {
      patientId: d.patientId,
      doctorId,
      medicalRecordId: d.medicalRecordId || null,
      toothId: tooth.id,
      condition: d.condition,
      surfaces: d.surfaces || null,
      diagnosis: d.diagnosis || null,
      treatment: d.treatment || null,
      notes: d.notes || null
    },
    include: {
      tooth: true,
      doctor: { select: { id: true, titlePrefix: true, fullName: true, titleSuffix: true } }
    }
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'ODONTOGRAM_RECORD',
    entityType: 'Odontogram',
    entityId: created.id,
    afterJson: {
      patientId: d.patientId,
      fdiNumber: d.fdiNumber,
      condition: d.condition,
      surfaces: d.surfaces,
      diagnosis: d.diagnosis,
      treatment: d.treatment
    }
  })

  return {
    success: true,
    message: `Kondisi gigi FDI #${d.fdiNumber} (${d.condition}) berhasil disimpan ke riwayat odontogram.`,
    odontogram: created
  }
})
