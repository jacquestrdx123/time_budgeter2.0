<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="page-header">
        <div>
          <h1>Notification Preferences</h1>
          <p>Choose what you want to be notified about.</p>
        </div>
        <router-link to="/notifications" class="btn-secondary">&larr; Back</router-link>
      </div>

      <div v-if="!prefs" class="loading-state">
        <span class="spinner"></span>
        Loading preferences...
      </div>

      <div v-else class="prefs-grid">
        <!-- Channels -->
        <section class="prefs-section">
          <h2>Channels</h2>
          <p class="section-desc">Choose how you receive notifications.</p>

          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">Push notifications</span>
              <span class="pref-desc">Receive browser push notifications in real time.</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="prefs.push_enabled" @change="save" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">Email notifications</span>
              <span class="pref-desc">Get notified via email for important events.</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="prefs.email_enabled" @change="save" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </section>

        <!-- Types -->
        <section class="prefs-section">
          <h2>Notification Types</h2>
          <p class="section-desc">Toggle which events trigger a notification.</p>

          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">Shift reminders</span>
              <span class="pref-desc">Get reminded before your shift starts.</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="prefs.shift_reminder" @change="save" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">Custom reminders</span>
              <span class="pref-desc">Get notified for reminders you create.</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="prefs.custom_reminder" @change="save" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">Task assigned</span>
              <span class="pref-desc">When a new task is assigned to you.</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="prefs.task_assigned" @change="save" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">Task updated</span>
              <span class="pref-desc">When a task you're involved in is changed.</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="prefs.task_updated" @change="save" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="pref-row">
            <div class="pref-info">
              <span class="pref-label">{{ settingsStore.projectDescription }} updates</span>
              <span class="pref-desc">When a {{ settingsStore.projectDescription.toLowerCase() }} you belong to is modified.</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="prefs.project_updated" @change="save" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </section>

        <!-- Push Status -->
        <section class="prefs-section">
          <h2>Push Notification Status</h2>
          <p class="section-desc">Browser push notification permission and devices.</p>

          <div class="status-row">
            <span class="status-label">Browser permission:</span>
            <span class="status-value" :class="permClass">{{ permissionStatus }}</span>
          </div>

          <div class="status-row">
            <span class="status-label">Firebase configured:</span>
            <span class="status-value" :class="pushSupported ? 'status-ok' : 'status-off'">
              {{ pushSupported ? 'Yes' : 'No' }}
            </span>
          </div>

          <button
            v-if="!permissionGranted && pushSupported"
            class="btn-primary"
            @click="requestPush"
          >
            Enable Push Notifications
          </button>
        </section>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { useNotificationStore } from '@/stores/notifications'
import { useSettingsStore } from '@/stores/settings'
import { usePushNotifications } from '@/composables/usePushNotifications'
import { useToastStore } from '@/stores/toast'

export default {
  name: 'NotificationPreferencesView',
  components: { NavBar },
  setup() {
    const notifStore = useNotificationStore()
    const settingsStore = useSettingsStore()
    const toast = useToastStore()
    const { permissionGranted, pushSupported, initPush } = usePushNotifications()
    const prefs = ref(null)

    onMounted(async () => {
      await notifStore.fetchPreferences()
      prefs.value = { ...notifStore.preferences }
    })

    async function save() {
      await notifStore.updatePreferences(prefs.value)
      toast.success('Preferences saved')
    }

    async function requestPush() {
      await initPush()
      if (permissionGranted.value) {
        toast.success('Push notifications enabled!')
      } else {
        toast.error('Permission denied. Please allow in browser settings.')
      }
    }

    const permissionStatus = computed(() => {
      if (typeof Notification === 'undefined') return 'Not supported'
      const p = Notification.permission
      if (p === 'granted') return 'Granted'
      if (p === 'denied') return 'Denied'
      return 'Not set'
    })

    const permClass = computed(() => {
      if (typeof Notification === 'undefined') return 'status-off'
      const p = Notification.permission
      if (p === 'granted') return 'status-ok'
      if (p === 'denied') return 'status-denied'
      return 'status-off'
    })

    return {
      prefs,
      settingsStore,
      save,
      requestPush,
      permissionGranted,
      pushSupported,
      permissionStatus,
      permClass,
    }
  },
}
</script>

<style scoped>
.page { min-height: 100vh; }

.page-content {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 0.25rem;
}

.page-header p {
  font-size: 0.9rem;
  color: #64748b;
}

.btn-secondary {
  padding: 0.45rem 0.9rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  color: rgba(203, 213, 225, 0.9);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.btn-primary {
  padding: 0.55rem 1.2rem;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 0.75rem;
}

.btn-primary:hover {
  background: #2563eb;
}

.loading-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(148, 163, 184, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Prefs grid */
.prefs-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.prefs-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  padding: 1.25rem 1.35rem;
}

.prefs-section h2 {
  font-size: 1rem;
  font-weight: 650;
  color: #f1f5f9;
  margin-bottom: 0.2rem;
}

.section-desc {
  font-size: 0.82rem;
  color: #64748b;
  margin-bottom: 1.1rem;
}

.pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.06);
}

.pref-row:last-child {
  border-bottom: none;
}

.pref-info { flex: 1; }

.pref-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 550;
  color: #e2e8f0;
  margin-bottom: 0.1rem;
}

.pref-desc {
  display: block;
  font-size: 0.8rem;
  color: #64748b;
}

/* Toggle switch */
.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  transition: 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: #94a3b8;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle input:checked + .toggle-slider {
  background: #3b82f6;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
  background: white;
}

/* Status rows */
.status-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.status-label {
  font-size: 0.88rem;
  color: #94a3b8;
}

.status-value {
  font-size: 0.84rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
}

.status-ok {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
}

.status-off {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.status-denied {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
}

@media (max-width: 768px) {
  .page-content { padding: 1.5rem 1rem; }
  .page-header { flex-direction: column; }
}
</style>
