<template>
  <nav class="glass-nav" :class="{ scrolled: hasScrolled }">
    <div class="nav-inner">
      <router-link to="/" class="nav-brand">
        <span class="brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
            <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </span>
        <span class="brand-text">TimeBudget</span>
      </router-link>

      <!-- Desktop links -->
      <div class="nav-links">
        <router-link to="/" class="nav-link" exact-active-class="nav-link--active">
          Dashboard
        </router-link>
        <router-link to="/projects" class="nav-link" active-class="nav-link--active">
          Projects
        </router-link>
        <router-link to="/tasks" class="nav-link" active-class="nav-link--active">
          Tasks
        </router-link>
        <router-link to="/planner" class="nav-link" active-class="nav-link--active">
          Planner
        </router-link>
        <router-link to="/team" class="nav-link" active-class="nav-link--active">
          Team
        </router-link>
        <router-link to="/shifts" class="nav-link" active-class="nav-link--active">
          Shifts
        </router-link>
        <router-link to="/settings" class="nav-link" active-class="nav-link--active">
          Settings
        </router-link>
      </div>

      <!-- Desktop right -->
      <div class="nav-right">
        <button class="btn-test-notif" :disabled="testingPush" @click="handleTestPush" title="Send test push notification">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          {{ testingPush ? 'Sending…' : 'Test Notifications' }}
        </button>
        <router-link to="/notifications" class="notif-bell" title="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <span v-if="notifStore.hasUnread" class="notif-badge">{{ notifStore.unreadCount > 9 ? '9+' : notifStore.unreadCount }}</span>
        </router-link>
        <span class="nav-user">{{ auth.userName }}</span>
        <button class="btn-signout" @click="handleLogout">Sign Out</button>
      </div>

      <!-- Mobile hamburger -->
      <button
        class="hamburger"
        :class="{ open: mobileOpen }"
        @click="mobileOpen = !mobileOpen"
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  </nav>

  <!-- Mobile drawer -->
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="mobileOpen" class="mobile-overlay" @click="mobileOpen = false"></div>
    </Transition>
    <Transition name="drawer">
      <div v-if="mobileOpen" class="mobile-drawer">
        <div class="drawer-header">
          <span class="drawer-brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
              <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
            TimeBudget
          </span>
          <button class="drawer-close" @click="mobileOpen = false" aria-label="Close menu">&times;</button>
        </div>

        <div class="drawer-user">
          <span class="drawer-avatar">{{ initials }}</span>
          <span class="drawer-user-name">{{ auth.userName }}</span>
        </div>

        <nav class="drawer-links">
          <router-link to="/" class="drawer-link" exact-active-class="drawer-link--active" @click="mobileOpen = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Dashboard
          </router-link>
          <router-link to="/projects" class="drawer-link" active-class="drawer-link--active" @click="mobileOpen = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            Projects
          </router-link>
          <router-link to="/tasks" class="drawer-link" active-class="drawer-link--active" @click="mobileOpen = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            Tasks
          </router-link>
          <router-link to="/planner" class="drawer-link" active-class="drawer-link--active" @click="mobileOpen = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Planner
          </router-link>
          <router-link to="/team" class="drawer-link" active-class="drawer-link--active" @click="mobileOpen = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            Team
          </router-link>
          <router-link to="/shifts" class="drawer-link" active-class="drawer-link--active" @click="mobileOpen = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Shifts
          </router-link>

          <router-link to="/notifications" class="drawer-link" active-class="drawer-link--active" @click="mobileOpen = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            Notifications
            <span v-if="notifStore.hasUnread" class="drawer-badge">{{ notifStore.unreadCount }}</span>
          </router-link>

          <button class="drawer-link drawer-test-btn" :disabled="testingPush" @click="handleTestPush">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17H2a3 3 0 003-3V9a7 7 0 0114 0v5a3 3 0 003 3zm-8.27 4a2 2 0 01-3.46 0"/></svg>
            {{ testingPush ? 'Sending…' : 'Test Notifications' }}
          </button>

          <div class="drawer-divider"></div>

          <router-link to="/settings" class="drawer-link" active-class="drawer-link--active" @click="mobileOpen = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z"/></svg>
            Settings
          </router-link>
        </nav>

        <div class="drawer-footer">
          <button class="btn-signout-mobile" @click="handleLogout">Sign Out</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { notificationService } from '@/services/notifications'

export default {
  name: 'NavBar',
  setup() {
    const auth = useAuthStore()
    const notifStore = useNotificationStore()
    const router = useRouter()
    const mobileOpen = ref(false)
    const hasScrolled = ref(false)
    const testingPush = ref(false)

    function handleLogout() {
      mobileOpen.value = false
      auth.logout()
      router.push('/login')
    }

    async function handleTestPush() {
      testingPush.value = true
      try {
        const result = await notificationService.testPush()
        if (result.success) {
          alert('Test notification sent! Check your browser/device.')
        } else {
          alert(result.error || 'Test notification failed.')
        }
        notifStore.fetchUnreadCount()
      } catch (err) {
        const msg = err.response?.data?.error || err.response?.data?.detail || err.message
        alert('Test notification failed: ' + msg)
      } finally {
        testingPush.value = false
      }
    }

    function onScroll() {
      hasScrolled.value = window.scrollY > 8
    }

    onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
    onUnmounted(() => window.removeEventListener('scroll', onScroll))

    const initials = computed(() => {
      const name = auth.userName || ''
      return name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    })

    return { auth, notifStore, mobileOpen, hasScrolled, handleLogout, handleTestPush, testingPush, initials }
  },
}
</script>

