import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

// Take control of all clients as soon as the SW is activated
self.skipWaiting()
clientsClaim()

// Precache all assets built by Vite (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST)

// ---------------------------------------------------------------------------
// Firebase Cloud Messaging — background push notifications
// ---------------------------------------------------------------------------
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            'AIzaSyBaqVF6e-_aaQQ7DKf3hXBcDrwU4b7QtBI',
  authDomain:        'shiftmanager-a87ed.firebaseapp.com',
  projectId:         'shiftmanager-a87ed',
  storageBucket:     'shiftmanager-a87ed.firebasestorage.app',
  messagingSenderId: '110551756298',
  appId:             '1:110551756298:web:2afe0f41a3dcd11a43f9f3',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  const notificationTitle = title || 'TimeBudget'
  const notificationOptions = {
    body: body || 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: {
      ...(payload.data || {}),
      url: payload.data?.url || '/notifications',
    },
    tag: payload.data?.shift_id ? `shift-${payload.data.shift_id}` : undefined,
    vibrate: [200, 100, 200, 100, 300],
    sound: '/notification-sound.mp3',
    requireInteraction: true,
  }
  self.registration.showNotification(notificationTitle, notificationOptions)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetPath = event.notification.data?.url || '/notifications'
  const targetUrl = new URL(targetPath, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return clients.openWindow(targetUrl)
    })
  )
})
