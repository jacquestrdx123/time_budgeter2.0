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

      <!-- Desktop links (dropdowns) -->
      <div class="nav-links" ref="navLinksRef">
        <template v-for="(group, gIdx) in navGroups" :key="gIdx">
          <!-- Single link -->
          <router-link
            v-if="group.to"
            :to="group.to"
            class="nav-link"
            :exact-active-class="group.to === '/' ? 'nav-link--active' : undefined"
            :active-class="group.to !== '/' ? 'nav-link--active' : undefined"
          >
            {{ group.label }}
          </router-link>
          <!-- Dropdown group -->
          <div
            v-else
            class="nav-dropdown"
            :class="{ open: openDropdown === group.label }"
            @mouseenter="openDropdown = group.label"
            @mouseleave="openDropdown = null"
          >
            <button
              type="button"
              class="nav-link nav-dropdown-trigger"
              :class="{ 'nav-link--active': isGroupActive(group) }"
              :aria-expanded="openDropdown === group.label"
              aria-haspopup="true"
              @click="openDropdown = openDropdown === group.label ? null : group.label"
            >
              {{ group.label }}
              <svg class="nav-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <Transition name="dropdown">
              <div
                v-show="openDropdown === group.label"
                class="nav-dropdown-panel"
                role="menu"
              >
                <router-link
                  v-for="(item, iIdx) in group.items"
                  :key="iIdx"
                  :to="item.to"
                  class="nav-dropdown-item"
                  active-class="nav-dropdown-item--active"
                  role="menuitem"
                  @click="openDropdown = null"
                >
                  <NavIcon :to="item.to" class="nav-dropdown-icon" />
                  {{ item.label }}
                  <span v-if="item.badge === 'notif' && notifStore.hasUnread" class="nav-dropdown-badge">
                    {{ notifStore.unreadCount > 9 ? '9+' : notifStore.unreadCount }}
                  </span>
                </router-link>
              </div>
            </Transition>
          </div>
        </template>
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
          <template v-for="(group, gIdx) in navGroups" :key="gIdx">
            <!-- Single link -->
            <router-link
              v-if="group.to"
              :to="group.to"
              class="drawer-link"
              :exact-active-class="group.to === '/' ? 'drawer-link--active' : undefined"
              :active-class="group.to !== '/' ? 'drawer-link--active' : undefined"
              @click="mobileOpen = false"
            >
              <NavIcon :to="group.to" />
              {{ group.label }}
            </router-link>
            <!-- Accordion group -->
            <div v-else class="drawer-group" :class="{ expanded: expandedDrawer === group.label }">
              <button
                type="button"
                class="drawer-group-trigger"
                :aria-expanded="expandedDrawer === group.label"
                @click="toggleDrawerGroup(group.label)"
              >
                {{ group.label }}
                <svg class="drawer-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <Transition name="drawer-accordion">
                <div v-show="expandedDrawer === group.label" class="drawer-group-panel">
                  <router-link
                    v-for="(item, iIdx) in group.items"
                    :key="iIdx"
                    :to="item.to"
                    class="drawer-link drawer-link--nested"
                    active-class="drawer-link--active"
                    @click="mobileOpen = false"
                  >
                    <NavIcon :to="item.to" />
                    {{ item.label }}
                    <span v-if="item.badge === 'notif' && notifStore.hasUnread" class="drawer-badge">
                      {{ notifStore.unreadCount }}
                    </span>
                  </router-link>
                </div>
              </Transition>
            </div>
          </template>

          <button class="drawer-link drawer-test-btn" :disabled="testingPush" @click="handleTestPush">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17H2a3 3 0 003-3V9a7 7 0 0114 0v5a3 3 0 003 3zm-8.27 4a2 2 0 01-3.46 0"/></svg>
            {{ testingPush ? 'Sending…' : 'Test Notifications' }}
          </button>

          <div class="drawer-divider"></div>
        </nav>

        <div class="drawer-footer">
          <button class="btn-signout-mobile" @click="handleLogout">Sign Out</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { useSettingsStore } from '@/stores/settings'
import { notificationService } from '@/services/notifications'
import { baseNavGroups } from '@/config/navMenu'
import NavIcon from './NavIcon.vue'

