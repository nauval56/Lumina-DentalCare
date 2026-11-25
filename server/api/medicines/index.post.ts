import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const createMedicineSchema = z.object({
  code: z.string().trim().min(3, 'Kode obat minimal 3 karakter').max(40),
  name: z.string().trim().min(3, 'Nama obat wajib diisi').max(180),
  genericName: z.string().trim().max(180).optional(),
  category: z.string().trim().min(2, 'Kategori obat wajib diisi').max(80),
  unit: z.string().trim().min(2, 'Satuan obat wajib diisi').max(40),
  unitPrice: z.coerce.number().min(0, 'Harga satuan tidak boleh negatif'),
  minimumStock: z.coerce.number().int().min(0).default(10),
  description: z.string().trim().max(500).optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const rawBody = await readBody(event)
  const parsed = createMedicineSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data obat tidak valid.'
    })
  }

  const d = parsed.data
  const code = d.code.toUpperCase()
  const existing = await prisma.medicine.findUnique({ where: { code } })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Kode obat sudah terdaftar.' })
  }

  const created = await prisma.$transaction(async (tx) => {
    const med = await tx.medicine.create({
      data: {
        code,
        name: d.name,
        genericName: d.genericName || null,
        category: d.category,
        unit: d.unit,
        unitPrice: d.unitPrice,
        minimumStock: d.minimumStock,
        description: d.description || null
      }
    })

    await tx.inventory.create({
      data: {
        medicineId: med.id,
        availableStock: 0,
        reservedStock: 0
      }
    })

    return med
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'MEDICINE_CREATE',
    entityType: 'Medicine',
    entityId: created.id,
    afterJson: { code: created.code, name: created.name, unitPrice: Number(created.unitPrice) }
  })

  return {
    success: true,
    message: 'Master data obat berhasil ditambahkan.',
    medicine: { ...created, unitPrice: Number(created.unitPrice) }
  }
})
