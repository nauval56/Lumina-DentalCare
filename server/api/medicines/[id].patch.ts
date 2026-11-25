import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const updateMedicineSchema = z.object({
  name: z.string().trim().min(3).max(180).optional(),
  genericName: z.string().trim().max(180).optional().nullable(),
  category: z.string().trim().min(2).max(80).optional(),
  unit: z.string().trim().min(2).max(40).optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  minimumStock: z.coerce.number().int().min(0).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID obat diperlukan.' })
  }

  const existing = await prisma.medicine.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Obat tidak ditemukan.' })
  }

  const body = await readBody(event)
  const parsed = updateMedicineSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Data perubahan obat tidak valid.' })
  }

  const d = parsed.data
  const updated = await prisma.medicine.update({
    where: { id },
    data: {
      name: d.name ?? existing.name,
      genericName: d.genericName !== undefined ? d.genericName : existing.genericName,
      category: d.category ?? existing.category,
      unit: d.unit ?? existing.unit,
      unitPrice: d.unitPrice ?? existing.unitPrice,
      minimumStock: d.minimumStock ?? existing.minimumStock,
      description: d.description !== undefined ? d.description : existing.description,
      isActive: d.isActive ?? existing.isActive
    }
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'MEDICINE_UPDATE',
    entityType: 'Medicine',
    entityId: id,
    beforeJson: { name: existing.name, minimumStock: existing.minimumStock },
    afterJson: { name: updated.name, minimumStock: updated.minimumStock }
  })

  return {
    success: true,
    message: 'Data obat berhasil diperbarui.',
    medicine: { ...updated, unitPrice: Number(updated.unitPrice) }
  }
})
