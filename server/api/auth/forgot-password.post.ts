import { z } from 'zod'
import { readBody, createError, getRequestURL } from 'h3'
import { prisma } from '../../utils/prisma'
import { generateSecureToken, hashToken } from '../../utils/crypto'
import { enforceRateLimit } from '../../utils/rateLimit'
import { writeAuditLog } from '../../utils/audit'
import { sendPasswordResetEmail } from '../../utils/mailer'

const forgotSchema = z.object({
  email: z.string().trim().email('Masukkan alamat email yang valid')
})

function maskEmailAddress(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`
}

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'auth:forgot', 8, 60_000)

  const body = await readBody(event)
  const parsed = forgotSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message || 'Alamat email tidak valid.'
    })
  }

  const normalizedEmail = parsed.data.email.toLowerCase()
  const maskedEmail = maskEmailAddress(normalizedEmail)
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  })

  const config = useRuntimeConfig()
  const reqUrl = getRequestURL(event)
  const appBaseUrl = (
    config.public?.appUrl ||
    `${reqUrl.protocol}//${reqUrl.host}` ||
    'http://localhost:3000'
  ).replace(/\/$/, '')

  let emailSent = false
  let emailProvider: 'gmail-smtp' | 'dev-fallback' = 'dev-fallback'
  let emailNote: string | undefined
  let resetUrlDevPreview: string | undefined
  let resetTokenDevPreview: string | undefined

  if (user && user.isActive) {
    const rawToken = generateSecureToken(24)
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30) // 30 menit
    const resetUrl = `${appBaseUrl}/auth/reset-password?token=${encodeURIComponent(rawToken)}`

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    })

    const mailResult = await sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      resetUrl,
      rawToken,
      expiresInMinutes: 30
    })

    emailSent = mailResult.sent
    emailProvider = mailResult.provider
    emailNote = mailResult.reason

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Permintaan Reset Password',
        message: emailSent
          ? `Tautan pengaturan ulang kata sandi telah dikirimkan ke Gmail Anda (${maskedEmail}).`
          : 'Permintaan pengaturan ulang kata sandi telah dibuat.',
        category: 'SECURITY'
      }
    })

    // Di mode development, jika Gmail SMTP belum diisi kredensialnya, tetap berikan preview link
    if (!emailSent && process.env.NODE_ENV !== 'production') {
      resetTokenDevPreview = rawToken
      resetUrlDevPreview = resetUrl
    }

    await writeAuditLog(event, {
      actorId: user.id,
      action: emailSent ? 'AUTH_FORGOT_PASSWORD_GMAIL_SENT' : 'AUTH_FORGOT_PASSWORD_REQUEST',
      entityType: 'User',
      entityId: user.id,
      afterJson: {
        emailSent,
        provider: emailProvider
      }
    })
  }

  return {
    success: true,
    emailSent,
    emailProvider,
    maskedEmail,
    emailNote: process.env.NODE_ENV !== 'production' ? emailNote : undefined,
    message: emailSent
      ? `Tautan untuk mengubah kata sandi telah dikirim ke Gmail Anda (${maskedEmail}). Silakan buka kotak masuk (atau folder Spam) dan klik tombol "Atur Ulang Kata Sandi Sekarang".`
      : `Permintaan reset password untuk ${maskedEmail} telah diproses.`,
    resetUrlDevPreview,
    resetTokenDevPreview
  }
})
