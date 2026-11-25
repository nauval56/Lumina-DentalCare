import { getRouterParam, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID layanan diperlukan.' })
  }

  const existing = await prisma.service.findUnique({
    where: { id },
    include: {
      _count: {
        select: { appointments: true, treatments: true }
      }
    }
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Layanan tidak ditemukan.' })
  }

  if (existing._count.appointments > 0 || existing._count.treatments > 0) {
    await prisma.service.update({
      where: { id },
      data: { isActive: false }
    })

    await writeAuditLog(event, {
      actorId: actor.id,
      actorRole: actor.role,
      action: 'SERVICE_DEACTIVATE',
      entityType: 'Service',
      entityId: id,
      beforeJson: { name: existing.name, isActive: existing.isActive },
      afterJson: { isActive: false }
    })

    return {
      success: true,
      message: 'Layanan terkait dengan riwayat kunjungan sehingga dinonaktifkan dari katalog aktif.'
    }
  }

  await prisma.service.delete({ where: { id } })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'SERVICE_DELETE',
    entityType: 'Service',
    entityId: id,
    beforeJson: { code: existing.code, name: existing.name }
  })

  return {
    success: true,
    message: 'Layanan berhasil dihapus.'
  }
})
