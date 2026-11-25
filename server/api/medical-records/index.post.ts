import { z } from 'zod'
import { readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'
import { writeAuditLog } from '../../utils/audit'

const createMedicalRecordSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment wajib dipilih'),
  chiefComplaint: z.string().trim().min(3, 'Keluhan utama pasien wajib diisi'),
  subjective: z.string().trim().optional(),
  objective: z.string().trim().optional(),
  assessment: z.string().trim().min(3, 'Assessment / ringkasan diagnosis wajib diisi'),
  plan: z.string().trim().optional(),
  clinicalNotes: z.string().trim().optional(),
  followUpDate: z.string().optional(),
  vitalSigns: z
    .object({
      bloodPressure: z.string().optional(),
      pulse: z.coerce.number().optional(),
      temperature: z.coerce.number().optional()
    })
    .optional(),
  diagnoses: z
    .array(
      z.object({
        icdCode: z.string().trim().optional(),
        name: z.string().trim().min(2, 'Nama diagnosis wajib diisi'),
        severity: z.string().trim().optional(),
        notes: z.string().trim().optional()
      })
    )
    .min(1, 'Minimal 1 diagnosis wajib diisi'),
  treatments: z
    .array(
      z.object({
        serviceId: z.string().optional(),
        toothNumber: z.string().trim().optional(),
        name: z.string().trim().min(2, 'Nama tindakan wajib diisi'),
        fee: z.coerce.number().min(0),
        notes: z.string().trim().optional()
      })
    )
    .min(1, 'Minimal 1 tindakan medis wajib diisi'),
  odontogramEntries: z
    .array(
      z.object({
        fdiNumber: z.string().trim(),
        condition: z.enum([
          'SEHAT',
          'KARIES',
          'TAMBALAN',
          'HILANG',
          'SISA_AKAR',
          'IMPLAN',
          'MAHKOTA',
          'PERAWATAN_SALURAN_AKAR',
          'GOYANG',
          'FRAKTUR'
        ]),
        surfaces: z.string().trim().optional(),
        diagnosis: z.string().trim().optional(),
        treatment: z.string().trim().optional(),
        notes: z.string().trim().optional()
      })
    )
    .optional(),
  prescriptionItems: z
    .array(
      z.object({
        medicineId: z.string().min(1),
        dosage: z.string().trim().min(1, 'Dosis wajib diisi'),
        frequency: z.string().trim().min(1, 'Frekuensi wajib diisi'),
        duration: z.string().trim().min(1, 'Durasi wajib diisi'),
        quantity: z.coerce.number().int().min(1),
        instructions: z.string().trim().optional()
      })
    )
    .optional()
})

