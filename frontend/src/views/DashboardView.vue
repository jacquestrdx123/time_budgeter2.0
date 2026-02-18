<template>
  <div class="dashboard">
    <NavBar />
    <main class="dashboard-content">
      <div class="welcome-section">
        <h1>Welcome back, {{ auth.userName }}</h1>
        <p>Here's your TimeBudget dashboard.</p>
      </div>

      <div class="stats-grid">
        <router-link to="/shifts" class="stat-card stat-card-link">
          <div class="stat-icon">&#9201;</div>
          <div class="stat-info">
            <span class="stat-label">Shifts</span>
            <span class="stat-value">{{ shiftStore.shiftCount }}</span>
          </div>
        </router-link>
        <router-link to="/tasks" class="stat-card stat-card-link">
          <div class="stat-icon">&#9745;</div>
          <div class="stat-info">
            <span class="stat-label">Tasks</span>
            <span class="stat-value">{{ taskStore.taskCount }}</span>
          </div>
        </router-link>
        <router-link to="/personal-todos" class="stat-card stat-card-link">
          <div class="stat-icon">&#128221;</div>
          <div class="stat-info">
            <span class="stat-label">Personal TODO</span>
            <span class="stat-value">{{ personalTodoStore.todoCount }}</span>
          </div>
        </router-link>
        <router-link to="/reminders" class="stat-card stat-card-link">
          <div class="stat-icon">&#9200;</div>
          <div class="stat-info">
            <span class="stat-label">Reminders</span>
            <span class="stat-value">{{ reminderStore.upcomingCount }}</span>
          </div>
        </router-link>
        <router-link to="/projects" class="stat-card stat-card-link">
          <div class="stat-icon">&#128193;</div>
          <div class="stat-info">
            <span class="stat-label">{{ settingsStore.projectDescriptionPlural }}</span>
            <span class="stat-value">{{ projectCount }}</span>
          </div>
        </router-link>
      </div>

      <div class="session-info">
        <h3>Session Info</h3>
        <div class="session-details">
          <div class="detail-row">
            <span class="detail-label">User ID</span>
            <span class="detail-value">{{ auth.user?.id }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Email</span>
            <span class="detail-value">{{ auth.user?.email }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Session Status</span>
            <span class="detail-value session-active">Active</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Member Since</span>
            <span class="detail-value">{{ formatDate(auth.user?.created_at) }}</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useTaskStore } from '@/stores/tasks'
import { usePersonalTodoStore } from '@/stores/personalTodos'
import { useShiftStore } from '@/stores/shifts'
import { useReminderStore } from '@/stores/reminders'
import projectService from '@/services/projects'
import NavBar from '@/components/NavBar.vue'

export default {
  name: 'DashboardView',
  components: { NavBar },
  setup() {
    const auth = useAuthStore()
    const settingsStore = useSettingsStore()
    const taskStore = useTaskStore()
    const personalTodoStore = usePersonalTodoStore()
    const shiftStore = useShiftStore()
    const reminderStore = useReminderStore()
    const projectCount = ref(0)

    onMounted(async () => {
      await Promise.all([
        taskStore.fetchTasks(),
        personalTodoStore.fetchTodos(),
        shiftStore.fetchShifts(),
        reminderStore.fetchReminders(),
        projectService.list().then((res) => {
          projectCount.value = res.data.length
        }),
      ])
    })

    function formatDate(dateStr) {
      if (!dateStr) return '--'
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    return { auth, settingsStore, taskStore, personalTodoStore, shiftStore, reminderStore, projectCount, formatDate }
  },
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: #0f172a;
}

.dashboard-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.welcome-section {
  margin-bottom: 2rem;
}

.welcome-section h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.5rem;
}

.welcome-section p {
  color: #94a3b8;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-card-link {
  text-decoration: none;
  transition: border-color 0.2s, background 0.2s;
}

.stat-card-link:hover {
  border-color: #3b82f6;
  background: #1e293b;
}

.stat-icon {
  font-size: 1.75rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 10px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.8rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
}

.session-info {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 1.5rem;
}

.session-info h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 1rem;
}

.session-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #334155;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 0.85rem;
  color: #94a3b8;
}

.detail-value {
  font-size: 0.9rem;
  color: #e2e8f0;
  font-weight: 500;
}

.session-active {
  color: #34d399;
  background: rgba(52, 211, 153, 0.1);
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.8rem;
}
</style>
