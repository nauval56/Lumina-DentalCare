import { getRouterParam, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID obat diperlukan.' })
  }

  const existing = await prisma.medicine.findUnique({
    where: { id },
    include: {
      _count: {
        select: { prescriptionItems: true }
      }
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Data obat tidak ditemukan.' })
  }

  if (existing._count.prescriptionItems > 0) {
    await prisma.medicine.update({
      where: { id },
      data: { isActive: false }
    })

    await writeAuditLog(event, {
      actorId: actor.id,
      actorRole: actor.role,
      action: 'MEDICINE_DEACTIVATE',
      entityType: 'Medicine',
      entityId: id,
      beforeJson: { code: existing.code, name: existing.name }
    })

    return {
      success: true,
      message: 'Obat telah tercatat pada resep medis sehingga dinonaktifkan dari katalog aktif.'
    }
  }

  await prisma.$transaction([
    prisma.inventoryTransaction.deleteMany({ where: { medicineId: id } }),
    prisma.medicineBatch.deleteMany({ where: { medicineId: id } }),
    prisma.inventory.deleteMany({ where: { medicineId: id } }),
    prisma.medicine.delete({ where: { id } })
  ])

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'MEDICINE_DELETE',
    entityType: 'Medicine',
    entityId: id,
    beforeJson: { code: existing.code, name: existing.name }
  })

  return {
    success: true,
    message: 'Master data obat berhasil dihapus.'
  }
})
