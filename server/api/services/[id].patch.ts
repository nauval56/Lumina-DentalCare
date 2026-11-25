import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const updateServiceSchema = z.object({
  name: z.string().trim().min(3).max(160).optional(),
  category: z.string().trim().min(3).max(80).optional(),
  shortDesc: z.string().trim().min(10).max(300).optional(),
  description: z.string().trim().min(10).optional(),
  price: z.coerce.number().min(0).optional(),
  durationMinutes: z.coerce.number().int().min(15).max(240).optional(),
  iconName: z.string().trim().max(80).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID layanan diperlukan.' })
  }

  const existing = await prisma.service.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Layanan tidak ditemukan.' })
  }

  const body = await readBody(event)
  const parsed = updateServiceSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data layanan tidak valid.'
    })
  }

  const d = parsed.data
  const updated = await prisma.service.update({
    where: { id },
    data: {
      name: d.name ?? existing.name,
      category: d.category ?? existing.category,
      shortDesc: d.shortDesc ?? existing.shortDesc,
      description: d.description ?? existing.description,
      price: d.price ?? existing.price,
      durationMinutes: d.durationMinutes ?? existing.durationMinutes,
      iconName: d.iconName ?? existing.iconName,
      isFeatured: d.isFeatured ?? existing.isFeatured,
      isActive: d.isActive ?? existing.isActive
    }
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'SERVICE_UPDATE',
    entityType: 'Service',
    entityId: id,
    beforeJson: { name: existing.name, price: Number(existing.price), isActive: existing.isActive },
    afterJson: { name: updated.name, price: Number(updated.price), isActive: updated.isActive }
  })

  return {
    success: true,
    message: 'Layanan klinik berhasil diperbarui.',
    service: { ...updated, price: Number(updated.price) }
  }
})
