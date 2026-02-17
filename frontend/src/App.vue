<template>
  <router-view />
  <ToastContainer />
</template>

<script>
import { onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useNotificationStore } from '@/stores/notifications'
import { usePushNotifications } from '@/composables/usePushNotifications'
import ToastContainer from '@/components/ToastContainer.vue'

export default {
  name: 'App',
  components: { ToastContainer },
  setup() {
    const auth = useAuthStore()
    const settingsStore = useSettingsStore()
    const notifStore = useNotificationStore()
    const { initPush } = usePushNotifications()

    function startNotifications() {
      notifStore.startPolling()
      initPush()
    }

    onMounted(async () => {
      if (auth.token) {
        await auth.fetchUser()
        settingsStore.fetchSettings()
        startNotifications()
      }
    })

    watch(
      () => auth.isAuthenticated,
      (loggedIn) => {
        if (loggedIn) {
          startNotifications()
        } else {
          notifStore.stopPolling()
        }
      }
    )

    onUnmounted(() => {
      notifStore.stopPolling()
    })
  },
}
</script>

<style>
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #0f172a;
  color: #e2e8f0;
}
</style>
