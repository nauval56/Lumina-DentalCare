import type { H3Event } from 'h3'
import { getRequestIP, getHeader } from 'h3'
import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'

export interface AuditLogInput {
  actorId?: string | null
  actorRole?: string | null
  action: string
  entityType: string
  entityId?: string | null
  beforeJson?: Prisma.InputJsonValue | null
  afterJson?: Prisma.InputJsonValue | null
}

export async function writeAuditLog(event: H3Event | null, input: AuditLogInput): Promise<void> {
  try {
    const ipAddress = event ? (getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1') : '127.0.0.1'
    const userAgent = event ? (getHeader(event, 'user-agent') || 'system') : 'system'

    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        beforeJson: input.beforeJson ?? undefined,
        afterJson: input.afterJson ?? undefined,
        ipAddress: ipAddress.slice(0, 64),
        userAgent: userAgent.slice(0, 500)
      }
    })
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err)
  }
}
