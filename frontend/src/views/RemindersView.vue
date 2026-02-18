<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="page-header">
        <div>
          <h1>Reminders</h1>
          <p>Manage your scheduled reminders.</p>
        </div>
        <router-link to="/reminders/create" class="btn-primary">+ New Reminder</router-link>
      </div>

      <div v-if="reminderStore.loading" class="loading-state">
        <span class="spinner"></span>
        Loading reminders...
      </div>

      <div v-else-if="reminderStore.reminders.length === 0" class="empty-state">
        <div class="empty-icon">&#9201;</div>
        <h3>No reminders yet</h3>
        <p>Create your first reminder to get notified at a specific time.</p>
        <router-link to="/reminders/create" class="btn-primary">+ New Reminder</router-link>
      </div>

      <div v-else class="reminder-table-wrapper">
        <table class="reminder-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Trigger At</th>
              <th>Status</th>
              <th class="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="reminder in reminderStore.reminders" :key="reminder.id">
              <td class="td-title">{{ reminder.title }}</td>
              <td class="td-date">{{ formatDateTime(reminder.trigger_at) }}</td>
              <td>
                <span class="status-badge" :class="reminder.sent ? 'status-sent' : 'status-pending'">
                  {{ reminder.sent ? 'Sent' : 'Pending' }}
                </span>
              </td>
              <td class="td-actions">
                <router-link
                  v-if="!reminder.sent"
                  :to="`/reminders/${reminder.id}/edit`"
                  class="btn-icon"
                  title="Edit"
                >
                  &#9998;
                </router-link>
                <button
                  class="btn-icon btn-danger"
                  title="Delete"
                  @click="confirmDelete(reminder)"
                >
                  &#128465;
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-card">
        <h3>Delete Reminder</h3>
        <p>
          Are you sure you want to delete
          <strong>{{ deleteTarget?.title }}</strong>? This action cannot be undone.
        </p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showDeleteModal = false">Cancel</button>
          <button class="btn-danger-solid" @click="handleDelete">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useReminderStore } from '@/stores/reminders'
import NavBar from '@/components/NavBar.vue'

export default {
  name: 'RemindersView',
  components: { NavBar },
  setup() {
    const reminderStore = useReminderStore()
    const showDeleteModal = ref(false)
    const deleteTarget = ref(null)

    onMounted(() => {
      reminderStore.fetchReminders()
    })

    function formatDateTime(dateStr) {
      if (!dateStr) return '--'
      const d = new Date(dateStr)
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    function confirmDelete(reminder) {
      deleteTarget.value = reminder
      showDeleteModal.value = true
    }

    async function handleDelete() {
      if (!deleteTarget.value) return
      await reminderStore.deleteReminder(deleteTarget.value.id)
      showDeleteModal.value = false
      deleteTarget.value = null
    }

    return {
      reminderStore,
      showDeleteModal,
      deleteTarget,
      formatDateTime,
      confirmDelete,
      handleDelete,
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
.reminder-table-wrapper {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  overflow: hidden;
}

.reminder-table {
  width: 100%;
  border-collapse: collapse;
}

.reminder-table th {
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

.reminder-table td {
  padding: 0.85rem 1rem;
  font-size: 0.9rem;
  color: #e2e8f0;
  border-bottom: 1px solid #334155;
}

.reminder-table tbody tr:last-child td {
  border-bottom: none;
}

.reminder-table tbody tr:hover {
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
}

.status-pending {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

.status-sent {
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
