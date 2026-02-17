import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { notificationService } from '@/services/notifications'

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref([])
  const unreadCount = ref(0)
  const preferences = ref(null)
  const loading = ref(false)
  const pollIntervalId = ref(null)

  const hasUnread = computed(() => unreadCount.value > 0)

  async function fetchNotifications(unreadOnly = false) {
    loading.value = true
    try {
      notifications.value = await notificationService.list(unreadOnly)
    } catch (err) {
      console.error('[Notifications] fetch failed:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchUnreadCount() {
    try {
      unreadCount.value = await notificationService.unreadCount()
    } catch (err) {
      console.error('[Notifications] unread count failed:', err)
    }
  }

  async function markRead(id) {
    try {
      await notificationService.markRead(id)
      const n = notifications.value.find((n) => n.id === id)
      if (n) n.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch (err) {
      console.error('[Notifications] markRead failed:', err)
    }
  }

  async function markAllRead() {
    try {
      await notificationService.markAllRead()
      notifications.value.forEach((n) => (n.is_read = true))
      unreadCount.value = 0
    } catch (err) {
      console.error('[Notifications] markAllRead failed:', err)
    }
  }

  async function remove(id) {
    try {
      await notificationService.remove(id)
      const idx = notifications.value.findIndex((n) => n.id === id)
      if (idx !== -1) {
        if (!notifications.value[idx].is_read) {
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
        notifications.value.splice(idx, 1)
      }
    } catch (err) {
      console.error('[Notifications] remove failed:', err)
    }
  }

  async function fetchPreferences() {
    try {
      preferences.value = await notificationService.getPreferences()
    } catch (err) {
      console.error('[Notifications] fetchPreferences failed:', err)
    }
  }

  async function updatePreferences(prefs) {
    try {
      preferences.value = await notificationService.updatePreferences(prefs)
    } catch (err) {
      console.error('[Notifications] updatePreferences failed:', err)
    }
  }

  /** Start polling unread count every 30 seconds. */
  function startPolling() {
    if (pollIntervalId.value) return
    fetchUnreadCount()
    pollIntervalId.value = setInterval(fetchUnreadCount, 30_000)
  }

  /** Stop the polling timer. */
  function stopPolling() {
    if (pollIntervalId.value) {
      clearInterval(pollIntervalId.value)
      pollIntervalId.value = null
    }
  }

  /** Handle an incoming foreground push message and bump the counter. */
  function handleIncomingPush(payload) {
    const n = {
      id: Date.now(),
      title: payload.notification?.title || 'New notification',
      body: payload.notification?.body || '',
      notification_type: payload.data?.notification_type || 'general',
      is_read: false,
      created_at: new Date().toISOString(),
      ...payload.data,
    }
    notifications.value.unshift(n)
    unreadCount.value += 1
  }

  return {
    notifications,
    unreadCount,
    preferences,
    loading,
    hasUnread,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
    remove,
    fetchPreferences,
    updatePreferences,
    startPolling,
    stopPolling,
    handleIncomingPush,
  }
})
