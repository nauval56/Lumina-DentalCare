import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { recordStockOutFefo } from '../../services/inventoryLedgerService'
import { writeAuditLog } from '../../utils/audit'

const createInvoiceSchema = z.object({
  medicalRecordId: z.string().optional(),
  appointmentId: z.string().optional(),
  patientId: z.string().min(1, 'Pilih pasien'),
  description: z.string().trim().min(3, 'Masukkan deskripsi tagihan').optional(),
  subtotal: z.coerce.number().min(0, 'Subtotal minimal 0').optional(),
  discount: z.coerce.number().min(0).default(0),
  includeClinicPrescription: z.boolean().default(true),
  dispenseClinicPrescription: z.boolean().default(false),
  notes: z.string().trim().max(500).optional()
})

export default defineEventHandler(async (event) => {
  // Sesuai PRD Bab 5 & 10: Admin memeriksa treatment record dari dokter dan membuat invoice resmi
  const actor = await requireRole(event, ['ADMIN'])
  const body = await readBody(event)
  const parsed = createInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data tagihan tidak valid.'
    })
  }

  const d = parsed.data
  const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

  // Jika dibuat berdasarkan Treatment Record dari Dokter
  if (d.medicalRecordId) {
    const record = await prisma.medicalRecord.findUnique({
      where: { id: d.medicalRecordId },
      include: {
        patient: true,
        doctor: true,
        appointment: {
          include: { invoice: true }
        },
        treatments: true,
        prescriptions: {
          include: {
            items: {
              include: { medicine: true }
            }
          }
        }
      }
    })

    if (!record) {
      throw createError({ statusCode: 404, statusMessage: 'Treatment record tidak ditemukan.' })
    }

    if (record.appointment?.invoice) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Invoice untuk treatment record ini sudah pernah diterbitkan.'
      })
    }

    const consultFee = Number(record.doctor.consultationFee || 150000)
    const itemsList: Array<{
      name: string
      qty: number
      unitPrice: number
      subtotal: number
    }> = [
      {
        name: `Konsultasi Dokter (${record.doctor.titlePrefix || ''} ${record.doctor.fullName})`,
        qty: 1,
        unitPrice: consultFee,
        subtotal: consultFee
      },
      ...record.treatments.map((t) => ({
        name: `Tindakan: ${t.name}${t.toothNumber ? ` (Gigi ${t.toothNumber})` : ''}`,
        qty: 1,
        unitPrice: Number(t.fee),
        subtotal: Number(t.fee)
      }))
    ]

    // Periksa apakah pasien memilih membeli obat dari klinik
    for (const rx of record.prescriptions) {
      const isExternal = rx.notes?.includes('APOTEK_LUAR')
      const isClinicChosen =
        rx.isDispensed ||
        rx.notes?.includes('BELI_DI_KLINIK') ||
        (d.includeClinicPrescription && !isExternal)

      if (isClinicChosen) {
        for (const item of rx.items) {
          const unitPrice = Number(item.unitPrice || item.medicine.unitPrice)
          itemsList.push({
            name: `Obat Klinik: ${item.medicine.name}`,
            qty: item.quantity,
            unitPrice,
            subtotal: unitPrice * item.quantity
          })
        }
      }
    }

    const calculatedSubtotal = itemsList.reduce((sum, i) => sum + i.subtotal, 0)
    const totalAmount = Math.max(0, calculatedSubtotal - d.discount)

    const invoice = await prisma.$transaction(async (tx) => {
      // Jika Admin sekaligus menyerahkan obat klinik, potong stok secara FEFO
      if (d.dispenseClinicPrescription) {
        for (const rx of record.prescriptions) {
          const isExternal = rx.notes?.includes('APOTEK_LUAR')
          if (!rx.isDispensed && !isExternal) {
            for (const item of rx.items) {
              await recordStockOutFefo(
                {
                  medicineId: item.medicineId,
                  quantity: item.quantity,
                  actorId: actor.id,
                  type: 'PRESCRIPTION_DISPENSE',
                  referenceType: 'PRESCRIPTION',
                  referenceId: rx.prescriptionNumber,
                  notes: `Penyerahan obat resep ${rx.prescriptionNumber} saat penerbitan invoice ${invoiceNumber}`
                },
                tx
              )
            }
            await tx.prescription.update({
              where: { id: rx.id },
              data: {
                isDispensed: true,
                dispensedAt: new Date(),
                notes: 'PILIHAN_PEMBELIAN:BELI_DI_KLINIK_DISERAHKAN'
              }
            })
          }
        }
      }

      const createdInv = await tx.invoice.create({
        data: {
          invoiceNumber,
          patientId: record.patientId,
          appointmentId: record.appointmentId,
          itemsJson: itemsList,
          subtotal: calculatedSubtotal,
          discount: d.discount,
          tax: 0,
          totalAmount,
          paidAmount: 0,
          status: 'UNPAID',
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
          notes:
            d.notes ||
            `Tagihan resmi layanan medis kode booking ${record.appointment?.bookingCode || record.id} (diverifikasi oleh Admin)`
        }
      })

      if (record.patient.userId) {
        await tx.notification.create({
          data: {
            userId: record.patient.userId,
            type: 'PAYMENT',
            title: 'Tagihan Perawatan (Invoice) Telah Diterbitkan Admin',
            message: `Admin telah menerbitkan invoice #${invoiceNumber} sebesar Rp ${totalAmount.toLocaleString('id-ID')} berdasarkan layanan dan tindakan yang diberikan dokter.`,
            linkUrl: '/patient/payments'
          }
        })
      }

      return createdInv
    })

    await writeAuditLog(event, {
      actorId: actor.id,
      actorRole: actor.role,
      action: 'INVOICE_CREATE_FROM_TREATMENT_RECORD',
      entityType: 'Invoice',
      entityId: invoice.id,
      afterJson: {
        invoiceNumber,
        medicalRecordId: record.id,
        totalAmount
      }
    })

    return {
      success: true,
      message: 'Invoice berhasil diterbitkan oleh Admin berdasarkan treatment record dokter.',
      invoice
    }
  }

  // Pembuatan invoice manual oleh Admin
  const manualSubtotal = d.subtotal ?? 0
  const totalAmount = Math.max(0, manualSubtotal - d.discount)

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      patientId: d.patientId,
      appointmentId: d.appointmentId || null,
      itemsJson: [
        {
          name: d.description || 'Layanan Perawatan Gigi',
          qty: 1,
          unitPrice: manualSubtotal,
          subtotal: manualSubtotal
        }
      ],
      subtotal: manualSubtotal,
      discount: d.discount,
      tax: 0,
      totalAmount,
      paidAmount: 0,
      status: 'UNPAID',
      notes: d.notes || null
    }
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'INVOICE_CREATE',
    entityType: 'Invoice',
    entityId: invoice.id,
    afterJson: { invoiceNumber, totalAmount }
  })

  return {
    success: true,
    message: 'Tagihan baru berhasil dibuat oleh Admin.',
    invoice
  }
})
