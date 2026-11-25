import tls from 'node:tls'
import net from 'node:net'
import { prisma } from './prisma'

export interface SendPasswordResetEmailInput {
  to: string
  fullName: string
  resetUrl: string
  rawToken: string
  expiresInMinutes?: number
}

export interface SendEmailResult {
  sent: boolean
  provider: 'gmail-smtp' | 'dev-fallback'
  reason?: string
}

interface SmtpCredentials {
  host: string
  port: number
  user: string
  pass: string
  fromName: string
}

/**
 * Mengambil konfigurasi Gmail SMTP dari environment variables (.env)
 * atau fallback dari konfigurasi ClinicSetting di TiDB Cloud.
 */
export async function resolveGmailSmtpCredentials(): Promise<SmtpCredentials | null> {
  const config = useRuntimeConfig()

  let user = (process.env.GMAIL_USER || process.env.SMTP_USER || config.gmailUser || '').trim()
  let rawPass = (
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_PASS ||
    config.gmailAppPassword ||
    ''
  ).trim()
  const host = (process.env.SMTP_HOST || config.smtpHost || 'smtp.gmail.com').trim()
  const port = Number(process.env.SMTP_PORT || config.smtpPort || 465)
  let fromName = (process.env.SMTP_FROM_NAME || 'Lumina Dental Care').trim()

  if (!user || !rawPass) {
    try {
      const setting = await prisma.clinicSetting.findFirst()
      const notif = (setting?.notificationConfig || {}) as Record<string, unknown>
      if (!user && typeof notif.gmailUser === 'string') {
        user = notif.gmailUser.trim()
      }
      if (!rawPass && typeof notif.gmailAppPassword === 'string') {
        rawPass = notif.gmailAppPassword.trim()
      }
      if (setting?.clinicName) {
        fromName = setting.clinicName
      }
    } catch {
      // Abaikan jika gagal membaca DB
    }
  }

  // Google App Password sering disalin dengan spasi ("xxxx xxxx xxxx xxxx"), bersihkan spasi
  const pass = rawPass.replace(/\s+/g, '')

  if (!user || !pass) {
    return null
  }

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 465,
    user,
    pass,
    fromName
  }
}

/**
 * Mengirim email melalui protokol SMTP over TLS (smtp.gmail.com:465 atau STARTTLS:587)
 * menggunakan modul bawaan Node.js (`node:tls` / `node:net`) tanpa ketergantungan paket luar.
 */
