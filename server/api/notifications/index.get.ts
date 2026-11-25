import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 30
  })

  return {
    unreadCount: notifications.filter((n) => !n.isRead).length,
    items: notifications
  }
})
