import { defineStore } from 'pinia'
import type { SessionUser, UserRoleCode } from '~/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<SessionUser | null>(null)
  const initialized = ref(false)
  const loading = ref(false)

  const isAuthenticated = computed(() => Boolean(user.value))
  const role = computed<UserRoleCode>(() => user.value?.role ?? 'VISITOR')

  const portalHomePath = computed(() => {
    switch (user.value?.role) {
      case 'ADMIN':
        return '/admin'
      case 'DOCTOR':
        return '/doctor'
      case 'RECEPTIONIST':
        return '/receptionist'
      case 'PATIENT':
        return '/patient'
      default:
        return '/'
    }
  })

  async function fetchMe() {
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const res = await $fetch<{ authenticated: boolean; user: SessionUser | null }>('/api/auth/me', {
        headers
      })
      user.value = res.user
    } catch {
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  async function login(payload: { email: string; password: string }) {
    loading.value = true
    try {
      const res = await $fetch<{ success: boolean; user: SessionUser; message: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: payload
        }
      )
      user.value = res.user
      initialized.value = true
      return res
    } finally {
      loading.value = false
    }
  }

  async function register(payload: Record<string, unknown>) {
    loading.value = true
    try {
      const res = await $fetch<{
        success: boolean
        user: SessionUser
        message: string
        verificationTokenDevPreview?: string
      }>('/api/auth/register', {
        method: 'POST',
        body: payload
      })
      await fetchMe()
      return res
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
    await navigateTo('/auth/login')
  }

  return {
    user,
    initialized,
    loading,
    isAuthenticated,
    role,
    portalHomePath,
    fetchMe,
    login,
    register,
    logout
  }
})
