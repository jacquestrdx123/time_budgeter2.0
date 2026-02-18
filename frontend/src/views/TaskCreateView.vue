<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="form-header">
        <router-link to="/tasks" class="back-link">&larr; Back to Tasks</router-link>
        <h1>Create Task</h1>
        <p>Add a new task to a project.</p>
      </div>

      <form class="task-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="title">Title</label>
          <input
            id="title"
            v-model="form.title"
            type="text"
            placeholder="Enter task title"
            required
            :disabled="taskStore.saving"
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            v-model="form.description"
            placeholder="Enter task description (optional)"
            rows="3"
            :disabled="taskStore.saving"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="project">{{ settingsStore.projectDescription }}</label>
            <select
              id="project"
              v-model="form.project_id"
              required
              :disabled="taskStore.saving"
            >
              <option value="" disabled>Select a {{ settingsStore.projectDescription.toLowerCase() }}</option>
              <option
                v-for="project in taskStore.projects"
                :key="project.id"
                :value="project.id"
              >
                {{ project.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="status">Status</label>
            <select
              id="status"
              v-model="form.status"
              :disabled="taskStore.saving"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <router-link to="/tasks" class="btn-secondary">Cancel</router-link>
          <button type="submit" class="btn-primary" :disabled="taskStore.saving">
            <span v-if="taskStore.saving" class="spinner"></span>
            {{ taskStore.saving ? 'Creating...' : 'Create Task' }}
          </button>
        </div>
      </form>
    </main>
  </div>
</template>

<script>
import { reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/tasks'
import { useSettingsStore } from '@/stores/settings'
import NavBar from '@/components/NavBar.vue'

export default {
  name: 'TaskCreateView',
  components: { NavBar },
  setup() {
    const taskStore = useTaskStore()
    const settingsStore = useSettingsStore()
    const router = useRouter()

    const form = reactive({
      title: '',
      description: '',
      project_id: '',
      status: 'pending',
    })

    onMounted(() => {
      taskStore.fetchProjects()
    })

    async function handleSubmit() {
      const payload = {
        title: form.title,
        description: form.description || null,
        status: form.status,
        project_id: Number(form.project_id),
      }
      const task = await taskStore.createTask(payload)
      if (task) {
        router.push('/tasks')
      }
    }

    return { taskStore, settingsStore, form, handleSubmit }
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

.task-form {
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
.form-group textarea,
.form-group select {
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
.form-group textarea:focus,
.form-group select:focus {
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

.form-group select {
  cursor: pointer;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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
