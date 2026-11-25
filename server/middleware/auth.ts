import { setResponseHeaders } from 'h3'
import { getUserFromSession } from '../utils/session'

export default defineEventHandler(async (event) => {
  // Security Headers
  setResponseHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block'
  })

  // Pre-populate auth user context for API routes
  if (event.path.startsWith('/api/')) {
    await getUserFromSession(event).catch(() => null)
  }
})