export default defineEventHandler(async (event) => {
  // Dokter hanya bertanggung jawab atas pemeriksaan, diagnosis, tindakan medis, dan pencatatan treatment record
  const actor = await requireRole(event, ['DOCTOR', 'ADMIN'])
  const rawBody = await readBody(event)
  const parsed = createMedicalRecordSchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Data rekam medis tidak valid.'
    })
  }

  const d = parsed.data
  const appointment = await prisma.appointment.findUnique({
    where: { id: d.appointmentId },
    include: {
      patient: true,
      doctor: true,
      service: true,
      medicalRecord: true,
      invoice: true
    }
  })

  if (!appointment) {
    throw createError({ statusCode: 404, statusMessage: 'Appointment tidak ditemukan.' })
  }

  if (actor.role === 'DOCTOR' && actor.doctorId && appointment.doctorId !== actor.doctorId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Anda hanya dapat membuat rekam medis untuk pasien pada jadwal Anda.'
    })
  }

  if (appointment.medicalRecord) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Rekam medis untuk kunjungan ini sudah dibuat. Gunakan fitur edit rekam medis.'
    })
  }

  const created = await prisma.$transaction(async (tx) => {
    const record = await tx.medicalRecord.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        chiefComplaint: d.chiefComplaint,
        subjective: d.subjective || null,
        objective: d.objective || null,
        vitalSignsJson: d.vitalSigns ?? undefined,
        assessment: d.assessment,
        plan: d.plan || null,
        clinicalNotes: d.clinicalNotes || null,
        followUpDate: d.followUpDate ? new Date(d.followUpDate) : null,
        revisionNumber: 1,
        changeHistoryJson: [
          {
            revision: 1,
            actorId: actor.id,
            actorName: actor.fullName,
            timestamp: new Date().toISOString(),
            summary: 'Pencatatan treatment record & pengiriman ke Admin untuk pembuatan invoice'
          }
        ]
      }
    })

    for (const diag of d.diagnoses) {
      await tx.diagnosis.create({
        data: {
          medicalRecordId: record.id,
          icdCode: diag.icdCode || null,
          name: diag.name,
          severity: diag.severity || null,
          notes: diag.notes || null
        }
      })
    }

    for (const tr of d.treatments) {
      await tx.treatment.create({
        data: {
          medicalRecordId: record.id,
          serviceId: tr.serviceId || null,
          toothNumber: tr.toothNumber || null,
          name: tr.name,
          fee: tr.fee,
          notes: tr.notes || null
        }
      })
    }

    // Simpan odontogram jika ada
    if (d.odontogramEntries && d.odontogramEntries.length > 0) {
      for (const od of d.odontogramEntries) {
        const tooth = await tx.tooth.findUnique({ where: { fdiNumber: od.fdiNumber } })
        if (tooth) {
          await tx.odontogram.create({
            data: {
              patientId: appointment.patientId,
              doctorId: appointment.doctorId,
              medicalRecordId: record.id,
              toothId: tooth.id,
              condition: od.condition,
              surfaces: od.surfaces || null,
              diagnosis: od.diagnosis || null,
              treatment: od.treatment || null,
              notes: od.notes || null
            }
          })
        }
      }
    }

    // Simpan resep dokter TANPA langsung mengurangi stok obat (PRD Bab 5 & 8)
    // Pasien memilih tempat pembelian obat (Klinik vs Apotek Luar), dan Admin yang memotong stok saat obat diserahkan
    if (d.prescriptionItems && d.prescriptionItems.length > 0) {
      const rxNumber = `RX-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
      const prescription = await tx.prescription.create({
        data: {
          prescriptionNumber: rxNumber,
          medicalRecordId: record.id,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          notes: 'PILIHAN_PEMBELIAN:BELUM_DIPILIH',
          isDispensed: false,
          dispensedAt: null
        }
      })

      for (const item of d.prescriptionItems) {
        const medicine = await tx.medicine.findUnique({ where: { id: item.medicineId } })
        if (!medicine) {
          throw createError({ statusCode: 404, statusMessage: 'Obat pada resep tidak ditemukan.' })
        }

        const unitPrice = Number(medicine.unitPrice)
        await tx.prescriptionItem.create({
          data: {
            prescriptionId: prescription.id,
            medicineId: item.medicineId,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            quantity: item.quantity,
            instructions: item.instructions || null,
            unitPrice
          }
        })
      }
    }

    // Update status appointment & antrean menjadi COMPLETED
    await tx.appointment.update({
      where: { id: appointment.id },
      data: { status: 'COMPLETED' }
    })

    await tx.queue.updateMany({
      where: { appointmentId: appointment.id },
      data: { status: 'COMPLETED', completedAt: new Date() }
    })

    // Kirim notifikasi ke Pasien bahwa rekam medis & resep sudah tersedia
    if (appointment.patient.userId) {
      await tx.notification.create({
        data: {
          userId: appointment.patient.userId,
          type: 'MEDICAL',
          title: 'Hasil Pemeriksaan & Resep Dokter Tersedia',
          message: `Pemeriksaan Anda bersama ${appointment.doctor.titlePrefix || ''} ${appointment.doctor.fullName} telah selesai. Silakan cek riwayat medis, pilih tempat pembelian resep obat (Klinik / Apotek Luar), dan tunggu penerbitan invoice dari Admin.`,
          linkUrl: '/patient/medical-history'
        }
      })
    }

    // Kirim notifikasi ke Admin bahwa Treatment Record siap diperiksa untuk pembuatan Invoice
    const admins = await tx.user.findMany({
      where: {
        isActive: true,
        role: { code: 'ADMIN' }
      }
    })
    for (const adm of admins) {
      await tx.notification.create({
        data: {
          userId: adm.id,
          type: 'PAYMENT',
          title: 'Treatment Record Siap Dibuatkan Invoice',
          message: `Dokter telah mengirimkan treatment record untuk kunjungan #${appointment.bookingCode} (${appointment.patient.fullName}). Silakan periksa layanan aktual dan terbitkan invoice.`,
          linkUrl: '/admin/payments'
        }
      })
    }

    return record
  })

  await writeAuditLog(event, {
    actorId: actor.id,
    actorRole: actor.role,
    action: 'MEDICAL_RECORD_CREATE',
    entityType: 'MedicalRecord',
    entityId: created.id,
    afterJson: {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      assessment: created.assessment
    }
  })

  return {
    success: true,
    message: 'Treatment record, diagnosis, tindakan, dan resep berhasil disimpan serta dikirimkan ke Admin untuk pembuatan invoice.',
    medicalRecord: created
  }
})
