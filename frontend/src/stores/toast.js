import { defineStore } from 'pinia'
import { ref } from 'vue'

let nextId = 0

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])

  function add(message, type = 'error', duration = 4000) {
    const id = nextId++
    toasts.value.push({ id, message, type, visible: true })

    setTimeout(() => dismiss(id), duration)
    return id
  }

  function dismiss(id) {
    const toast = toasts.value.find((t) => t.id === id)
    if (toast) toast.visible = false
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, 300)
  }

  function success(message, duration) {
    return add(message, 'success', duration)
  }

  function error(message, duration) {
    return add(message, 'error', duration)
  }

  function info(message, duration) {
    return add(message, 'info', duration)
  }

  return { toasts, add, dismiss, success, error, info }
})
