export type UserRoleCode = 'VISITOR' | 'PATIENT' | 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN'

export interface SessionUser {
  id: string
  fullName: string
  email: string
  phone: string | null
  avatarUrl: string | null
  isActive: boolean
  isEmailVerified: boolean
  role: UserRoleCode
  roleName: string
  patientId: string | null
  doctorId: string | null
}

export type AppointmentStatusCode =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_TREATMENT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'NO_SHOW'

export type QueueStatusCode =
  | 'WAITING'
  | 'CALLED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED'

export type ToothConditionCode =
  | 'SEHAT'
  | 'KARIES'
  | 'TAMBALAN'
  | 'HILANG'
  | 'SISA_AKAR'
  | 'IMPLAN'
  | 'MAHKOTA'
  | 'PERAWATAN_SALURAN_AKAR'
  | 'GOYANG'
  | 'FRAKTUR'

export type InvoiceStatusCode = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'REFUNDED'
export type PaymentMethodCode = 'CASH' | 'BANK_TRANSFER' | 'QRIS' | 'VIRTUAL_ACCOUNT' | 'EWALLET'
export type PaymentStatusCode =
  | 'PENDING'
  | 'WAITING_VERIFICATION'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED'
