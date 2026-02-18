<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        Loading reminder...
      </div>

      <template v-else-if="form">
        <div class="form-header">
          <router-link to="/reminders" class="back-link">&larr; Back to Reminders</router-link>
          <h1>Edit Reminder</h1>
          <p>Update the reminder details below.</p>
        </div>

        <form class="reminder-form" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="title">Title</label>
            <input
              id="title"
              v-model="form.title"
              type="text"
              placeholder="e.g. Submit timesheet"
              required
              :disabled="reminderStore.saving"
            />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="form.description"
              placeholder="Optional notes for this reminder"
              rows="3"
              :disabled="reminderStore.saving"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="trigger_at">Trigger At</label>
            <input
              id="trigger_at"
              v-model="form.trigger_at"
              type="datetime-local"
              required
              :disabled="reminderStore.saving"
            />
          </div>

          <div class="form-actions">
            <router-link to="/reminders" class="btn-secondary">Cancel</router-link>
            <button type="submit" class="btn-primary" :disabled="reminderStore.saving">
              <span v-if="reminderStore.saving" class="spinner"></span>
              {{ reminderStore.saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </template>

      <div v-else class="empty-state">
        <h3>Reminder not found</h3>
        <p>The reminder you're looking for doesn't exist or has been deleted.</p>
        <router-link to="/reminders" class="btn-primary">Back to Reminders</router-link>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReminderStore } from '@/stores/reminders'
import NavBar from '@/components/NavBar.vue'

export default {
  name: 'ReminderEditView',
  components: { NavBar },
  setup() {
    const reminderStore = useReminderStore()
    const route = useRoute()
    const router = useRouter()

    const loading = ref(true)
    const form = ref(null)

    function toDateTimeLocal(isoStr) {
      if (!isoStr) return ''
      const d = new Date(isoStr)
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    onMounted(async () => {
      const reminder = await reminderStore.getReminder(Number(route.params.id))
      if (reminder) {
        form.value = reactive({
          title: reminder.title,
          description: reminder.description || '',
          trigger_at: toDateTimeLocal(reminder.trigger_at),
        })
      }
      loading.value = false
    })

    async function handleSubmit() {
      const triggerAt = form.value.trigger_at
        ? new Date(form.value.trigger_at).toISOString()
        : null
      const payload = {
        title: form.value.title,
        description: form.value.description || null,
        trigger_at: triggerAt,
      }
      const updated = await reminderStore.updateReminder(Number(route.params.id), payload)
      if (updated) {
        router.push('/reminders')
      }
    }

    return { reminderStore, loading, form, handleSubmit }
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #0f172a;
}

.page-content {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

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

.form-header {
  margin-bottom: 2rem;
}

.back-link {
  font-size: 0.85rem;
  color: #3b82f6;
  text-decoration: none;
  display: inline-block;
  margin-bottom: 1rem;
}

.back-link:hover {
  text-decoration: underline;
}

.form-header h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.25rem;
}

.form-header p {
  color: #94a3b8;
  margin: 0;
}

.reminder-form {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #cbd5e1;
}

.form-group input,
.form-group textarea {
  padding: 0.7rem 0.9rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #f1f5f9;
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: #475569;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-group input[type="datetime-local"] {
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.btn-primary {
  padding: 0.65rem 1.3rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.65rem 1.3rem;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
}

.btn-secondary:hover {
  background: #334155;
  color: #f1f5f9;
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

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
