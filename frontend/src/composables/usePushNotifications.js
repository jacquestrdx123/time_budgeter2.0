/**
 * Composable that wires up Firebase Cloud Messaging for push notifications.
 *
 * Uses the PWA service worker (registered by vite-plugin-pwa) which already
 * includes the Firebase messaging handler, so we don't register a separate SW.
 *
 * - Requests browser Notification permission
 * - Obtains an FCM token and registers it with the backend
 * - Listens for foreground messages and feeds them to the notification store
 *
 * When Firebase is not configured the composable is a harmless no-op.
 */

import { ref } from 'vue'
import { messaging, getToken, onMessage, isConfigured } from '@/firebase'
import { notificationService } from '@/services/notifications'
import { useNotificationStore } from '@/stores/notifications'
import { useToastStore } from '@/stores/toast'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

export function usePushNotifications() {
  const permissionGranted = ref(Notification.permission === 'granted')
  const pushSupported = ref(isConfigured && 'serviceWorker' in navigator && 'Notification' in window)
  const fcmToken = ref(null)

  /**
   * Request permission, get FCM token, register with backend, listen for
   * foreground messages.
   */
  async function initPush() {
    if (!pushSupported.value) {
      console.info('[Push] Not supported or Firebase not configured')
      return
    }

    const toast = useToastStore()
    const notifStore = useNotificationStore()

    try {
      const permission = await Notification.requestPermission()
      permissionGranted.value = permission === 'granted'

      if (!permissionGranted.value) {
        console.info('[Push] Permission denied')
        return
      }

      // Wait for the PWA service worker (which includes Firebase messaging)
      const registration = await navigator.serviceWorker.ready

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      })

      if (token) {
        fcmToken.value = token
        const browserName =
          navigator.userAgentData?.brands?.[0]?.brand || navigator.userAgent.slice(0, 40)
        await notificationService.registerDevice(token, browserName)
        console.info('[Push] FCM token registered')
      }

      onMessage(messaging, (payload) => {
        console.info('[Push] Foreground message:', payload)
        notifStore.handleIncomingPush(payload)
        toast.info(payload.notification?.title || 'New notification')

        try {
          const audio = new Audio('/notification-sound.mp3')
          audio.volume = 0.5
          audio.play().catch(() => {})
        } catch {}
      })
    } catch (err) {
      console.error('[Push] Init failed:', err)
    }
  }

  return {
    permissionGranted,
    pushSupported,
    fcmToken,
    initPush,
  }
}
