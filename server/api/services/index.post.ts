import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const createServiceSchema = z.object({
  code: z.string().trim().min(3, 'Kode layanan minimal 3 karakter').max(40),
  name: z.string().trim().min(3, 'Nama layanan wajib diisi').max(160),
  category: z.string().trim().min(3, 'Kategori wajib diisi').max(80),
  shortDesc: z.string().trim().min(10, 'Deskripsi singkat minimal 10 karakter').max(300),
  description: z.string().trim().min(10, 'Deskripsi lengkap minimal 10 karakter'),
  price: z.coerce.number().min(0, 'Harga layanan tidak boleh negatif'),
  durationMinutes: z.coerce.number().int().min(15).max(240).default(30),
  iconName: z.string().trim().max(80).default('i-lucide-stethoscope'),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['ADMIN'])
  const rawBody = await readBody(event)
  const parsed = createServiceSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data layanan tidak valid.'
    })
  }

  const d = parsed.data
  const slug = d.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + d.code.toLowerCase().replace(/[^a-z0-9]+/g, '')

  const existing = await prisma.service.findUnique({ where: { code: d.code } })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Kode layanan sudah digunakan.' })
  }

  const created = await prisma.service.create({
    data: {
      code: d.code.toUpperCase(),
      slug,
      name: d.name,
      category: d.category,
      shortDesc: d.shortDesc,
      description: d.description,
      price: d.price,
      durationMinutes: d.durationMinutes,
      iconName: d.iconName,
      isFeatured: d.isFeatured,
      isActive: d.isActive
    }
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'SERVICE_CREATE',
    entityType: 'Service',
    entityId: created.id,
    afterJson: { code: created.code, name: created.name, price: Number(created.price) }
  })

  return {
    success: true,
    message: 'Layanan klinik berhasil ditambahkan.',
    service: { ...created, price: Number(created.price) }
  }
})
