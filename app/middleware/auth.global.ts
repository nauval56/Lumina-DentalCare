import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  if (!auth.initialized) {
    await auth.fetchMe()
  }

  const path = to.path
  const protectedPrefixes: Array<{ prefix: string; roles: string[] }> = [
    { prefix: '/patient', roles: ['PATIENT'] },
    { prefix: '/doctor', roles: ['DOCTOR'] },
    { prefix: '/receptionist', roles: ['RECEPTIONIST'] },
    { prefix: '/admin', roles: ['ADMIN'] }
  ]

  const matchedRule = protectedPrefixes.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`))
  if (!matchedRule) {
    return
  }

  if (!auth.isAuthenticated || !auth.user) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
  }

  if (!matchedRule.roles.includes(auth.user.role)) {
    return navigateTo(auth.portalHomePath)
  }
})
