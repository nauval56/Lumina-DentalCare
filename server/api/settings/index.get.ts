import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  const setting = await prisma.clinicSetting.findFirst()
  const rawNotif = ((setting?.notificationConfig || {}) as Record<string, unknown>) || {}
  const envGmailUser = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim()
  const envGmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').trim()
  const dbGmailUser = typeof rawNotif.gmailUser === 'string' ? rawNotif.gmailUser.trim() : ''
  const dbGmailPass =
    typeof rawNotif.gmailAppPassword === 'string' ? rawNotif.gmailAppPassword.trim() : ''

  // Jangan pernah mengekspos plaintext gmailAppPassword ke client response
  const safeNotificationConfig = {
    emailReminder: rawNotif.emailReminder ?? true,
    whatsappReminder: rawNotif.whatsappReminder ?? true,
    lowStockAlert: rawNotif.lowStockAlert ?? true,
    expiryDaysThreshold: rawNotif.expiryDaysThreshold ?? 60,
    gmailUser: envGmailUser || dbGmailUser,
    gmailConfigured: Boolean((envGmailUser && envGmailPass) || (dbGmailUser && dbGmailPass)),
    gmailSource: envGmailUser && envGmailPass ? 'env' : dbGmailUser && dbGmailPass ? 'database' : 'none'
  }

  return {
    setting: setting
      ? {
          ...setting,
          notificationConfig: safeNotificationConfig
        }
      : {
          clinicName: 'Lumina Dental Care',
          tagline: 'Senyum Cerah Dimulai Dari Perawatan Terbaik',
          address:
            'Jl. Jenderal Ahmad Yani No. 128, Pontianak Selatan, Kota Pontianak, Kalimantan Barat 78121',
          phone: '(0561) 738900',
          whatsapp: '08115678900',
          email: 'layanan@luminadental.id',
          operatingHoursJson: {
            '0': { dayName: 'Minggu', isOpen: false, open: '09:00', close: '15:00' },
            '1': { dayName: 'Senin', isOpen: true, open: '08:00', close: '20:00' },
            '2': { dayName: 'Selasa', isOpen: true, open: '08:00', close: '20:00' },
            '3': { dayName: 'Rabu', isOpen: true, open: '08:00', close: '20:00' },
            '4': { dayName: 'Kamis', isOpen: true, open: '08:00', close: '20:00' },
            '5': { dayName: 'Jumat', isOpen: true, open: '08:00', close: '20:00' },
            '6': { dayName: 'Sabtu', isOpen: true, open: '08:00', close: '17:00' }
          },
          notificationConfig: safeNotificationConfig
        }
  }
})
