import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { registerSW } from 'virtual:pwa-register'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('A new version of TimeBudget is available. Reload to update?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.info('[PWA] App ready to work offline')
  },
})
