<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>Loading project...</span>
      </div>

      <template v-else-if="project">
        <div class="page-header">
          <router-link to="/projects" class="back-link">&larr; Back to Projects</router-link>
          <div class="header-row">
            <div>
              <h1>{{ project.name }}</h1>
              <p v-if="project.description" class="project-description">{{ project.description }}</p>
              <p v-else class="project-description muted">No description</p>
            </div>
            <router-link :to="`/projects/${project.id}/edit`" class="btn-secondary">
              &#9998; Edit
            </router-link>
          </div>
          <div class="project-meta">
            <span>Created {{ formatDate(project.created_at) }}</span>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-row">
          <div class="mini-stat">
            <span class="mini-stat-value">{{ tasks.length }}</span>
            <span class="mini-stat-label">Tasks</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-value">{{ shifts.length }}</span>
            <span class="mini-stat-label">Shifts</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-value">{{ totalTime }}</span>
            <span class="mini-stat-label">Total Time</span>
          </div>
        </div>

        <!-- Tasks Section -->
        <section class="section">
          <div class="section-header">
            <h2>Tasks</h2>
            <router-link to="/tasks/create" class="btn-sm">+ Add Task</router-link>
          </div>

          <div v-if="loadingTasks" class="section-loading">
            <span class="spinner-sm"></span> Loading tasks...
          </div>

          <div v-else-if="tasks.length === 0" class="section-empty">
            No tasks for this project yet.
          </div>

          <div v-else class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th class="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in tasks" :key="task.id">
                  <td class="td-title">{{ task.title }}</td>
                  <td>
                    <span class="status-badge" :class="'status-' + task.status">
                      {{ task.status }}
                    </span>
                  </td>
                  <td class="td-date">{{ formatDate(task.created_at) }}</td>
                  <td class="td-actions">
                    <router-link :to="`/tasks/${task.id}/edit`" class="btn-icon" title="Edit">
                      &#9998;
                    </router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Shifts Section -->
        <section class="section">
          <div class="section-header">
            <h2>Shifts</h2>
            <router-link to="/shifts/create" class="btn-sm">+ Log Shift</router-link>
          </div>

          <div v-if="loadingShifts" class="section-loading">
            <span class="spinner-sm"></span> Loading shifts...
          </div>

          <div v-else-if="shifts.length === 0" class="section-empty">
            No shifts logged for this project yet.
          </div>

          <div v-else class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Start</th>
                  <th>End</th>
                  <th>Duration</th>
                  <th class="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="shift in shifts" :key="shift.id">
                  <td class="td-datetime">{{ formatDateTime(shift.start_time) }}</td>
                  <td class="td-datetime">{{ formatDateTime(shift.end_time) }}</td>
                  <td>
                    <span class="duration-badge">{{ formatDuration(shift.start_time, shift.end_time) }}</span>
                  </td>
                  <td class="td-actions">
                    <router-link :to="`/shifts/${shift.id}/edit`" class="btn-icon" title="Edit">
                      &#9998;
                    </router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <div v-else class="empty-state">
        <h3>Project not found</h3>
        <p>The project you're looking for doesn't exist or has been deleted.</p>
        <router-link to="/projects" class="btn-primary">Back to Projects</router-link>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import projectsService from '@/services/projects'
import { useToastStore } from '@/stores/toast'

export default {
  name: 'ProjectShowView',
  components: { NavBar },
  setup() {
    const route = useRoute()
    const toast = useToastStore()

    const project = ref(null)
    const tasks = ref([])
    const shifts = ref([])
    const loading = ref(true)
    const loadingTasks = ref(true)
    const loadingShifts = ref(true)

    const totalTime = computed(() => {
      if (shifts.value.length === 0) return '0h'
      const totalMs = shifts.value.reduce((sum, s) => {
        return sum + (new Date(s.end_time) - new Date(s.start_time))
      }, 0)
      const totalMinutes = Math.floor(totalMs / 60000)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
      if (hours > 0) return `${hours}h`
      return `${minutes}m`
    })

    async function loadProject() {
      try {
        const { data } = await projectsService.get(route.params.id)
        project.value = data
      } catch {
        toast.error('Project not found.')
      } finally {
        loading.value = false
      }
    }

    async function loadTasks() {
      try {
        const { data } = await projectsService.listTasks(route.params.id)
        tasks.value = data
      } catch {
        toast.error('Failed to load tasks.')
      } finally {
        loadingTasks.value = false
      }
    }

    async function loadShifts() {
      try {
        const { data } = await projectsService.listShifts(route.params.id)
        shifts.value = data
      } catch {
        toast.error('Failed to load shifts.')
      } finally {
        loadingShifts.value = false
      }
    }

    function formatDate(dateStr) {
      if (!dateStr) return '--'
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
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

    function formatDuration(startStr, endStr) {
      if (!startStr || !endStr) return '--'
      const ms = new Date(endStr) - new Date(startStr)
      const totalMinutes = Math.floor(ms / 60000)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      if (hours > 0) return `${hours}h ${minutes}m`
      return `${minutes}m`
    }

    onMounted(() => {
      loadProject()
      loadTasks()
      loadShifts()
    })

    return {
      project,
      tasks,
      shifts,
      loading,
      loadingTasks,
      loadingShifts,
      totalTime,
      formatDate,
      formatDateTime,
      formatDuration,
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

/* Header */
.page-header {
  margin-bottom: 1.5rem;
}

.back-link {
  display: inline-block;
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.88rem;
  margin-bottom: 0.75rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: #e2e8f0;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.page-header h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.35rem;
}

.project-description {
  color: #cbd5e1;
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.project-description.muted {
  color: #64748b;
  font-style: italic;
}

.project-meta {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: #64748b;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-secondary:hover {
  background: #334155;
  border-color: #64748b;
  color: #f1f5f9;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.mini-stat {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.mini-stat-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f1f5f9;
}

.mini-stat-label {
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Sections */
.section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.section-header h2 {
  font-size: 1.15rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.btn-sm {
  padding: 0.4rem 0.85rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s;
}

.btn-sm:hover {
  background: #2563eb;
}

.section-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  color: #94a3b8;
  font-size: 0.9rem;
}

.section-empty {
  padding: 2rem;
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
}

/* Table */
.table-wrapper {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
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

.data-table td {
  padding: 0.85rem 1rem;
  font-size: 0.9rem;
  color: #e2e8f0;
  border-bottom: 1px solid #334155;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background: rgba(59, 130, 246, 0.04);
}

.td-title {
  font-weight: 500;
  color: #f1f5f9;
}

.td-date {
  color: #94a3b8;
  font-size: 0.85rem;
}

.td-datetime {
  font-size: 0.85rem;
  color: #cbd5e1;
}

.td-actions {
  text-align: right;
  white-space: nowrap;
}

/* Status badge */
.status-badge {
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-pending {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

.status-in_progress,
.status-in-progress {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.status-completed,
.status-done {
  color: #34d399;
  background: rgba(52, 211, 153, 0.1);
}

.status-cancelled {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
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
}

.btn-icon:hover {
  background: #334155;
  color: #f1f5f9;
}

/* Loading & empty */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 0;
  color: #94a3b8;
  font-size: 0.95rem;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #334155;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.spinner-sm {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-top-color: #94a3b8;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
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

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