async function sendRawSmtpMail(
  creds: SmtpCredentials,
  mail: {
    to: string
    subject: string
    text: string
    html: string
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutMs = 15_000
    let socket: tls.TLSSocket | net.Socket
    let buffer = ''
    let timer: NodeJS.Timeout | null = null

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }

    const fail = (err: Error) => {
      cleanup()
      try {
        socket?.destroy()
      } catch {
        // ignore
      }
      reject(err)
    }

    timer = setTimeout(() => {
      fail(new Error('Koneksi ke server Gmail SMTP melebihi batas waktu (timeout 15 detik).'))
    }, timeoutMs)

    type StepHandler = (code: number, message: string) => void
    const queue: StepHandler[] = []

    const attachLineReader = (activeSocket: tls.TLSSocket | net.Socket) => {
      activeSocket.setEncoding('utf8')
      activeSocket.on('error', (err) => fail(err))
      activeSocket.on('data', (chunk: string) => {
        buffer += chunk
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.length < 3) continue
          const code = Number(line.slice(0, 3))
          const separator = line[3]
          // Multi-line response memiliki tanda '-' pada karakter ke-4 (misal "250-SIZE ...")
          // Baris terakhir memiliki spasi ' ' atau akhir baris.
          if (separator === ' ' || separator === undefined) {
            const handler = queue.shift()
            if (handler) {
              handler(code, line)
            }
          }
        }
      })
    }

    const sendCommand = (
      activeSocket: tls.TLSSocket | net.Socket,
      cmd: string,
      expectedCodes: number[],
      next: () => void
    ) => {
      queue.push((code, line) => {
        if (!expectedCodes.includes(code)) {
          fail(new Error(`Gmail SMTP menolak perintah (${code}): ${line}`))
          return
        }
        next()
      })
      activeSocket.write(`${cmd}\r\n`)
    }

    const runAuthenticatedSession = (tlsSock: tls.TLSSocket) => {
      const authPlain = Buffer.from(`\u0000${creds.user}\u0000${creds.pass}`, 'utf8').toString(
        'base64'
      )
      const boundary = `lumina_mime_${Date.now().toString(36)}`
      const encodedSubject = `=?UTF-8?B?${Buffer.from(mail.subject, 'utf8').toString('base64')}?=`
      const encodedFromName = `=?UTF-8?B?${Buffer.from(creds.fromName, 'utf8').toString('base64')}?=`

      const rawMime = [
        `From: ${encodedFromName} <${creds.user}>`,
        `To: <${mail.to}>`,
        `Subject: ${encodedSubject}`,
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@luminadental.id>`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 8bit',
        '',
        mail.text,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 8bit',
        '',
        mail.html,
        '',
        `--${boundary}--`,
        ''
      ]
        .map((line) => (line.startsWith('.') ? `.${line}` : line))
        .join('\r\n')

      sendCommand(tlsSock, `AUTH PLAIN ${authPlain}`, [235], () => {
        sendCommand(tlsSock, `MAIL FROM:<${creds.user}>`, [250], () => {
          sendCommand(tlsSock, `RCPT TO:<${mail.to}>`, [250, 251], () => {
            sendCommand(tlsSock, 'DATA', [354], () => {
              sendCommand(tlsSock, `${rawMime}\r\n.`, [250], () => {
                cleanup()
                tlsSock.write('QUIT\r\n')
                tlsSock.end()
                resolve()
              })
            })
          })
        })
      })
    }

    if (creds.port === 587) {
      // Port 587: Koneksi plain kemudian upgrade STARTTLS
      const plainSock = net.createConnection({ host: creds.host, port: creds.port })
      socket = plainSock
      attachLineReader(plainSock)

      queue.push((code, line) => {
        if (code !== 220) {
          fail(new Error(`Gagal membuka koneksi SMTP (${code}): ${line}`))
          return
        }
        sendCommand(plainSock, 'EHLO luminadental.id', [250], () => {
          sendCommand(plainSock, 'STARTTLS', [220], () => {
            plainSock.removeAllListeners('data')
            const tlsSock = tls.connect(
              {
                socket: plainSock,
                host: creds.host,
                servername: creds.host
              },
              () => {
                socket = tlsSock
                attachLineReader(tlsSock)
                sendCommand(tlsSock, 'EHLO luminadental.id', [250], () => {
                  runAuthenticatedSession(tlsSock)
                })
              }
            )
            tlsSock.on('error', (err) => fail(err))
          })
        })
      })
    } else {
      // Port 465 (Default Gmail Implicit TLS)
      const tlsSock = tls.connect({
        host: creds.host,
        port: creds.port,
        servername: creds.host
      })
      socket = tlsSock
      attachLineReader(tlsSock)

      queue.push((code, line) => {
        if (code !== 220) {
          fail(new Error(`Gagal membuka koneksi TLS Gmail SMTP (${code}): ${line}`))
          return
        }
        sendCommand(tlsSock, 'EHLO luminadental.id', [250], () => {
          runAuthenticatedSession(tlsSock)
        })
      })
    }
  })
}

/**
 * Mengirim email instruksi & tombol tautan Reset Password ke Gmail pengguna.
 */
export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput
): Promise<SendEmailResult> {
  const expiresIn = input.expiresInMinutes ?? 30
  const creds = await resolveGmailSmtpCredentials()

  if (!creds) {
    return {
      sent: false,
      provider: 'dev-fallback',
      reason:
        'Kredensial GMAIL_USER dan GMAIL_APP_PASSWORD belum dikonfigurasi pada file .env atau Pengaturan Admin.'
    }
  }

  const subject = '[Lumina Dental Care] Atur Ulang Kata Sandi Akun Anda'

  const text = [
    `Halo ${input.fullName},`,
    '',
    'Kami menerima permintaan untuk mengatur ulang kata sandi (reset password) akun Lumina Dental Care Anda.',
    '',
    'Silakan klik tautan berikut untuk membuat kata sandi baru:',
    input.resetUrl,
    '',
    `Kode Token Reset: ${input.rawToken}`,
    `Masa Berlaku: ${expiresIn} menit sejak email ini dikirimkan.`,
    '',
    'Apabila Anda tidak merasa melakukan permintaan ini, abaikan email ini. Kata sandi akun Anda tidak akan berubah.',
    '',
    'Salam hangat,',
    'Lumina Dental Care · Senyum Cerah Dimulai Dari Perawatan Terbaik'
  ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Atur Ulang Kata Sandi · Lumina Dental Care</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:'Inter',Arial,sans-serif;color:#0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#FFFFFF;border-radius:20px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0EA5E9 0%,#14B8A6 100%);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.01em;">
                Lumina Dental Care
              </h1>
              <p style="margin:6px 0 0;font-size:12px;color:#E0F2FE;font-weight:500;">
                Senyum Cerah Dimulai Dari Perawatan Terbaik
              </p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#0F172A;">
                Halo, ${input.fullName}
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">
                Kami menerima permintaan untuk mengatur ulang kata sandi (<strong>Reset Password</strong>) untuk akun Lumina Dental Care yang terhubung dengan alamat email ini.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#475569;">
                Silakan klik tombol di bawah ini untuk langsung membuka halaman pengubahan kata sandi baru Anda:
              </p>
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:4px 0 28px;">
                    <a href="${input.resetUrl}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:14px 28px;background-color:#0EA5E9;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;border-radius:14px;box-shadow:0 4px 12px rgba(14,165,233,0.28);">
                      Atur Ulang Kata Sandi Sekarang
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Fallback Box -->
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#334155;">
                  Atau salin tautan berikut ke browser Anda:
                </p>
                <p style="margin:0 0 12px;font-size:12px;word-break:break-all;color:#0284C7;">
                  <a href="${input.resetUrl}" style="color:#0284C7;text-decoration:underline;">${input.resetUrl}</a>
                </p>
                <p style="margin:0;font-size:11px;color:#64748B;">
                  Kode Token Manual: <code style="background:#FFFFFF;padding:2px 6px;border-radius:6px;border:1px solid #CBD5E1;color:#0F172A;font-weight:600;">${input.rawToken}</code>
                </p>
              </div>
              <p style="margin:0 0 12px;font-size:12px;line-height:1.5;color:#64748B;">
                Demi keamanan akun Anda, tautan ini hanya berlaku selama <strong>${expiresIn} menit</strong> dan hanya dapat digunakan satu kali.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94A3B8;">
                Apabila Anda tidak merasa meminta pengaturan ulang kata sandi, silakan abaikan email ini. Akun Anda tetap aman.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;border-top:1px solid #E2E8F0;padding:18px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94A3B8;">
                © ${new Date().getFullYear()} Lumina Dental Care · Sistem Informasi Manajemen Klinik Gigi
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    await sendRawSmtpMail(creds, {
      to: input.to,
      subject,
      text,
      html
    })
    return {
      sent: true,
      provider: 'gmail-smtp'
    }
  } catch (err: unknown) {
    const rawMsg = (err as Error)?.message || 'Gagal mengirim email melalui Gmail SMTP.'
    const isAuthError =
      rawMsg.includes('534') ||
      rawMsg.includes('535') ||
      rawMsg.toLowerCase().includes('username and password not accepted') ||
      rawMsg.toLowerCase().includes('application-specific password')

    return {
      sent: false,
      provider: 'gmail-smtp',
      reason: isAuthError
        ? `Google SMTP menolak autentikasi untuk ${creds.user}. Pastikan GMAIL_APP_PASSWORD diisi dengan 16-digit "Sandi Aplikasi (App Password)" dari https://myaccount.google.com/apppasswords (bukan password login Gmail biasa). Detail: ${rawMsg}`
        : rawMsg
    }
  }
}
