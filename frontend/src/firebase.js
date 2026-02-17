/**
 * Firebase configuration and Messaging initialisation.
 *
 * Set the VITE_FIREBASE_* env vars in .env (or .env.local) to enable push
 * notifications via Firebase Cloud Messaging.  When the vars are absent the
 * module silently exports nulls so the rest of the app keeps working.
 */

import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const isConfigured = Object.values(firebaseConfig).every(Boolean)

let app = null
let messaging = null

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig)
    messaging = getMessaging(app)
  } catch (err) {
    console.warn('[Firebase] Init failed:', err)
  }
}

export { app, messaging, getToken, onMessage, isConfigured }
