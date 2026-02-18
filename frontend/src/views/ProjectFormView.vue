<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="page-header">
        <router-link to="/projects" class="back-link">&larr; Back to {{ settingsStore.projectDescriptionPlural }}</router-link>
        <h1>{{ isEdit ? 'Edit ' + settingsStore.projectDescription : 'New ' + settingsStore.projectDescription }}</h1>
      </div>

      <div v-if="loadingProject" class="loading-state">
        <div class="spinner"></div>
        <span>Loading project...</span>
      </div>

      <form v-else class="project-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="name">{{ settingsStore.projectDescription }} Name</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="Enter project name"
            required
            :disabled="saving"
            autofocus
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            v-model="form.description"
            placeholder="Describe your project (optional)"
            rows="4"
            :disabled="saving"
          ></textarea>
        </div>

        <div class="form-actions">
          <router-link to="/projects" class="btn-secondary">Cancel</router-link>
          <button type="submit" class="btn-primary" :disabled="saving || !form.name.trim()">
            <span v-if="saving" class="spinner-sm"></span>
            {{ saving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create ' + settingsStore.projectDescription) }}
          </button>
        </div>
      </form>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import projectsService from '@/services/projects'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'

export default {
  name: 'ProjectFormView',
  components: { NavBar },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const toast = useToastStore()
    const settingsStore = useSettingsStore()

    const isEdit = computed(() => !!route.params.id)
    const loadingProject = ref(false)
    const saving = ref(false)

    const form = ref({
      name: '',
      description: '',
    })

    async function loadProject() {
      if (!isEdit.value) return
      loadingProject.value = true
      try {
        const { data } = await projectsService.get(route.params.id)
        form.value.name = data.name
        form.value.description = data.description || ''
      } catch {
        toast.error('Project not found.')
        router.push('/projects')
      } finally {
        loadingProject.value = false
      }
    }

    async function handleSubmit() {
      if (!form.value.name.trim()) return
      saving.value = true

      const payload = {
        name: form.value.name.trim(),
        description: form.value.description.trim() || null,
      }

      try {
        if (isEdit.value) {
          await projectsService.update(route.params.id, payload)
          toast.success('Project updated.')
        } else {
          await projectsService.create(payload)
          toast.success('Project created.')
        }
        router.push('/projects')
      } catch {
        toast.error(isEdit.value ? 'Failed to update project.' : 'Failed to create project.')
      } finally {
        saving.value = false
      }
    }

    onMounted(loadProject)

    return { isEdit, loadingProject, saving, form, handleSubmit, settingsStore }
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

.page-header {
  margin-bottom: 2rem;
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

.page-header h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

/* Loading */
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

/* Form */
.project-form {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.75rem;
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
  resize: vertical;
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

.form-group input:disabled,
.form-group textarea:disabled {
  opacity: 0.6;
}

/* Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.2rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
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
  display: inline-flex;
  align-items: center;
  padding: 0.65rem 1.2rem;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #334155;
  border-color: #64748b;
  color: #f1f5f9;
}
</style>
