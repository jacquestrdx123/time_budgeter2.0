<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="page-header">
        <div>
          <h1>Settings</h1>
          <p>Configure system-wide preferences.</p>
        </div>
        <button class="btn-add" @click="showCreateModal = true">+ Add Setting</button>
      </div>

      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        Loading settings...
      </div>

      <div v-else-if="settings.length === 0" class="empty-state">
        <h3>No settings found</h3>
        <p>Settings will be seeded on first server start.</p>
      </div>

      <div v-else class="settings-grid">
        <div
          v-for="s in settings"
          :key="s.key"
          class="setting-card"
        >
          <div class="card-top">
            <div class="card-meta">
              <span class="card-key">{{ s.key }}</span>
              <span class="card-type">{{ displayType(s.setting_type) }}</span>
            </div>
            <button class="btn-delete" @click="confirmDelete(s)" title="Delete">&times;</button>
          </div>
          <label class="card-label">{{ s.label }}</label>
          <p v-if="s.description" class="card-desc">{{ s.description }}</p>

          <!-- Select type -->
          <div v-if="isSelect(s.setting_type)" class="card-input-row">
            <select
              class="card-select"
              :value="editValues[s.key] ?? s.value"
              @change="onEdit(s.key, $event.target.value)"
            >
              <option
                v-for="opt in selectOptions(s.setting_type)"
                :key="opt"
                :value="opt"
              >{{ capitalize(opt) }}</option>
            </select>
          </div>

          <!-- Number type -->
          <div v-else-if="s.setting_type === 'number'" class="card-input-row">
            <input
              type="number"
              class="card-input"
              :value="editValues[s.key] ?? s.value"
              @input="onEdit(s.key, $event.target.value)"
            />
          </div>

          <!-- String type (default) -->
          <div v-else class="card-input-row">
            <input
              type="text"
              class="card-input"
              :value="editValues[s.key] ?? s.value"
              @input="onEdit(s.key, $event.target.value)"
            />
          </div>

          <Transition name="fade">
            <div v-if="isDirty(s.key, s.value)" class="card-actions">
              <button class="btn-cancel" @click="cancelEdit(s.key)">Cancel</button>
              <button
                class="btn-save"
                :disabled="savingKey === s.key"
                @click="saveSetting(s.key)"
              >{{ savingKey === s.key ? 'Saving...' : 'Save' }}</button>
            </div>
          </Transition>

          <Transition name="fade">
            <span v-if="savedKey === s.key" class="saved-badge">Saved</span>
          </Transition>
        </div>
      </div>

      <!-- Create modal -->
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal-card">
          <h3>Add Setting</h3>
          <div class="form-group">
            <label>Key</label>
            <input v-model="newSetting.key" type="text" class="form-input" placeholder="e.g. max_overtime_hours" />
          </div>
          <div class="form-group">
            <label>Label</label>
            <input v-model="newSetting.label" type="text" class="form-input" placeholder="e.g. Max Overtime Hours" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <input v-model="newSetting.description" type="text" class="form-input" placeholder="Optional description" />
          </div>
          <div class="form-group">
            <label>Type</label>
            <select v-model="newSetting.setting_type" class="form-input">
              <option value="string">String</option>
              <option value="number">Number</option>
            </select>
          </div>
          <div class="form-group">
            <label>Value</label>
            <input v-model="newSetting.value" type="text" class="form-input" placeholder="Default value" />
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" @click="showCreateModal = false">Cancel</button>
            <button
              class="btn-primary"
              :disabled="!newSetting.key || !newSetting.label || creating"
              @click="handleCreate"
            >{{ creating ? 'Creating...' : 'Create' }}</button>
          </div>
        </div>
      </div>

      <!-- Delete modal -->
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal-card">
          <h3>Delete Setting</h3>
          <p>Are you sure you want to delete <strong>{{ deleteTarget?.key }}</strong>? This cannot be undone.</p>
          <div class="modal-actions">
            <button class="btn-secondary" @click="showDeleteModal = false">Cancel</button>
            <button class="btn-danger" @click="handleDelete">Delete</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { settingsService } from '@/services/settings'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'