<style scoped>
/* ==========================================
   GLASS NAV — desktop
   ========================================== */
.glass-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0 1.5rem;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
}

.glass-nav.scrolled {
  background: rgba(15, 23, 42, 0.72);
  border-bottom-color: rgba(148, 163, 184, 0.12);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  height: 56px;
  gap: 1.5rem;
}

/* Brand */
.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: #f1f5f9;
  flex-shrink: 0;
}

.brand-icon {
  display: flex;
  color: #3b82f6;
}

.brand-text {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* Desktop links */
.nav-links {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  flex: 1;
  justify-content: center;
}

.nav-link {
  position: relative;
  padding: 0.4rem 0.75rem;
  font-size: 0.84rem;
  font-weight: 500;
  color: rgba(148, 163, 184, 0.9);
  text-decoration: none;
  border-radius: 8px;
  transition: color 0.2s, background 0.2s;
}

.nav-link:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.06);
}

.nav-link--active {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.1);
}

/* Test notification button */
.btn-test-notif {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 8px;
  color: #60a5fa;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-test-notif:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
  color: #93bbfc;
}

.btn-test-notif:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Notification bell */
.notif-bell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  color: rgba(148, 163, 184, 0.9);
  text-decoration: none;
  transition: color 0.2s, background 0.2s;
}

.notif-bell:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.06);
}

.notif-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #ef4444;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  pointer-events: none;
}

.drawer-badge {
  margin-left: auto;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: #ef4444;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Desktop right */
.nav-right {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-shrink: 0;
}

.nav-user {
  font-size: 0.84rem;
  color: rgba(148, 163, 184, 0.85);
  font-weight: 500;
}

.btn-signout {
  padding: 0.35rem 0.85rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  color: rgba(203, 213, 225, 0.9);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.btn-signout:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(148, 163, 184, 0.25);
  color: #f1f5f9;
}

/* ==========================================
   HAMBURGER — hidden on desktop
   ========================================== */
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.hamburger:hover {
  background: rgba(255, 255, 255, 0.1);
}

.hamburger span {
  display: block;
  width: 100%;
  height: 2px;
  background: #cbd5e1;
  border-radius: 2px;
  transition: transform 0.3s, opacity 0.3s;
  transform-origin: center;
}

.hamburger.open span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.hamburger.open span:nth-child(2) {
  opacity: 0;
}

.hamburger.open span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* ==========================================
   MOBILE OVERLAY + DRAWER
   ========================================== */
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 200;
}

.mobile-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  max-width: 85vw;
  z-index: 201;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border-left: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow: -16px 0 48px rgba(0, 0, 0, 0.35);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.drawer-brand {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #f1f5f9;
}

.drawer-brand svg {
  color: #3b82f6;
}

.drawer-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  color: #94a3b8;
  font-size: 1.3rem;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1;
}

.drawer-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

/* Drawer user */
.drawer-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.15rem 1.25rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.06);
}

.drawer-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.drawer-user-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: #f1f5f9;
}

/* Drawer links */
.drawer-links {
  flex: 1;
  padding: 0.75rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow-y: auto;
}

.drawer-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(148, 163, 184, 0.9);
  text-decoration: none;
  border-radius: 10px;
  transition: all 0.2s;
}

.drawer-link svg {
  flex-shrink: 0;
  opacity: 0.7;
}

.drawer-link:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.06);
}

.drawer-link:hover svg {
  opacity: 1;
}

.drawer-link--active {
  color: #f1f5f9;
  background: rgba(59, 130, 246, 0.12);
}

.drawer-link--active svg {
  opacity: 1;
  color: #3b82f6;
}

/* Drawer test button */
.drawer-test-btn {
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: #60a5fa;
}

.drawer-test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Drawer divider */
.drawer-divider {
  height: 1px;
  background: rgba(148, 163, 184, 0.08);
  margin: 0.35rem 0.5rem;
}

/* Drawer footer */
.drawer-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid rgba(148, 163, 184, 0.06);
}

.btn-signout-mobile {
  width: 100%;
  padding: 0.6rem 0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 10px;
  color: rgba(203, 213, 225, 0.85);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-signout-mobile:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
}

/* ==========================================
   TRANSITIONS
   ========================================== */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.drawer-enter-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}

/* ==========================================
   RESPONSIVE
   ========================================== */
@media (max-width: 768px) {
  .nav-links,
  .nav-right {
    display: none;
  }

  .hamburger {
    display: flex;
  }

  .nav-inner {
    justify-content: space-between;
  }
}
</style>
