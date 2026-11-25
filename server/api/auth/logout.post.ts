import { getUserFromSession, destroyUserSession } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  await destroyUserSession(event)

  if (user) {
    await writeAuditLog(event, {
      actorId: user.id,
      actorRole: user.role,
      action: 'AUTH_LOGOUT',
      entityType: 'User',
      entityId: user.id
    })
  }

  return {
    success: true,
    message: 'Anda telah berhasil keluar dari sesi.'
  }
})
