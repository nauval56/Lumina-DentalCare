import { getQuery } from 'h3'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['ADMIN'])
  const query = getQuery(event)
  const days = Math.min(365, Math.max(7, Number(query.days || 30)))
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const [
    totalPatients,
    totalDoctors,
    todayAppointments,
    upcomingAppointments,
    successfulPayments,
    recentAppointments,
    servicesWithCounts,
    medicines,
    auditLogs
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.doctor.count({ where: { isActive: true } }),
    prisma.appointment.count({
      where: {
        appointmentDate: { gte: todayStart, lt: todayEnd }
      }
    }),
    prisma.appointment.count({
      where: {
        appointmentDate: { gte: todayStart },
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] }
      }
    }),
    prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: startDate }
      },
      include: {
        service: { select: { name: true } }
      },
      orderBy: { appointmentDate: 'asc' }
    }),
    prisma.service.findMany({
      include: {
        _count: { select: { appointments: true, treatments: true } }
      }
    }),
    prisma.medicine.findMany({
      where: { isActive: true },
      include: {
        inventory: true,
        batches: { where: { remainingQty: { gt: 0 } } }
      }
    }),
    prisma.auditLog.findMany({
      include: { actor: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
  ])

  const totalRevenue = successfulPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const now = new Date()
  const nearExpiryDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60)

  const lowStockMedicines = medicines.filter(
    (m) => (m.inventory?.availableStock ?? 0) <= m.minimumStock
  )
  const nearExpiryMedicines = medicines.filter((m) =>
    m.batches.some((b) => new Date(b.expiryDate) <= nearExpiryDate && new Date(b.expiryDate) > now)
  )

  // Group revenue & appointments by month/date label for ApexCharts
  const revenueByDateMap: Record<string, number> = {}
  for (const p of successfulPayments) {
    const key = (p.paidAt || p.createdAt).toISOString().slice(0, 10)
    revenueByDateMap[key] = (revenueByDateMap[key] || 0) + Number(p.amount)
  }

  const appointmentsByStatusMap: Record<string, number> = {}
  const visitsByDateMap: Record<string, number> = {}
  for (const a of recentAppointments) {
    appointmentsByStatusMap[a.status] = (appointmentsByStatusMap[a.status] || 0) + 1
    const dateKey = a.appointmentDate.toISOString().slice(0, 10)
    visitsByDateMap[dateKey] = (visitsByDateMap[dateKey] || 0) + 1
  }

  const popularServices = servicesWithCounts
    .map((s) => ({
      name: s.name,
      category: s.category,
      usageCount: s._count.appointments + s._count.treatments,
      price: Number(s.price)
    }))
    .sort((a, b) => b.usageCount - a.usageCount)

  return {
    kpi: {
      totalPatients,
      totalDoctors,
      todayAppointments,
      upcomingAppointments,
      totalRevenue,
      totalTransactions: successfulPayments.length,
      lowStockCount: lowStockMedicines.length,
      nearExpiryCount: nearExpiryMedicines.length
    },
    charts: {
      revenueSeries: Object.entries(revenueByDateMap).map(([date, amount]) => ({ date, amount })),
      visitsSeries: Object.entries(visitsByDateMap).map(([date, count]) => ({ date, count })),
      appointmentsByStatus: Object.entries(appointmentsByStatusMap).map(([status, count]) => ({
        status,
        count
      })),
      popularServices
    },
    alerts: {
      lowStockMedicines: lowStockMedicines.map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        unit: m.unit,
        availableStock: m.inventory?.availableStock ?? 0,
        minimumStock: m.minimumStock
      })),
      nearExpiryMedicines: nearExpiryMedicines.map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        earliestExpiry: m.batches[0]?.expiryDate ?? null
      }))
    },
    auditLogs
  }
})
