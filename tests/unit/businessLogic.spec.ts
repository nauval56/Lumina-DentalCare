import { describe, it, expect } from 'vitest'
import {
  calculatePatientAgeYears,
  getOdontogramModeByAge,
  getWisdomToothRule
} from '../../app/utils/odontogramAgeRules'
import {
  createDefaultClinicScheduleConfig,
  evaluateClinicDateStatus,
  evaluateDoctorLeaveQuota
} from '../../app/utils/clinicScheduleRules'
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashToken,
  createWebhookSignature,
  verifyWebhookSignature
} from '../../server/utils/crypto'
import {
  timeToMinutes,
  minutesToTime,
  hasTimeOverlap,
  buildSlotKey
} from '../../server/services/appointmentVerificationService'
import { allocateFefoBatches } from '../../server/services/inventoryLedgerService'
import { FDI_TEETH_CATALOG } from '../../server/utils/fdiTeeth'
import { MockPaymentGatewayAdapter } from '../../server/services/paymentGatewayService'

describe('Lumina Dental Care — Unit Tests (Security, Appointment, FEFO, FDI & Payment)', () => {
  it('1. Password hashing & verification (Scrypt memory-hard)', () => {
    const hash = hashPassword('Lumina123!')
    expect(hash.startsWith('$scrypt$')).toBe(true)
    expect(verifyPassword('Lumina123!', hash)).toBe(true)
    expect(verifyPassword('WrongPassword99!', hash)).toBe(false)
  })

  it('2. Token generation & SHA-256 token hashing', () => {
    const raw = generateSecureToken(32)
    expect(raw.length).toBe(64)
    const digest = hashToken(raw)
    expect(digest.length).toBe(64)
    expect(digest).not.toBe(raw)
  })

  it('3. Webhook HMAC-SHA256 signature verification', () => {
    const payload = 'EVT-001:MOCK-TX-123:SUCCESS'
    const secret = 'tidb-lumina-secret-key'
    const validSig = createWebhookSignature(payload, secret)
    expect(verifyWebhookSignature(payload, validSig, secret)).toBe(true)
    expect(verifyWebhookSignature(payload, 'invalid-signature', secret)).toBe(false)
  })

  it('4. Appointment time conversion, overlap detection & atomic slotKey generation', () => {
    expect(timeToMinutes('09:30')).toBe(570)
    expect(minutesToTime(615)).toBe('10:15')
    expect(hasTimeOverlap('09:00', '09:45', '09:30', '10:00')).toBe(true)
    expect(hasTimeOverlap('09:00', '09:30', '09:30', '10:00')).toBe(false)
    expect(buildSlotKey('doc123', '2026-11-25', '09:30')).toBe('doc123_2026-11-25_09:30')
  })

  it('5. Inventory FEFO (First Expired, First Out) allocation & expired batch rejection', () => {
    const refDate = new Date('2026-11-23T00:00:00.000Z')
    const batches = [
      {
        id: 'b-expired',
        batchNumber: 'BATCH-EXP',
        expiryDate: new Date('2026-10-01T00:00:00.000Z'), // sudah kedaluwarsa -> harus diabaikan
        remainingQty: 50
      },
      {
        id: 'b-later',
        batchNumber: 'BATCH-2027-LATE',
        expiryDate: new Date('2027-09-01T00:00:00.000Z'),
        remainingQty: 20
      },
      {
        id: 'b-sooner',
        batchNumber: 'BATCH-2027-SOON',
        expiryDate: new Date('2027-02-01T00:00:00.000Z'),
        remainingQty: 10
      }
    ]

    const allocated = allocateFefoBatches(batches, 15, refDate)
    expect(allocated.length).toBe(2)
    // Harus mengambil dari batch yang kedaluwarsa paling dekat tetapi masih aktif ('b-sooner') terlebih dahulu
    expect(allocated[0]?.batchNumber).toBe('BATCH-2027-SOON')
    expect(allocated[0]?.deductedQty).toBe(10)
    expect(allocated[1]?.batchNumber).toBe('BATCH-2027-LATE')
    expect(allocated[1]?.deductedQty).toBe(5)

    // Menolak stok negatif jika melebihi total stok aktif (10 + 20 = 30)
    expect(() => allocateFefoBatches(batches, 35, refDate)).toThrow(/tidak mencukupi/i)
  })

  it('6. FDI Odontogram catalog contains 32 permanent and 20 deciduous teeth', () => {
    expect(FDI_TEETH_CATALOG.length).toBe(52)
    const permCount = FDI_TEETH_CATALOG.filter((t) => t.toothType === 'PERMANENT').length
    const decCount = FDI_TEETH_CATALOG.filter((t) => t.toothType === 'DECIDUOUS').length
    expect(permCount).toBe(32)
    expect(decCount).toBe(20)
  })

  it('7. Mock Payment Gateway Adapter explicitly marks transactions as development simulation', async () => {
    const adapter = new MockPaymentGatewayAdapter()
    const tx = await adapter.createTransaction({
      paymentNumber: 'PAY-001',
      invoiceNumber: 'INV-001',
      amount: 550000,
      method: 'QRIS',
      customerName: 'Budi Santoso',
      idempotencyKey: 'IDEMP-001'
    })
    expect(tx.isSimulated).toBe(true)
    expect(tx.simulationBanner).toContain('SIMULASI DEVELOPMENT')
    expect(tx.qrString).toBeTruthy()
  })

  it('8. Odontogram age rules select PRIMARY (0-5), MIXED (6-12), PERMANENT (>=13) and wisdom tooth brackets', () => {
    const ref = new Date('2026-11-25T00:00:00Z')
    expect(calculatePatientAgeYears('2022-05-01', ref)).toBe(4)
    expect(getOdontogramModeByAge(4)).toBe('PRIMARY')
    expect(getOdontogramModeByAge(9)).toBe('MIXED')
    expect(getOdontogramModeByAge(13)).toBe('PERMANENT')
    expect(getOdontogramModeByAge(null)).toBe('PERMANENT')

    expect(getWisdomToothRule(12).isLockedUnder17).toBe(true)
    expect(getWisdomToothRule(12).options[0]?.label).toBe('Belum Erupsi')
    expect(getWisdomToothRule(20).options.map((o) => o.label)).toEqual([
      'Erupsi Normal',
      'Impaksi',
      'Sebagian Erupsi',
      'Belum Erupsi'
    ])
    expect(getWisdomToothRule(30).options.map((o) => o.label)).toEqual([
      'Ada',
      'Tidak Ada',
      'Impaksi',
      'Telah Dicabut'
    ])
  })

  it('9. Clinic schedule rules enforce Sunday holiday, national holidays, special closed, and reduced hours', () => {
    const cfg = createDefaultClinicScheduleConfig()
    cfg.specialOverrides['2026-11-26'] = {
      date: '2026-11-26',
      type: 'CLOSED',
      reason: 'Cuti Dokter Spesialis'
    }
    cfg.specialOverrides['2026-11-27'] = {
      date: '2026-11-27',
      type: 'REDUCED_HOURS',
      openTime: '09:00',
      closeTime: '14:00',
      reason: 'Sesi Pagi Saja'
    }

    const sunday = evaluateClinicDateStatus('2026-11-29', cfg)
    expect(sunday.isOpen).toBe(false)
    expect(sunday.badge).toBe('Libur')

    const natal = evaluateClinicDateStatus('2026-12-25', cfg)
    expect(natal.isOpen).toBe(false)
    expect(natal.status).toBe('HOLIDAY_NATIONAL')
    expect(natal.reason).toContain('Natal')

    const closedWeekday = evaluateClinicDateStatus('2026-11-26', cfg)
    expect(closedWeekday.isOpen).toBe(false)
    expect(closedWeekday.badge).toBe('Libur Klinik')

    const reducedWeekday = evaluateClinicDateStatus('2026-11-27', cfg)
    expect(reducedWeekday.isOpen).toBe(true)
    expect(reducedWeekday.isReducedHours).toBe(true)
    expect(reducedWeekday.badge).toBe('Jam Praktek Terbatas')
    expect(reducedWeekday.openTime).toBe('09:00')
    expect(reducedWeekday.closeTime).toBe('14:00')
  })

  it('10. Doctor monthly leave quota, approved doctor leave, and special practice dates work correctly', () => {
    const cfg = createDefaultClinicScheduleConfig()
    cfg.defaultMonthlyLeaveQuota = 2
    cfg.doctorLeaveRequests = [
      {
        id: 'l1',
        doctorId: 'doc-1',
        leaveDate: '2026-11-10',
        reason: 'Seminar',
        status: 'APPROVED',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z'
      },
      {
        id: 'l2',
        doctorId: 'doc-1',
        leaveDate: '2026-11-12',
        reason: 'Keluarga',
        status: 'PENDING',
        createdAt: '2026-11-02T00:00:00Z',
        updatedAt: '2026-11-02T00:00:00Z'
      }
    ]

    const quota = evaluateDoctorLeaveQuota('doc-1', '2026-11', cfg)
    expect(quota.quota).toBe(2)
    expect(quota.used).toBe(1)
    expect(quota.pending).toBe(1)
    expect(quota.remaining).toBe(1)
    expect(quota.canRequest).toBe(false)

    const onLeave = evaluateClinicDateStatus('2026-11-10', cfg, {}, 'doc-1')
    expect(onLeave.isOpen).toBe(false)
    expect(onLeave.status).toBe('DOCTOR_LEAVE')

    cfg.specialPracticeDates['2026-12-25'] = {
      date: '2026-12-25',
      openTime: '09:00',
      closeTime: '14:00',
      reason: 'Siaga Libur Natal'
    }
    const special = evaluateClinicDateStatus('2026-12-25', cfg, {}, 'doc-1')
    expect(special.isOpen).toBe(true)
    expect(special.status).toBe('SPECIAL_PRACTICE')
    expect(special.badge).toBe('Hari Praktik Khusus')
  })
})
