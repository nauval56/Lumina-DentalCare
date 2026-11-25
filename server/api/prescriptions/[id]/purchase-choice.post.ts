import { z } from 'zod'
import { readBody, createError, getRouterParam } from 'h3'
import { prisma } from '../../../utils/prisma'
import { requireAuth } from '../../../utils/session'
import { getMedicineAvailableStock, recordStockOutFefo } from '../../../services/inventoryLedgerService'
import { writeAuditLog } from '../../../utils/audit'

const choiceSchema = z.object({
  action: z.enum(['CHOOSE_CLINIC', 'CHOOSE_EXTERNAL', 'ADMIN_DISPENSE'])
})

export default defineEventHandler(async (event) => {
  const actor = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID resep wajib diisi.' })
  }

  const rawBody = await readBody(event)
  const parsed = choiceSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Pilihan pembelian obat tidak valid.'
    })
  }

  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: {
      patient: true,
      items: {
        include: {
          medicine: true
        }
      },
      medicalRecord: {
        include: {
          appointment: {
            include: {
              invoice: true
            }
          }
        }
      }
    }
  })

  if (!prescription) {
    throw createError({ statusCode: 404, statusMessage: 'Resep obat tidak ditemukan.' })
  }

  const { action } = parsed.data

  if (action === 'CHOOSE_CLINIC' || action === 'CHOOSE_EXTERNAL') {
    if (actor.role === 'PATIENT' && actor.patientId !== prescription.patientId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Anda hanya dapat memilih tempat pembelian untuk resep milik Anda sendiri.'
      })
    }

    if (prescription.isDispensed) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Obat pada resep ini telah diserahkan dari klinik dan tidak dapat diubah lagi.'
      })
    }

    if (action === 'CHOOSE_CLINIC') {
      // Validasi ketersediaan stok obat aktif sebelum mencatat pesanan obat dari klinik
      for (const item of prescription.items) {
        const stockInfo = await getMedicineAvailableStock(item.medicineId)
        if (stockInfo.availableStock < item.quantity) {
          throw createError({
            statusCode: 409,
            statusMessage: `Stok aktif untuk ${item.medicine.name} tidak mencukupi (tersedia ${stockInfo.availableStock}, dibutuhkan ${item.quantity}). Silakan pilih pembelian di apotek luar atau hubungi Admin.`
          })
        }
      }

      const updated = await prisma.prescription.update({
        where: { id: prescription.id },
        data: {
          notes: 'PILIHAN_PEMBELIAN:BELI_DI_KLINIK'
        }
      })

      await writeAuditLog(event, {
        actorId: actor.id,
        actorRole: actor.role,
        action: 'PRESCRIPTION_CHOOSE_CLINIC',
        entityType: 'Prescription',
        entityId: prescription.id,
        afterJson: { prescriptionNumber: prescription.prescriptionNumber, choice: 'BELI_DI_KLINIK' }
      })

      return {
        success: true,
        message: 'Pesanan obat dari klinik berhasil dicatat. Admin akan menyiapkan obat dan memasukkan biayanya ke invoice Anda.',
        prescription: updated
      }
    }

    const updated = await prisma.prescription.update({
      where: { id: prescription.id },
      data: {
        notes: 'PILIHAN_PEMBELIAN:APOTEK_LUAR'
      }
    })

    await writeAuditLog(event, {
      actorId: actor.id,
      actorRole: actor.role,
      action: 'PRESCRIPTION_CHOOSE_EXTERNAL',
      entityType: 'Prescription',
      entityId: prescription.id,
      afterJson: { prescriptionNumber: prescription.prescriptionNumber, choice: 'APOTEK_LUAR' }
    })

    return {
      success: true,
      message: 'Pilihan membeli obat sendiri di apotek luar telah disimpan. Biaya obat tidak dimasukkan ke invoice klinik.',
      prescription: updated
    }
  }

  // ADMIN_DISPENSE: Admin menyerahkan obat kepada pasien & mengurangi stok secara FEFO
  if (actor.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Hanya Administrator yang memiliki wewenang mengelola penyerahan dan pengurangan stok obat klinik.'
    })
  }

  if (prescription.isDispensed) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Obat untuk resep ini sudah diserahkan sebelumnya.'
    })
  }

  const dispensed = await prisma.$transaction(async (tx) => {
    for (const item of prescription.items) {
      await recordStockOutFefo(
        {
          medicineId: item.medicineId,
          quantity: item.quantity,
          actorId: actor.id,
          type: 'PRESCRIPTION_DISPENSE',
          referenceType: 'PRESCRIPTION',
          referenceId: prescription.prescriptionNumber,
          notes: `Penyerahan obat resep ${prescription.prescriptionNumber} oleh Admin kepada pasien ${prescription.patient.fullName}`
        },
        tx
      )
    }

    return tx.prescription.update({
      where: { id: prescription.id },
      data: {
        isDispensed: true,
        dispensedAt: new Date(),
        notes: 'PILIHAN_PEMBELIAN:BELI_DI_KLINIK_DISERAHKAN'
      }
    })
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'PRESCRIPTION_ADMIN_DISPENSE_FEFO',
    entityType: 'Prescription',
    entityId: prescription.id,
    afterJson: {
      prescriptionNumber: prescription.prescriptionNumber,
      isDispensed: true
    }
  })

  return {
    success: true,
    message: 'Obat berhasil diserahkan kepada pasien dan stok telah dikurangi secara otomatis menggunakan metode FEFO.',
    prescription: dispensed
  }
})
