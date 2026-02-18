<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="page-header">
        <div>
          <router-link to="/team" class="back-link">&larr; Back to Team</router-link>
          <h1>Team Members</h1>
          <p>Manage who can access your team. Only admins can add or remove users.</p>
        </div>
        <button
          v-if="auth.isAdmin"
          class="btn-add"
          @click="openAddModal"
        >+ Add user</button>
      </div>

      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        Loading team members...
      </div>

      <div v-else-if="users.length === 0" class="empty-state">
        <h3>No team members</h3>
        <p>Only admins can invite new users.</p>
      </div>

      <div v-else class="users-table-wrap">
        <table class="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th class="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" class="user-row">
              <td>
                <span class="user-avatar">{{ initials(u.name) }}</span>
                {{ u.name }}
              </td>
              <td>{{ u.email }}</td>
              <td>
                <span class="role-badge" :class="u.role">{{ u.role }}</span>
              </td>
              <td class="td-actions">
                <button
                  v-if="canEdit(u)"
                  class="btn-icon"
                  title="Edit"
                  @click="openEditModal(u)"
                >Edit</button>
                <button
                  v-if="auth.isAdmin && canDelete(u)"
                  class="btn-icon btn-danger"
                  title="Remove"
                  @click="confirmDelete(u)"
                >Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add user modal -->
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal-card">
          <h3>Add user</h3>
          <div class="form-group">
            <label>Name</label>
            <input v-model="addForm.name" type="text" class="form-input" placeholder="Full name" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input v-model="addForm.email" type="email" class="form-input" placeholder="email@example.com" />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input v-model="addForm.password" type="password" class="form-input" placeholder="Minimum 8 characters" />
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" @click="showAddModal = false">Cancel</button>
            <button
              class="btn-primary"
              :disabled="addSaving || !addForm.name || !addForm.email || !addForm.password"
              @click="submitAdd"
            >{{ addSaving ? 'Adding...' : 'Add user' }}</button>
          </div>
        </div>
      </div>

      <!-- Edit user modal -->
      <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
        <div class="modal-card">
          <h3>Edit user</h3>
          <div class="form-group">
            <label>Name</label>
            <input v-model="editForm.name" type="text" class="form-input" placeholder="Full name" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input v-model="editForm.email" type="email" class="form-input" placeholder="email@example.com" />
          </div>
          <div v-if="auth.isAdmin" class="form-group">
            <label>Role</label>
            <select v-model="editForm.role" class="form-input">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <span v-if="editForm.id === auth.user?.id" class="form-hint">You cannot demote yourself while editing.</span>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" @click="showEditModal = false">Cancel</button>
            <button
              class="btn-primary"
              :disabled="editSaving || !editForm.name || !editForm.email"
              @click="submitEdit"
            >{{ editSaving ? 'Saving...' : 'Save' }}</button>
          </div>
        </div>
      </div>

      <!-- Delete confirm -->
      <div v-if="userToDelete" class="modal-overlay" @click.self="userToDelete = null">
        <div class="modal-card">
          <h3>Remove user</h3>
          <p>Are you sure you want to remove <strong>{{ userToDelete.name }}</strong> ({{ userToDelete.email }})? They will no longer be able to sign in.</p>
          <div class="modal-actions">
            <button class="btn-secondary" @click="userToDelete = null">Cancel</button>
            <button
              class="btn-danger"
              :disabled="deleteSaving"
              @click="submitDelete"
            >{{ deleteSaving ? 'Removing...' : 'Remove user' }}</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { useAuthStore } from '@/stores/auth'
import { userService } from '@/services/users'
import { useToastStore } from '@/stores/toast'