export default {
  name: 'SettingsView',
  components: { NavBar },
  setup() {
    const toast = useToastStore()
    const settingsStore = useSettingsStore()

    const settings = ref([])
    const loading = ref(true)
    const editValues = reactive({})
    const savingKey = ref(null)
    const savedKey = ref(null)

    const showCreateModal = ref(false)
    const creating = ref(false)
    const newSetting = reactive({
      key: '',
      value: '',
      label: '',
      description: '',
      setting_type: 'string',
    })

    const showDeleteModal = ref(false)
    const deleteTarget = ref(null)

    onMounted(async () => {
      try {
        settings.value = await settingsService.list()
      } catch {
        toast.error('Failed to load settings')
      } finally {
        loading.value = false
      }
    })

    function onEdit(key, value) {
      editValues[key] = value
    }

    function cancelEdit(key) {
      delete editValues[key]
    }

    function isDirty(key, original) {
      return key in editValues && editValues[key] !== original
    }

    async function saveSetting(key) {
      savingKey.value = key
      try {
        const updated = await settingsService.update(key, editValues[key])
        const idx = settings.value.findIndex(s => s.key === key)
        if (idx >= 0) settings.value[idx] = updated
        delete editValues[key]
        savedKey.value = key
        setTimeout(() => { if (savedKey.value === key) savedKey.value = null }, 2000)
        await settingsStore.fetchSettings()
      } catch {
        toast.error('Failed to save setting')
      } finally {
        savingKey.value = null
      }
    }

    async function handleCreate() {
      creating.value = true
      try {
        const created = await settingsService.create({ ...newSetting })
        settings.value.push(created)
        showCreateModal.value = false
        Object.assign(newSetting, { key: '', value: '', label: '', description: '', setting_type: 'string' })
        toast.success('Setting created')
        await settingsStore.fetchSettings()
      } catch (err) {
        const msg = err.response?.data?.detail || 'Failed to create setting'
        toast.error(msg)
      } finally {
        creating.value = false
      }
    }

    function confirmDelete(s) {
      deleteTarget.value = s
      showDeleteModal.value = true
    }

    async function handleDelete() {
      if (!deleteTarget.value) return
      try {
        await settingsService.remove(deleteTarget.value.key)
        settings.value = settings.value.filter(s => s.key !== deleteTarget.value.key)
        toast.success('Setting deleted')
        await settingsStore.fetchSettings()
      } catch {
        toast.error('Failed to delete setting')
      } finally {
        showDeleteModal.value = false
        deleteTarget.value = null
      }
    }

    function isSelect(type) {
      return type && type.startsWith('select:')
    }

    function selectOptions(type) {
      return type.replace('select:', '').split(',')
    }

    function displayType(type) {
      if (type.startsWith('select:')) return 'select'
      return type
    }

    function capitalize(s) {
      return s.charAt(0).toUpperCase() + s.slice(1)
    }

    return {
      settings,
      loading,
      editValues,
      savingKey,
      savedKey,
      showCreateModal,
      creating,
      newSetting,
      showDeleteModal,
      deleteTarget,
      onEdit,
      cancelEdit,
      isDirty,
      saveSetting,
      handleCreate,
      confirmDelete,
      handleDelete,
      isSelect,
      selectOptions,
      displayType,
      capitalize,
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
  max-width: 860px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
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

.btn-add {
  padding: 0.6rem 1.2rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-add:hover {
  background: #2563eb;
}

/* Loading / Empty */
.loading-state {
  text-align: center;
  padding: 4rem 1rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
}

.empty-state h3 {
  color: #f1f5f9;
  margin: 0 0 0.5rem;
}

.empty-state p {
  color: #94a3b8;
  margin: 0;
}

/* Settings grid */
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 640px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

/* Cards */
.setting-card {
  position: relative;
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 14px;
  padding: 1.15rem 1.25rem 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.setting-card:hover {
  border-color: rgba(148, 163, 184, 0.18);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-key {
  font-size: 0.68rem;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.card-type {
  font-size: 0.65rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.btn-delete {
  background: none;
  border: none;
  color: #475569;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.btn-delete:hover {
  color: #f87171;
}

.card-label {
  display: block;
  font-size: 0.92rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 0.2rem;
}

.card-desc {
  font-size: 0.78rem;
  color: #64748b;
  margin: 0 0 0.75rem;
  line-height: 1.4;
}

/* Inputs */
.card-input-row {
  margin-bottom: 0.25rem;
}

.card-input,
.card-select {
  width: 100%;
  padding: 0.5rem 0.7rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.88rem;
  font-weight: 500;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.card-input:focus,
.card-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.card-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.6rem center;
  padding-right: 2rem;
}

/* Card actions (save/cancel) */
.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.6rem;
}

.btn-cancel {
  padding: 0.35rem 0.75rem;
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 6px;
  color: #94a3b8;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}

.btn-save {
  padding: 0.35rem 0.85rem;
  background: #3b82f6;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-save:hover:not(:disabled) {
  background: #2563eb;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Saved badge */
.saved-badge {
  position: absolute;
  bottom: 0.75rem;
  right: 0.85rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #34d399;
  background: rgba(52, 211, 153, 0.1);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  background: rgba(30, 41, 59, 0.9);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}

.modal-card h3 {
  color: #f1f5f9;
  margin: 0 0 1.25rem;
  font-size: 1.1rem;
}

.modal-card p {
  color: #94a3b8;
  margin: 0 0 1.5rem;
  font-size: 0.9rem;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.form-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.88rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.btn-secondary {
  padding: 0.55rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
}

.btn-primary {
  padding: 0.55rem 1rem;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-danger {
  padding: 0.55rem 1rem;
  background: #ef4444;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-danger:hover {
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
  to { transform: rotate(360deg); }
}
</style>
