import { getRouterParam, getQuery, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID jadwal diperlukan.' })
  }

  if (query.type === 'holiday') {
    await prisma.clinicHoliday.delete({ where: { id } })
    await writeAuditLog(event, {
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CLINIC_HOLIDAY_DELETE',
      entityType: 'ClinicHoliday',
      entityId: id
    })
    return { success: true, message: 'Hari libur berhasil dihapus.' }
  }

  await prisma.schedule.delete({ where: { id } })
  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'SCHEDULE_DELETE',
    entityType: 'Schedule',
    entityId: id
  })

  return {
    success: true,
    message: 'Jadwal praktik berhasil dihapus.'
  }
})
