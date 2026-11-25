import { getQuery, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { FDI_TEETH_CATALOG } from '../../utils/fdiTeeth'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ['PATIENT', 'DOCTOR', 'ADMIN'])
  const query = getQuery(event)
  let patientId = String(query.patientId || '').trim()

  if (user.role === 'PATIENT') {
    if (!user.patientId) {
      throw createError({ statusCode: 403, statusMessage: 'Profil pasien tidak ditemukan.' })
    }
    patientId = user.patientId
  }

  const [teethInDb, entries, patient] = await Promise.all([
    prisma.tooth.findMany({ orderBy: { fdiNumber: 'asc' } }),
    patientId
      ? prisma.odontogram.findMany({
          where: { patientId },
          include: {
            tooth: true,
            doctor: { select: { id: true, titlePrefix: true, fullName: true, titleSuffix: true } }
          },
          orderBy: { recordedAt: 'desc' }
        })
      : Promise.resolve([]),
    patientId
      ? prisma.patient.findUnique({
          where: { id: patientId },
          select: { id: true, fullName: true, medicalRecordNo: true, dateOfBirth: true }
        })
      : Promise.resolve(null)
  ])

  const teethCatalog = teethInDb.length > 0 ? teethInDb : FDI_TEETH_CATALOG

  // Map kondisi terbaru per nomor FDI
  const latestByFdi: Record<string, (typeof entries)[number]> = {}
  for (const entry of entries) {
    const fdi = entry.tooth.fdiNumber
    if (!latestByFdi[fdi]) {
      latestByFdi[fdi] = entry
    }
  }

  return {
    patientId,
    patient,
    teethCatalog,
    latestByFdi,
    history: entries
  }
})
