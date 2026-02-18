<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        Loading shift...
      </div>

      <template v-else-if="form">
        <div class="form-header">
          <router-link to="/shifts" class="back-link">&larr; Back to Shifts</router-link>
          <h1>Edit Shift</h1>
          <p>Update the shift details below.</p>
        </div>

        <form class="shift-form" @submit.prevent="handleSubmit">
          <div class="break-toggle-group">
            <label class="toggle-label">
              <input
                type="checkbox"
                v-model="form.is_break"
                class="toggle-checkbox"
                :disabled="shiftStore.saving"
              />
              <span class="toggle-switch"></span>
              <span class="toggle-text">Work Break</span>
            </label>
            <span v-if="form.is_break" class="break-hint">Breaks are not tied to a project (e.g. Lunch, Tea Time)</span>
          </div>

          <div v-if="form.is_break" class="form-group">
            <label for="break_type">Break Type</label>
            <select
              id="break_type"
              v-model="form.break_type"
              :disabled="shiftStore.saving"
            >
              <option value="">Select a break type</option>
              <option value="Lunch">Lunch</option>
              <option value="Tea Break">Tea Break</option>
              <option value="Coffee Break">Coffee Break</option>
              <option value="Rest Break">Rest Break</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div v-if="!form.is_break" class="form-group">
            <label for="project">{{ settingsStore.projectDescription }}</label>
            <select
              id="project"
              v-model="form.project_id"
              required
              :disabled="shiftStore.saving"
            >
              <option value="" disabled>Select a {{ settingsStore.projectDescription.toLowerCase() }}</option>
              <option
                v-for="project in shiftStore.projects"
                :key="project.id"
                :value="project.id"
              >
                {{ project.name }}
              </option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="start_time">Start Time</label>
              <input
                id="start_time"
                v-model="form.start_time"
                type="datetime-local"
                required
                :disabled="shiftStore.saving"
              />
            </div>

            <div class="form-group">
              <label for="end_time">End Time</label>
              <input
                id="end_time"
                v-model="form.end_time"
                type="datetime-local"
                required
                :disabled="shiftStore.saving"
              />
            </div>
          </div>

          <div class="form-actions">
            <router-link to="/shifts" class="btn-secondary">Cancel</router-link>
            <button type="submit" class="btn-primary" :disabled="shiftStore.saving">
              <span v-if="shiftStore.saving" class="spinner"></span>
              {{ shiftStore.saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </template>

      <div v-else class="empty-state">
        <h3>Shift not found</h3>
        <p>The shift you're looking for doesn't exist or has been deleted.</p>
        <router-link to="/shifts" class="btn-primary">Back to Shifts</router-link>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShiftStore } from '@/stores/shifts'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import NavBar from '@/components/NavBar.vue'

export default {
  name: 'ShiftEditView',
  components: { NavBar },
  setup() {
    const shiftStore = useShiftStore()
    const auth = useAuthStore()
    const settingsStore = useSettingsStore()
    const route = useRoute()
    const router = useRouter()

    const loading = ref(true)
    const form = ref(null)

    function toLocalDatetime(isoStr) {
      if (!isoStr) return ''
      const d = new Date(isoStr)
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    onMounted(async () => {
      await shiftStore.fetchProjects()
      const shift = await shiftStore.getShift(Number(route.params.id))
      if (shift) {
        form.value = reactive({
          project_id: shift.project_id || '',
          start_time: toLocalDatetime(shift.start_time),
          end_time: toLocalDatetime(shift.end_time),
          is_break: shift.is_break === 1 || shift.is_break === true,
          break_type: shift.break_type || '',
        })
      }
      loading.value = false
    })

    async function handleSubmit() {
      const payload = {
        start_time: new Date(form.value.start_time).toISOString(),
        end_time: new Date(form.value.end_time).toISOString(),
        user_id: auth.user?.id,
        is_break: form.value.is_break,
      }
      if (form.value.is_break) {
        payload.break_type = form.value.break_type || null
        payload.project_id = null
      } else {
        payload.project_id = Number(form.value.project_id)
        payload.break_type = null
      }
      const updated = await shiftStore.updateShift(Number(route.params.id), payload)
      if (updated) {
        router.push('/shifts')
      }
    }

    return { shiftStore, settingsStore, loading, form, handleSubmit }
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

.shift-form {
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
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-group select {
  cursor: pointer;
}

/* Break toggle */
.break-toggle-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.toggle-checkbox {
  display: none;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  background: #334155;
  border-radius: 12px;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: #94a3b8;
  border-radius: 50%;
  transition: transform 0.2s, background 0.2s;
}

.toggle-checkbox:checked + .toggle-switch {
  background: #f59e0b;
}

.toggle-checkbox:checked + .toggle-switch::after {
  transform: translateX(20px);
  background: white;
}

.toggle-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e2e8f0;
}

.break-hint {
  font-size: 0.8rem;
  color: #f59e0b;
  padding-left: 3.25rem;
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