export default {
  name: 'TeamMembersView',
  components: { NavBar },
  setup() {
    const auth = useAuthStore()
    const toast = useToastStore()

    const users = ref([])
    const loading = ref(true)
    const showAddModal = ref(false)
    const showEditModal = ref(false)
    const addSaving = ref(false)
    const editSaving = ref(false)
    const deleteSaving = ref(false)
    const userToDelete = ref(null)

    const addForm = ref({ name: '', email: '', password: '' })
    const editForm = ref({ id: null, name: '', email: '', role: 'member' })

    function initials(name) {
      if (!name) return ''
      return name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    function canEdit(u) {
      return auth.isAdmin || String(u.id) === String(auth.user?.id)
    }

    function canDelete(u) {
      if (!auth.isAdmin) return false
      if (u.role === 'admin') {
        const admins = users.value.filter(uu => uu.role === 'admin')
        return admins.length > 1
      }
      return true
    }

    function openAddModal() {
      addForm.value = { name: '', email: '', password: '' }
      showAddModal.value = true
    }

    function openEditModal(u) {
      editForm.value = { id: u.id, name: u.name, email: u.email, role: u.role || 'member' }
      showEditModal.value = true
    }

    async function loadUsers() {
      loading.value = true
      try {
        users.value = await userService.list()
      } catch (err) {
        const msg = err.response?.data?.detail || 'Failed to load team members'
        toast.error(msg)
      } finally {
        loading.value = false
      }
    }

    async function submitAdd() {
      addSaving.value = true
      try {
        await userService.create({
          name: addForm.value.name,
          email: addForm.value.email,
          password: addForm.value.password,
        })
        toast.success('User added')
        showAddModal.value = false
        await loadUsers()
      } catch (err) {
        const msg = err.response?.data?.detail || 'Failed to add user'
        toast.error(msg)
      } finally {
        addSaving.value = false
      }
    }

    async function submitEdit() {
      editSaving.value = true
      try {
        const payload = { name: editForm.value.name, email: editForm.value.email }
        if (auth.isAdmin && editForm.value.role) payload.role = editForm.value.role
        await userService.update(editForm.value.id, payload)
        toast.success('User updated')
        showEditModal.value = false
        await loadUsers()
      } catch (err) {
        const msg = err.response?.data?.detail || 'Failed to update user'
        toast.error(msg)
      } finally {
        editSaving.value = false
      }
    }

    function confirmDelete(u) {
      if (u.role === 'admin') {
        const admins = users.value.filter(uu => uu.role === 'admin')
        if (admins.length <= 1) {
          toast.error('Cannot remove the last admin.')
          return
        }
      }
      userToDelete.value = u
    }

    async function submitDelete() {
      if (!userToDelete.value) return
      deleteSaving.value = true
      try {
        await userService.delete(userToDelete.value.id)
        toast.success('User removed')
        userToDelete.value = null
        await loadUsers()
      } catch (err) {
        const msg = err.response?.data?.detail || 'Failed to remove user'
        toast.error(msg)
      } finally {
        deleteSaving.value = false
      }
    }

    onMounted(() => loadUsers())

    return {
      auth,
      users,
      loading,
      showAddModal,
      showEditModal,
      addForm,
      editForm,
      addSaving,
      editSaving,
      deleteSaving,
      userToDelete,
      initials,
      canEdit,
      canDelete,
      openAddModal,
      openEditModal,
      confirmDelete,
      submitAdd,
      submitEdit,
      submitDelete,
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
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.back-link {
  display: inline-block;
  font-size: 0.85rem;
  color: #94a3b8;
  text-decoration: none;
  margin-bottom: 0.5rem;
}

.back-link:hover {
  color: #cbd5e1;
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
  padding: 0.5rem 1rem;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-add:hover {
  background: #2563eb;
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

.users-table-wrap {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #334155;
}

.users-table th {
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.users-table tbody tr:last-child td {
  border-bottom: none;
}

.users-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}

.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #334155;
  color: #e2e8f0;
  font-size: 0.7rem;
  font-weight: 700;
  margin-right: 0.5rem;
  vertical-align: middle;
}

.role-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.role-badge.admin {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.role-badge.member {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.th-actions,
.td-actions {
  width: 140px;
  text-align: right;
}

.btn-icon {
  padding: 0.35rem 0.6rem;
  margin-left: 0.35rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid #334155;
  border-radius: 6px;
  color: #cbd5e1;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.btn-icon.btn-danger:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: #f87171;
}

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

.modal-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  width: 100%;
}

.modal-card h3 {
  color: #f1f5f9;
  font-size: 1.2rem;
  margin: 0 0 1rem;
}

.modal-card p {
  color: #94a3b8;
  margin: 0 0 1rem;
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 0.35rem;
}

.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.9rem;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-group select.form-input {
  cursor: pointer;
}

.form-hint {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: #64748b;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.25rem;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid #334155;
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  padding: 0.5rem 1rem;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 8px;
  color: #f87171;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.3);
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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
