import { z } from 'zod'
import { readBody } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/session'

const readSchema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event).catch(() => ({}))
  const parsed = readSchema.safeParse(body)
  const d = parsed.success ? parsed.data : {}

  if (d.id) {
    await prisma.notification.updateMany({
      where: { id: d.id, userId: user.id },
      data: { isRead: true, readAt: new Date() }
    })
  } else {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() }
    })
  }

  return {
    success: true,
    message: 'Notifikasi ditandai sudah dibaca.'
  }
})
