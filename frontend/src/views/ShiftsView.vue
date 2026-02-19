<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="page-header">
        <div>
          <h1>Shifts</h1>
          <p>Track your working shifts across {{ settingsStore.projectDescriptionPlural.toLowerCase() }}.</p>
        </div>
        <router-link to="/shifts/create" class="btn-primary">+ New Shift</router-link>
      </div>

      <!-- Clock In / Out Card -->
      <div class="clock-card" :class="{ 'clock-card--active': shiftStore.isClockedIn }">
        <div v-if="shiftStore.isClockedIn" class="clock-active">
          <div class="clock-status">
            <span class="clock-pulse"></span>
            <span class="clock-label">Clocked In</span>
          </div>
          <div class="clock-details">
            <span class="clock-project">{{ projectName(shiftStore.activeShift?.project_id) }}</span>
            <span class="clock-separator">&#183;</span>
            <span class="clock-started">Started {{ formatDateTime(shiftStore.activeShift?.start_time) }}</span>
          </div>
          <div class="clock-elapsed">{{ elapsedTime }}</div>
          <button
            class="btn-clock btn-clock-out"
            :disabled="shiftStore.clockLoading"
            @click="handleClockOut"
          >
            <span v-if="shiftStore.clockLoading" class="spinner spinner-sm"></span>
            Clock Out
          </button>
        </div>
        <div v-else class="clock-idle">
          <div class="clock-idle-row">
            <div class="clock-idle-info">
              <span class="clock-idle-icon">&#9201;</span>
              <div>
                <div class="clock-idle-title">Ready to start?</div>
                <div class="clock-idle-sub">Select a {{ settingsStore.projectDescription.toLowerCase() }} and clock in to begin tracking.</div>
              </div>
            </div>
            <div class="clock-idle-actions">
              <select v-model="clockInProjectId" class="clock-select">
                <option value="" disabled>Select {{ settingsStore.projectDescription.toLowerCase() }}...</option>
                <option v-for="p in shiftStore.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <button
                class="btn-clock btn-clock-in"
                :disabled="!clockInProjectId || shiftStore.clockLoading"
                @click="handleClockIn"
              >
                <span v-if="shiftStore.clockLoading" class="spinner spinner-sm"></span>
                Clock In
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="shiftStore.loading" class="loading-state">
        <span class="spinner"></span>
        Loading clock sessions...
      </div>

      <div v-else-if="shiftStore.clockSessions.length === 0" class="empty-state">
        <div class="empty-icon">&#9201;</div>
        <h3>No clock sessions yet</h3>
        <p>Clock in to start tracking time.</p>
        <router-link to="/shifts/create" class="btn-primary">+ New Shift</router-link>
      </div>

      <div v-else class="shift-table-wrapper">
        <table class="shift-table">
          <thead>
            <tr>
              <th>{{ settingsStore.projectDescription }}</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Planned</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in shiftStore.clockSessions" :key="session.id" :class="{ 'row-active': !session.end_time }">
              <td>
                <router-link v-if="session.project_id" :to="`/projects/${session.project_id}`" class="project-link">
                  {{ projectName(session.project_id) }}
                </router-link>
                <span v-else class="text-muted">—</span>
              </td>
              <td class="td-datetime">{{ formatDateTime(session.start_time) }}</td>
              <td class="td-datetime">
                <span v-if="session.end_time">{{ formatDateTime(session.end_time) }}</span>
                <span v-else class="in-progress-badge">In Progress</span>
              </td>
              <td>
                <span v-if="session.end_time" class="duration-badge">{{ formatDuration(session.start_time, session.end_time) }}</span>
                <span v-else class="duration-badge duration-badge--live">{{ formatLiveDuration(session.start_time) }}</span>
              </td>
              <td>
                <router-link v-if="session.shift_id" :to="`/shifts/${session.shift_id}/edit`" class="project-link">Shift #{{ session.shift_id }}</router-link>
                <span v-else class="text-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useShiftStore } from '@/stores/shifts'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import NavBar from '@/components/NavBar.vue'

