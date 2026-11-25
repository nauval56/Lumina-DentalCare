import { getRouterParam, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID pengguna diperlukan.' })
  }

  if (id === actor.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Anda tidak dapat menghapus akun Administrator yang sedang Anda gunakan.'
    })
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: {
      doctor: { select: { id: true } },
      patient: { select: { id: true } }
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Akun pengguna tidak ditemukan.' })
  }

  if (existing.doctor || existing.patient) {
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    })
    return {
      success: true,
      message: 'Akun terhubung dengan profil dokter/pasien sehingga dinonaktifkan demi integritas data.'
    }
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
    prisma.notification.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } })
  ])

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'USER_DELETE',
    entityType: 'User',
    entityId: id,
    beforeJson: { email: existing.email, fullName: existing.fullName }
  })

  return {
    success: true,
    message: 'Akun pengguna berhasil dihapus.'
  }
})