export default {
  name: 'NavBar',
  components: { NavIcon },
  setup() {
    const auth = useAuthStore()
    const notifStore = useNotificationStore()
    const settingsStore = useSettingsStore()
    const router = useRouter()
    const route = useRoute()
    const mobileOpen = ref(false)
    const hasScrolled = ref(false)
    const testingPush = ref(false)
    const openDropdown = ref(null)
    const expandedDrawer = ref(null)
    const navLinksRef = ref(null)

    function isGroupActive(group) {
      if (group.to) return false
      return (group.items || []).some(
        (item) => route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to))
      )
    }

    function toggleDrawerGroup(label) {
      expandedDrawer.value = expandedDrawer.value === label ? null : label
    }

    const projectLabel = computed(() => settingsStore.projectDescriptionPlural)
    const navGroups = computed(() => {
      const label = projectLabel.value
      return baseNavGroups.map((g) => {
        if (g.to) return g
        return {
          ...g,
          items: (g.items || []).map((item) =>
            item.to === '/projects' ? { ...item, label } : item
          ),
        }
      })
    })

    function getGroupForPath(path) {
      for (const g of navGroups.value) {
        if (g.to && g.to === path) return g.label
        if (g.items?.some((i) => i.to === path || (i.to !== '/' && path.startsWith(i.to))))
          return g.label
      }
      return null
    }

    watch(mobileOpen, (open) => {
      if (open) {
        const groupLabel = getGroupForPath(route.path)
        expandedDrawer.value = groupLabel || navGroups.value.find((g) => !g.to)?.label || null
      }
    })

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

    function onDocumentClick(e) {
      if (navLinksRef.value && !navLinksRef.value.contains(e.target)) {
        openDropdown.value = null
      }
    }

    onMounted(() => {
      window.addEventListener('scroll', onScroll, { passive: true })
      document.addEventListener('click', onDocumentClick)
    })
    onUnmounted(() => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('click', onDocumentClick)
    })

    const initials = computed(() => {
      const name = auth.userName || ''
      return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    })

    return {
      auth,
      notifStore,
      navGroups,
      mobileOpen,
      hasScrolled,
      openDropdown,
      expandedDrawer,
      navLinksRef,
      isGroupActive,
      toggleDrawerGroup,
      handleLogout,
      handleTestPush,
      testingPush,
      initials,
    }
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

/* Desktop dropdown */
.nav-dropdown {
  position: relative;
}

.nav-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.nav-chevron {
  opacity: 0.8;
  transition: transform 0.2s;
}

.nav-dropdown.open .nav-chevron {
  transform: rotate(180deg);
}

.nav-dropdown-panel {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 0.2rem;
  min-width: 160px;
  padding: 0.35rem;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  z-index: 50;
}

.nav-dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.84rem;
  font-weight: 500;
  color: rgba(148, 163, 184, 0.9);
  text-decoration: none;
  border-radius: 8px;
  transition: color 0.2s, background 0.2s;
}

.nav-dropdown-item:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.06);
}

.nav-dropdown-item--active {
  color: #f1f5f9;
  background: rgba(59, 130, 246, 0.15);
}

.nav-dropdown-icon {
  flex-shrink: 0;
}

.nav-dropdown-badge {
  margin-left: auto;
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

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
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

/* Drawer accordion groups */
.drawer-group {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.drawer-group-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.7rem 0.85rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(148, 163, 184, 0.9);
  background: none;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: all 0.2s;
}

.drawer-group-trigger:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.06);
}

.drawer-chevron {
  flex-shrink: 0;
  opacity: 0.7;
  transition: transform 0.2s;
}

.drawer-group.expanded .drawer-chevron {
  transform: rotate(180deg);
}

.drawer-group-panel {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding-left: 0.5rem;
  border-left: 2px solid rgba(148, 163, 184, 0.15);
  margin-left: 0.85rem;
}

.drawer-link--nested {
  padding: 0.5rem 0.65rem;
  font-size: 0.85rem;
}

.drawer-accordion-enter-active,
.drawer-accordion-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.drawer-accordion-enter-from,
.drawer-accordion-leave-to {
  opacity: 0;
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
