import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const updateQueueSchema = z.object({
  status: z.enum(['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED'])
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['RECEPTIONIST', 'DOCTOR', 'ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID antrean diperlukan.' })
  }

  const existing = await prisma.queue.findUnique({
    where: { id },
    include: {
      appointment: {
        include: {
          invoice: { select: { id: true, status: true } }
        }
      }
    }
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Antrean tidak ditemukan.' })
  }

  const body = await readBody(event)
  const parsed = updateQueueSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Status antrean tidak valid.' })
  }

  const nextStatus = parsed.data.status
  if (nextStatus === 'COMPLETED') {
    const hasPaidInvoice = existing.appointment?.invoice?.status === 'PAID'
    if (!hasPaidInvoice) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Pasien belum menyelesaikan pembayaran. Antrean hanya dapat diselesaikan setelah tagihan berstatus Lunas (PAID).'
      })
    }
  }
  const updated = await prisma.$transaction(async (tx) => {
    const q = await tx.queue.update({
      where: { id },
      data: {
        status: nextStatus,
        calledAt:
          nextStatus === 'CALLED' || nextStatus === 'IN_PROGRESS'
            ? existing.calledAt ?? new Date()
            : existing.calledAt,
        completedAt: nextStatus === 'COMPLETED' ? new Date() : existing.completedAt
      }
    })

    if (nextStatus === 'IN_PROGRESS') {
      await tx.appointment.update({
        where: { id: existing.appointmentId },
        data: { status: 'IN_TREATMENT' }
      })
    } else if (nextStatus === 'COMPLETED') {
      await tx.appointment.update({
        where: { id: existing.appointmentId },
        data: { status: 'COMPLETED' }
      })
    }

    return q
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'QUEUE_STATUS_UPDATE',
    entityType: 'Queue',
    entityId: id,
    beforeJson: { status: existing.status },
    afterJson: { status: updated.status }
  })

  return {
    success: true,
    message: `Status antrean ${updated.queueNumber} diperbarui menjadi ${updated.status}.`,
    queue: updated
  }
})