export default {
  name: 'ShiftsView',
  components: { NavBar },
  setup() {
    const shiftStore = useShiftStore()
    const authStore = useAuthStore()
    const settingsStore = useSettingsStore()
    const clockInProjectId = ref('')
    const now = ref(new Date())
    let ticker = null

    onMounted(async () => {
      await Promise.all([
        shiftStore.fetchClockSessions(),
        shiftStore.fetchProjects(),
        authStore.user?.id ? shiftStore.fetchActiveShift(authStore.user.id) : Promise.resolve(),
      ])
      ticker = setInterval(() => {
        now.value = new Date()
      }, 1000)
    })

    onUnmounted(() => {
      if (ticker) clearInterval(ticker)
    })

    function projectName(projectId) {
      const project = shiftStore.projects.find((p) => p.id === projectId)
      return project ? project.name : `#${projectId}`
    }

    function formatDateTime(dateStr) {
      if (!dateStr) return '--'
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    function formatDate(dateStr) {
      if (!dateStr) return '--'
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }

    function formatDuration(startStr, endStr) {
      if (!startStr || !endStr) return '--'
      const ms = new Date(endStr) - new Date(startStr)
      return formatMs(ms)
    }

    function formatLiveDuration(startStr) {
      if (!startStr) return '--'
      const ms = now.value - new Date(startStr)
      return formatMs(ms)
    }

    function formatMs(ms) {
      if (ms < 0) return '0m'
      const totalSeconds = Math.floor(ms / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
      if (minutes > 0) return `${minutes}m ${seconds}s`
      return `${seconds}s`
    }

    const elapsedTime = computed(() => {
      if (!shiftStore.activeShift?.start_time) return '0s'
      const ms = now.value - new Date(shiftStore.activeShift.start_time)
      return formatMs(ms)
    })

    async function handleClockIn() {
      if (!clockInProjectId.value || !authStore.user?.id) return
      await shiftStore.clockIn(authStore.user.id, clockInProjectId.value)
      clockInProjectId.value = ''
    }

    async function handleClockOut() {
      if (!authStore.user?.id) return
      await shiftStore.clockOut(authStore.user.id)
    }

    return {
      shiftStore,
      settingsStore,
      clockInProjectId,
      elapsedTime,
      now,
      projectName,
      formatDateTime,
      formatDate,
      formatDuration,
      formatLiveDuration,
      handleClockIn,
      handleClockOut,
    }
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #0f172a;
}

.page-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.25rem;
}

.page-header p {
  color: #94a3b8;
  margin: 0;
}

.btn-primary {
  padding: 0.6rem 1.2rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-primary:hover {
  background: #2563eb;
}

/* Clock In/Out Card */
.clock-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
  transition: all 0.3s;
}

.clock-card--active {
  border-color: rgba(52, 211, 153, 0.4);
  background: linear-gradient(135deg, #1e293b 0%, rgba(52, 211, 153, 0.05) 100%);
}

.clock-active {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.clock-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.clock-pulse {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #34d399;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); }
  50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(52, 211, 153, 0); }
}

.clock-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #34d399;
}

.clock-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.clock-project {
  font-size: 0.95rem;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clock-separator {
  color: #475569;
  font-size: 1.2rem;
}

.clock-started {
  font-size: 0.82rem;
  color: #94a3b8;
  white-space: nowrap;
}

.clock-elapsed {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f1f5f9;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  min-width: 110px;
  text-align: right;
}

.btn-clock {
  padding: 0.6rem 1.4rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.btn-clock:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-clock-in {
  background: #34d399;
  color: #064e3b;
}

.btn-clock-in:hover:not(:disabled) {
  background: #2dd4a8;
}

.btn-clock-out {
  background: #ef4444;
  color: white;
}

.btn-clock-out:hover:not(:disabled) {
  background: #dc2626;
}

.clock-idle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.clock-idle-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.clock-idle-icon {
  font-size: 1.5rem;
}

.clock-idle-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #f1f5f9;
}

.clock-idle-sub {
  font-size: 0.82rem;
  color: #94a3b8;
  margin-top: 0.15rem;
}

.clock-idle-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.clock-select {
  padding: 0.55rem 0.85rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.88rem;
  min-width: 170px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.clock-select:focus {
  outline: none;
  border-color: #3b82f6;
}

/* Active shift row highlight */
.row-active {
  background: rgba(52, 211, 153, 0.04);
}

.row-active:hover {
  background: rgba(52, 211, 153, 0.07) !important;
}

.in-progress-badge {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #34d399;
  background: rgba(52, 211, 153, 0.12);
  letter-spacing: 0.02em;
}

.duration-badge--live {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
  font-variant-numeric: tabular-nums;
}

/* Loading & Empty */
.loading-state {
  text-align: center;
  padding: 4rem 1rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 0.95rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #f1f5f9;
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
}

.empty-state p {
  color: #94a3b8;
  margin: 0 0 1.5rem;
}

/* Table */
.shift-table-wrapper {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  overflow: hidden;
}

.shift-table {
  width: 100%;
  border-collapse: collapse;
}

.shift-table th {
  text-align: left;
  padding: 0.85rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.th-actions {
  text-align: right;
}

.shift-table td {
  padding: 0.85rem 1rem;
  font-size: 0.9rem;
  color: #e2e8f0;
  border-bottom: 1px solid #334155;
}

.shift-table tbody tr:last-child td {
  border-bottom: none;
}

.shift-table tbody tr:hover {
  background: rgba(59, 130, 246, 0.04);
}

.project-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.project-link:hover {
  text-decoration: underline;
  color: #60a5fa;
}

.td-datetime {
  font-size: 0.85rem;
  color: #cbd5e1;
}

.td-date {
  color: #94a3b8;
  font-size: 0.85rem;
}

.text-muted {
  color: #64748b;
  font-size: 0.9rem;
}

.td-actions {
  text-align: right;
  white-space: nowrap;
}

/* Break row & badge */
.row-break {
  background: rgba(245, 158, 11, 0.03);
}

.row-break:hover {
  background: rgba(245, 158, 11, 0.06) !important;
}

.break-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.7rem;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
}

.break-icon {
  font-size: 0.9rem;
}

/* Duration badge */
.duration-badge {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 500;
  color: #34d399;
  background: rgba(52, 211, 153, 0.1);
}

/* Action buttons */
.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #cbd5e1;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  margin-left: 0.35rem;
}

.btn-icon:hover {
  background: #334155;
  color: #f1f5f9;
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 420px;
}

.modal-card h3 {
  color: #f1f5f9;
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
}

.modal-card p {
  color: #94a3b8;
  margin: 0 0 1.5rem;
  font-size: 0.9rem;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-secondary {
  padding: 0.55rem 1rem;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #334155;
  color: #f1f5f9;
}

.btn-danger-solid {
  padding: 0.55rem 1rem;
  background: #ef4444;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-danger-solid:hover {
  background: #dc2626;
}

/* Spinner */
.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-top-color: #94a3b8;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.spinner-sm {
  width: 14px;
  height: 14px;
  border-width: 2px;
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .clock-idle-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .clock-idle-actions {
    width: 100%;
  }

  .clock-select {
    flex: 1;
    min-width: 0;
  }

  .clock-active {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .clock-elapsed {
    text-align: left;
    min-width: auto;
  }
}
</style>
