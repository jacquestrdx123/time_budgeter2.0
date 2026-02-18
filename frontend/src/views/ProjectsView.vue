<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="page-header">
        <div>
          <h1>{{ settingsStore.projectDescriptionPlural }}</h1>
          <p class="page-subtitle">Manage your {{ settingsStore.projectDescriptionPlural.toLowerCase() }} and track progress.</p>
        </div>
        <router-link to="/projects/new" class="btn-primary">
          <span class="btn-icon">+</span>
          New {{ settingsStore.projectDescription }}
        </router-link>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>Loading projects...</span>
      </div>

      <div v-else-if="projects.length === 0" class="empty-state">
        <div class="empty-icon">&#128193;</div>
        <h3>No {{ settingsStore.projectDescriptionPlural.toLowerCase() }} yet</h3>
        <p>Create your first {{ settingsStore.projectDescription.toLowerCase() }} to start tracking time.</p>
        <router-link to="/projects/new" class="btn-primary">Create {{ settingsStore.projectDescription }}</router-link>
      </div>

      <div v-else class="projects-grid">
        <div v-for="project in projects" :key="project.id" class="project-card">
          <div class="project-card-header">
            <h3 class="project-name">
              <router-link :to="`/projects/${project.id}`" class="project-name-link">
                {{ project.name }}
              </router-link>
            </h3>
            <div class="project-actions">
              <router-link
                :to="`/projects/${project.id}/edit`"
                class="btn-icon-action"
                title="Edit project"
              >
                &#9998;
              </router-link>
              <button
                class="btn-icon-action btn-danger"
                title="Delete project"
                @click="confirmDelete(project)"
              >
                &#128465;
              </button>
            </div>
          </div>
          <p class="project-description">
            {{ project.description || 'No description' }}
          </p>
          <div class="project-meta">
            <span class="project-date">Created {{ formatDate(project.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Delete confirmation modal -->
      <Teleport to="body">
        <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
          <div class="modal">
            <h3>Delete {{ settingsStore.projectDescription }}</h3>
            <p>
              Are you sure you want to delete
              <strong>{{ deleteTarget.name }}</strong>? This action cannot be undone.
            </p>
            <div class="modal-actions">
              <button class="btn-secondary" @click="deleteTarget = null" :disabled="deleting">
                Cancel
              </button>
              <button class="btn-delete" @click="handleDelete" :disabled="deleting">
                <span v-if="deleting" class="spinner-sm"></span>
                {{ deleting ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { useSettingsStore } from '@/stores/settings'
import projectsService from '@/services/projects'
import { useToastStore } from '@/stores/toast'

export default {
  name: 'ProjectsView',
  components: { NavBar },
  setup() {
    const toast = useToastStore()
    const settingsStore = useSettingsStore()
    const projects = ref([])
    const loading = ref(true)
    const deleteTarget = ref(null)
    const deleting = ref(false)

    async function fetchProjects() {
      loading.value = true
      try {
        const { data } = await projectsService.list()
        projects.value = data
      } catch {
        toast.error('Failed to load projects.')
      } finally {
        loading.value = false
      }
    }

    function confirmDelete(project) {
      deleteTarget.value = project
    }

    async function handleDelete() {
      if (!deleteTarget.value) return
      deleting.value = true
      try {
        await projectsService.delete(deleteTarget.value.id)
        projects.value = projects.value.filter((p) => p.id !== deleteTarget.value.id)
        toast.success(`"${deleteTarget.value.name}" deleted.`)
        deleteTarget.value = null
      } catch {
        toast.error('Failed to delete project.')
      } finally {
        deleting.value = false
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

    onMounted(fetchProjects)

    return { settingsStore, projects, loading, deleteTarget, deleting, confirmDelete, handleDelete, formatDate }
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
  gap: 1rem;
}

.page-header h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.35rem;
}

.page-subtitle {
  color: #94a3b8;
  margin: 0;
  font-size: 0.95rem;
}

/* Buttons */
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
  white-space: nowrap;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.btn-secondary {
  padding: 0.55rem 1rem;
  background: transparent;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background: #334155;
  border-color: #64748b;
  color: #f1f5f9;
}

.btn-delete {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-delete:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-delete:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

/* Empty state */
.empty-state {
  text-align: center;
  padding: 4rem 1rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.15rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 0.5rem;
}

.empty-state p {
  color: #94a3b8;
  margin: 0 0 1.5rem;
  font-size: 0.95rem;
}

/* Projects grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.project-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s;
}

.project-card:hover {
  border-color: #475569;
}

.project-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.project-name {
  font-size: 1.05rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
  line-height: 1.3;
}

.project-name-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s;
}

.project-name-link:hover {
  color: #3b82f6;
}

.project-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.btn-icon-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-icon-action:hover {
  background: #334155;
  color: #f1f5f9;
}

.btn-icon-action.btn-danger:hover {
  background: rgba(220, 38, 38, 0.15);
  color: #f87171;
}

.project-description {
  color: #94a3b8;
  font-size: 0.88rem;
  line-height: 1.5;
  margin: 0;
  flex: 1;
}

.project-meta {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #334155;
}

.project-date {
  font-size: 0.78rem;
  color: #64748b;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.75rem;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 0.75rem;
}

.modal p {
  color: #94a3b8;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1.5rem;
}

.modal p strong {
  color: #e2e8f0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
