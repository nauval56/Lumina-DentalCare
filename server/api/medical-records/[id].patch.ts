import { z } from 'zod'
import { getRouterParam, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const updateMedicalRecordSchema = z.object({
  chiefComplaint: z.string().trim().min(3).optional(),
  subjective: z.string().trim().optional(),
  objective: z.string().trim().optional(),
  assessment: z.string().trim().min(3).optional(),
  plan: z.string().trim().optional(),
  clinicalNotes: z.string().trim().optional(),
  revisionNote: z.string().trim().min(3, 'Alasan perubahan rekam medis wajib dicatat')
})

export default defineEventHandler(async (event) => {
  const actor = await requireRole(event, ['DOCTOR', 'ADMIN'])
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID rekam medis diperlukan.' })
  }

  const existing = await prisma.medicalRecord.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Rekam medis tidak ditemukan.' })
  }

  if (actor.role === 'DOCTOR' && actor.doctorId && existing.doctorId !== actor.doctorId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Dokter hanya berwenang mengubah rekam medis pasien yang ditanganinya.'
    })
  }

  const body = await readBody(event)
  const parsed = updateMedicalRecordSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data perubahan rekam medis tidak valid.'
    })
  }

  const d = parsed.data
  const nextRevision = existing.revisionNumber + 1
  const historyList = Array.isArray(existing.changeHistoryJson)
    ? [...(existing.changeHistoryJson as Array<Record<string, unknown>>)]
    : []

  historyList.push({
    revision: nextRevision,
    actorId: actor.id,
    actorName: actor.fullName,
    timestamp: new Date().toISOString(),
    summary: d.revisionNote,
    previousAssessment: existing.assessment
  })

  const updated = await prisma.medicalRecord.update({
    where: { id },
    data: {
      chiefComplaint: d.chiefComplaint ?? existing.chiefComplaint,
      subjective: d.subjective ?? existing.subjective,
      objective: d.objective ?? existing.objective,
      assessment: d.assessment ?? existing.assessment,
      plan: d.plan ?? existing.plan,
      clinicalNotes: d.clinicalNotes ?? existing.clinicalNotes,
      revisionNumber: nextRevision,
      changeHistoryJson: historyList
    }
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'MEDICAL_RECORD_UPDATE',
    entityType: 'MedicalRecord',
    entityId: id,
    beforeJson: {
      revisionNumber: existing.revisionNumber,
      assessment: existing.assessment
    },
    afterJson: {
      revisionNumber: updated.revisionNumber,
      assessment: updated.assessment,
      revisionNote: d.revisionNote
    }
  })

  return {
    success: true,
    message: `Rekam medis berhasil diperbarui (Revisi #${nextRevision}).`,
    medicalRecord: updated
  }
})
