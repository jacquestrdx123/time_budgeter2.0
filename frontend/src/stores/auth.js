import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth'
import { useToastStore } from '@/stores/toast'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref(localStorage.getItem('access_token') || null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userName = computed(() => user.value?.name || '')
  const isAdmin = computed(() => user.value?.role === 'admin')

  function setSession(tokenValue, userData) {
    token.value = tokenValue
    user.value = userData
    localStorage.setItem('access_token', tokenValue)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  function clearSession() {
    token.value = null
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  }

  async function register(name, email, password) {
    const toast = useToastStore()
    loading.value = true
    try {
      const data = await authService.register(name, email, password)
      setSession(data.access_token, data.user)
      toast.success(`Welcome, ${data.user.name}!`)
      return true
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed'
      toast.error(msg)
      return false
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    const toast = useToastStore()
    loading.value = true
    try {
      const data = await authService.login(email, password)
      setSession(data.access_token, data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      return true
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed'
      toast.error(msg)
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    if (!token.value) return false
    try {
      const data = await authService.getMe()
      user.value = data
      localStorage.setItem('user', JSON.stringify(data))
      return true
    } catch {
      clearSession()
      return false
    }
  }

  function logout() {
    const toast = useToastStore()
    clearSession()
    toast.info('You have been signed out')
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    userName,
    isAdmin,
    register,
    login,
    logout,
    fetchUser,
  }
})
