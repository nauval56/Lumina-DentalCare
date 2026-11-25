import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const includeInactive = query.includeInactive === 'true'
  const category = String(query.category || '').trim()

  const where: Record<string, unknown> = {}
  if (!includeInactive) {
    where.isActive = true
  }
  if (category) {
    where.category = category
  }

  const services = await prisma.service.findMany({
    where,
    orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }]
  })

  return {
    total: services.length,
    items: services.map((s) => ({
      ...s,
      price: Number(s.price)
    }))
  }
})
