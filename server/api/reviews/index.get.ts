import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  const reviews = await prisma.review.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'desc' }
  })
  return { items: reviews }
})
