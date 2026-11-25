<script setup lang="ts">
import {
  APPOINTMENT_STATUS_LABELS,
  QUEUE_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  TOOTH_CONDITION_META
} from '~/utils/format'

const props = defineProps<{
  status: string
  kind?: 'appointment' | 'queue' | 'invoice' | 'payment' | 'tooth'
}>()

const label = computed(() => {
  if (props.kind === 'queue') return QUEUE_STATUS_LABELS[props.status] || props.status
  if (props.kind === 'invoice') return INVOICE_STATUS_LABELS[props.status] || props.status
  if (props.kind === 'payment') return PAYMENT_STATUS_LABELS[props.status] || props.status
  if (props.kind === 'tooth') return TOOTH_CONDITION_META[props.status]?.label || props.status
  return (
    APPOINTMENT_STATUS_LABELS[props.status] ||
    INVOICE_STATUS_LABELS[props.status] ||
    PAYMENT_STATUS_LABELS[props.status] ||
    QUEUE_STATUS_LABELS[props.status] ||
    props.status
  )
})

const badgeClass = computed(() => {
  if (props.kind === 'tooth' && TOOTH_CONDITION_META[props.status]) {
    return TOOTH_CONDITION_META[props.status]!.colorClass
  }

  switch (props.status) {
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'PAID':
    case 'SUCCESS':
    case 'SEHAT':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'CHECKED_IN':
    case 'IN_TREATMENT':
    case 'IN_PROGRESS':
    case 'CALLED':
      return 'bg-[#EAF5F6] text-[#137A7F] border-[#D8E6E8]'
    case 'PENDING':
    case 'WAITING':
    case 'WAITING_VERIFICATION':
    case 'PARTIALLY_PAID':
    case 'RESCHEDULED':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'UNPAID':
    case 'CANCELLED':
    case 'FAILED':
    case 'NO_SHOW':
    case 'EXPIRED':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-700 border-[#D8E6E8]'
  }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border"
    :class="badgeClass"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-current" />
    {{ label }}
  </span>
</template>
