import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const category = String(query.category || '').trim()

  const where: Record<string, unknown> = { isPublished: true }
  if (category) {
    where.category = category
  }

  const articles = await prisma.article.findMany({
    where,
    include: {
      author: { select: { fullName: true } }
    },
    orderBy: { publishedAt: 'desc' }
  })

  return { items: articles }
})
