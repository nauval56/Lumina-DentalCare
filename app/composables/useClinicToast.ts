export interface ToastMessage {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'warning' | 'info'
}

export function useClinicToast() {
  const toasts = useState<ToastMessage[]>('lumina_toasts', () => [])

  function notify(input: Omit<ToastMessage, 'id'>) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    toasts.value.push({ id, ...input })
    if (import.meta.client) {
      setTimeout(() => {
        dismiss(id)
      }, 4500)
    }
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    toasts,
    notify,
    dismiss,
    success: (title: string, description?: string) =>
      notify({ title, description, type: 'success' }),
    error: (title: string, description?: string) =>
      notify({ title, description, type: 'error' }),
    info: (title: string, description?: string) =>
      notify({ title, description, type: 'info' })
  }
}
