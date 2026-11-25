import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { getUserFromSession } from '../../utils/session'

const createReviewSchema = z.object({
  patientName: z.string().trim().min(3, 'Nama lengkap minimal 3 karakter').max(120),
  serviceName: z.string().trim().max(120).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(10, 'Ulasan minimal 10 karakter').max(1000)
})

export default defineEventHandler(async (event) => {
  const user = await getUserFromSession(event)
  const rawBody = await readBody(event)
  const parsed = createReviewSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Ulasan tidak valid.'
    })
  }

  const d = parsed.data
  const review = await prisma.review.create({
    data: {
      patientId: user?.patientId ?? null,
      patientName: user?.fullName || d.patientName,
      serviceName: d.serviceName || 'Perawatan Gigi Umum',
      rating: d.rating,
      comment: d.comment,
      isPublished: true
    }
  })

  return {
    success: true,
    message: 'Terima kasih atas ulasan dan kepercayaan Anda kepada Lumina Dental Care.',
    review
  }
})
