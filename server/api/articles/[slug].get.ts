import { getRouterParam, createError } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug artikel diperlukan.' })
  }

  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      author: { select: { fullName: true } }
    }
  })

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Artikel tidak ditemukan.' })
  }

  return { article }
})
