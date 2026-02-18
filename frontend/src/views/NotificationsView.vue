<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Stay up to date with shift reminders and updates.</p>
        </div>
        <div class="header-actions">
          <button
            v-if="notifStore.hasUnread"
            class="btn-secondary"
            @click="notifStore.markAllRead()"
          >
            Mark all read
          </button>
          <router-link to="/notifications/preferences" class="btn-secondary">
            Preferences
          </router-link>
        </div>
      </div>

      <!-- Filter tabs -->
      <div class="filter-tabs">
        <button
          class="filter-tab"
          :class="{ active: filter === 'all' }"
          @click="filter = 'all'"
        >
          All
        </button>
        <button
          class="filter-tab"
          :class="{ active: filter === 'unread' }"
          @click="filter = 'unread'"
        >
          Unread
          <span v-if="notifStore.unreadCount" class="tab-badge">{{ notifStore.unreadCount }}</span>
        </button>
      </div>

      <div v-if="notifStore.loading" class="loading-state">
        <span class="spinner"></span>
        Loading notifications...
      </div>

      <div v-else-if="filtered.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </div>
        <h3>{{ filter === 'unread' ? 'All caught up!' : 'No notifications yet' }}</h3>
        <p>{{ filter === 'unread' ? 'You have no unread notifications.' : 'Notifications about shifts and projects will appear here.' }}</p>
      </div>

      <div v-else class="notif-list">
        <div
          v-for="n in filtered"
          :key="n.id"
          class="notif-card"
          :class="{ unread: !n.is_read }"
          @click="handleClick(n)"
        >
          <div class="notif-icon" :class="typeClass(n.notification_type)">
            <svg v-if="n.notification_type === 'shift_reminder'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <svg v-else-if="n.notification_type === 'task_assigned' || n.notification_type === 'task_updated'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </div>

          <div class="notif-body">
            <div class="notif-title">{{ n.title }}</div>
            <div class="notif-text">{{ n.body }}</div>
            <div class="notif-meta">
              <span class="notif-type-badge" :class="typeClass(n.notification_type)">
                {{ formatType(n.notification_type) }}
              </span>
              <span class="notif-time">{{ formatAgo(n.created_at) }}</span>
            </div>
          </div>

          <div class="notif-actions">
            <button
              v-if="!n.is_read"
              class="btn-icon-sm"
              title="Mark as read"
              @click.stop="notifStore.markRead(n.id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
            <button
              class="btn-icon-sm btn-danger-sm"
              title="Delete"
              @click.stop="notifStore.remove(n.id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { useNotificationStore } from '@/stores/notifications'
import { useSettingsStore } from '@/stores/settings'

export default {
  name: 'NotificationsView',
  components: { NavBar },
  setup() {
    const notifStore = useNotificationStore()
    const settingsStore = useSettingsStore()
    const filter = ref('all')

    onMounted(() => {
      notifStore.fetchNotifications()
    })

    const filtered = computed(() => {
      if (filter.value === 'unread') {
        return notifStore.notifications.filter((n) => !n.is_read)
      }
      return notifStore.notifications
    })

    function handleClick(n) {
      if (!n.is_read) {
        notifStore.markRead(n.id)
      }
    }

    function typeClass(type) {
      const map = {
        shift_reminder: 'type-shift',
        task_assigned: 'type-task',
        task_updated: 'type-task',
        project_updated: 'type-project',
      }
      return map[type] || 'type-general'
    }

    function formatType(type) {
      const map = {
        shift_reminder: 'Shift Reminder',
        task_assigned: 'Task Assigned',
        task_updated: 'Task Updated',
        project_updated: `${settingsStore.projectDescription} Updated`,
        general: 'General',
      }
      return map[type] || type
    }

    function formatAgo(dateStr) {
      const d = new Date(dateStr)
      const now = new Date()
      const diff = Math.floor((now - d) / 1000)

      if (diff < 60) return 'Just now'
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
      return d.toLocaleDateString()
    }

    return { notifStore, settingsStore, filter, filtered, handleClick, typeClass, formatType, formatAgo }
  },
}
</script>

<style scoped>
.page { min-height: 100vh; }

.page-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 0.25rem;
}

.page-header p {
  font-size: 0.9rem;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-secondary {
  padding: 0.45rem 0.9rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  color: rgba(203, 213, 225, 0.9);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(148, 163, 184, 0.25);
  color: #f1f5f9;
}

/* Filter tabs */
.filter-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1.5rem;
  padding: 4px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  width: fit-content;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #64748b;
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tab:hover { color: #94a3b8; }

.filter-tab.active {
  background: rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
}

.tab-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Loading & empty states */
.loading-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(148, 163, 184, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: #64748b;
}

.empty-icon {
  margin-bottom: 1rem;
  opacity: 0.4;
}

.empty-state h3 {
  font-size: 1.1rem;
  color: #94a3b8;
  margin-bottom: 0.4rem;
}

.empty-state p {
  font-size: 0.88rem;
}

/* Notification list */
.notif-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notif-card {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.notif-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(148, 163, 184, 0.12);
}

.notif-card.unread {
  background: rgba(59, 130, 246, 0.06);
  border-color: rgba(59, 130, 246, 0.15);
}

.notif-card.unread:hover {
  background: rgba(59, 130, 246, 0.09);
}

.notif-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  flex-shrink: 0;
  background: rgba(148, 163, 184, 0.08);
  color: #94a3b8;
}

.notif-icon.type-shift {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
}

.notif-icon.type-task {
  background: rgba(168, 85, 247, 0.12);
  color: #a78bfa;
}

.notif-icon.type-project {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
}

.notif-body {
  flex: 1;
  min-width: 0;
}

.notif-title {
  font-size: 0.92rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 0.2rem;
}

.notif-text {
  font-size: 0.84rem;
  color: #94a3b8;
  line-height: 1.5;
  margin-bottom: 0.5rem;
}

.notif-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.notif-type-badge {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.notif-type-badge.type-shift {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.notif-type-badge.type-task {
  background: rgba(168, 85, 247, 0.15);
  color: #a78bfa;
}

.notif-type-badge.type-project {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.notif-time {
  font-size: 0.78rem;
  color: #475569;
}

.notif-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.notif-card:hover .notif-actions {
  opacity: 1;
}

.btn-icon-sm {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 6px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon-sm:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.btn-danger-sm:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.2);
}

@media (max-width: 768px) {
  .page-content { padding: 1.5rem 1rem; }
  .page-header { flex-direction: column; }
  .notif-actions { opacity: 1; }
}
</style>
