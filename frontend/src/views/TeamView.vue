<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="page-header">
        <div>
          <h1>Team Schedule</h1>
          <p>See everyone's planned shifts at a glance.</p>
          <router-link v-if="auth.isAdmin" to="/team/members" class="team-members-link">Manage team members</router-link>
        </div>
        <div class="header-controls">
          <div class="view-toggle">
            <button
              class="toggle-btn"
              :class="{ active: viewMode === 'day' }"
              @click="viewMode = 'day'"
            >Day</button>
            <button
              class="toggle-btn"
              :class="{ active: viewMode === 'week' }"
              @click="viewMode = 'week'"
            >Week</button>
          </div>
          <div class="header-date">
            <button class="date-btn" @click="prev">&larr;</button>
            <span class="date-display">{{ headerLabel }}</span>
            <button class="date-btn" @click="next">&rarr;</button>
            <button v-if="!isCurrent" class="date-btn today-btn" @click="goToday">Today</button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <span class="spinner"></span>
        Loading team schedule...
      </div>

      <div v-else-if="users.length === 0" class="empty-state">
        <h3>No team members</h3>
        <p>No users have been registered yet.</p>
      </div>

      <!-- DAY VIEW -->
      <div v-else-if="viewMode === 'day'" class="day-view">
        <div class="timeline-header">
          <div class="user-col-header">Team Member</div>
          <div class="hours-track">
            <span
              v-for="h in dayHourLabels"
              :key="h"
              class="hour-label"
              :style="{ left: hourPercent(h) + '%' }"
            >{{ formatHourLabel(h) }}</span>
          </div>
        </div>

        <div
          v-for="user in users"
          :key="user.id"
          class="user-row"
        >
          <div class="user-col">
            <span class="user-avatar">{{ initials(user.name) }}</span>
            <div class="user-info">
              <span class="user-name">{{ user.name }}</span>
              <span class="user-hours">{{ userDayHours(user.id) }}h</span>
            </div>
          </div>
          <div class="hours-track">
            <div class="track-bg"></div>
            <div
              v-for="block in userDayBlocks(user.id)"
              :key="block.id"
              class="shift-block"
              :style="{
                left: blockLeft(block) + '%',
                width: blockWidth(block) + '%',
                background: projectColor(block.project_id),
              }"
              :title="blockTooltip(block)"
            >
              <span class="shift-block-label">{{ projectName(block.project_id) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- WEEK VIEW -->
      <div v-else class="week-view">
        <div class="week-header">
          <div class="user-col-header">Team Member</div>
          <div
            v-for="day in weekDays"
            :key="day.key"
            class="week-day-header"
            :class="{ 'is-today': day.isToday }"
          >
            <span class="weekday-name">{{ day.short }}</span>
            <span class="weekday-date">{{ day.date }}</span>
          </div>
          <div class="week-total-header">Total</div>
        </div>

        <div
          v-for="user in users"
          :key="user.id"
          class="user-row-week"
        >
          <div class="user-col">
            <span class="user-avatar">{{ initials(user.name) }}</span>
            <div class="user-info">
              <span class="user-name">{{ user.name }}</span>
            </div>
          </div>
          <div
            v-for="day in weekDays"
            :key="day.key"
            class="week-cell"
            :class="{ 'is-today': day.isToday }"
          >
            <div v-if="userDayShifts(user.id, day.key).length > 0" class="cell-blocks">
              <div
                v-for="s in userDayShifts(user.id, day.key)"
                :key="s.id"
                class="cell-chip"
                :style="{ background: projectColor(s.project_id) }"
                :title="projectName(s.project_id) + ': ' + shiftHours(s) + 'h'"
              >
                <span class="chip-name">{{ projectName(s.project_id) }}</span>
                <span class="chip-hours">{{ shiftHours(s) }}h</span>
              </div>
            </div>
            <span v-else class="cell-empty">&mdash;</span>
            <span class="cell-total" v-if="userDayTotal(user.id, day.key) > 0">
              {{ userDayTotal(user.id, day.key) }}h
            </span>
          </div>
          <div class="week-total-cell">
            <strong>{{ userWeekTotal(user.id) }}h</strong>
          </div>
        </div>

        <!-- Team totals row -->
        <div class="user-row-week totals-row">
          <div class="user-col">
            <span class="totals-label">Team Total</span>
          </div>
          <div
            v-for="day in weekDays"
            :key="day.key"
            class="week-cell"
            :class="{ 'is-today': day.isToday }"
          >
            <strong class="team-day-total">{{ teamDayTotal(day.key) }}h</strong>
          </div>
          <div class="week-total-cell">
            <strong class="team-grand-total">{{ teamWeekTotal }}h</strong>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div v-if="!loading && projectList.length > 0" class="legend">
        <span class="legend-title">{{ settingsStore.projectDescriptionPlural }}</span>
        <div class="legend-items">
          <span
            v-for="p in projectList"
            :key="p.id"
            class="legend-item"
          >
            <span class="legend-dot" :style="{ background: projectColor(p.id) }"></span>
            {{ p.name }}
          </span>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { userService } from '@/services/users'
import { shiftService } from '@/services/shifts'
import projectService from '@/services/projects'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'

const PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#f97316',
  '#6366f1', '#14b8a6', '#e11d48', '#84cc16',
]

export default {
  name: 'TeamView',
  components: { NavBar },
  setup() {
    const auth = useAuthStore()
    const toast = useToastStore()
    const settingsStore = useSettingsStore()

    const dayStartHour = computed(() => settingsStore.dayStartHour)
    const dayEndHour = computed(() => settingsStore.dayEndHour)

    const viewMode = ref('day')
    const selectedDate = ref(stripTime(new Date()))
    const users = ref([])
    const shifts = ref([])
    const projectList = ref([])
    const loading = ref(true)

    onMounted(async () => {
      try {
        const [uRes, pRes] = await Promise.allSettled([
          userService.list(),
          projectService.list(),
        ])
        if (uRes.status === 'fulfilled') users.value = uRes.value
        if (pRes.status === 'fulfilled') projectList.value = pRes.value.data
      } catch {
        toast.error('Failed to load team data')
      }
      await fetchShifts()
      loading.value = false
    })

    watch([viewMode, selectedDate], () => {
      fetchShifts()
    })

    async function fetchShifts() {
      try {
        if (viewMode.value === 'day') {
          shifts.value = await shiftService.list({ date: fmtDate(selectedDate.value) })
        } else {
          const monday = getMonday(selectedDate.value)
          const sunday = new Date(monday)
          sunday.setDate(sunday.getDate() + 6)
          shifts.value = await shiftService.list({
            date_from: fmtDate(monday),
            date_to: fmtDate(sunday),
          })
        }
      } catch {
        toast.error('Failed to load shifts')
      }
    }

    // Helpers
    function stripTime(d) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }

    function fmtDate(d) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    function getMonday(d) {
      const dt = new Date(d)
      const day = dt.getDay()
      const diff = day === 0 ? -6 : 1 - day
      dt.setDate(dt.getDate() + diff)
      return stripTime(dt)
    }

    // Navigation
    function prev() {
      const d = new Date(selectedDate.value)
      d.setDate(d.getDate() - (viewMode.value === 'week' ? 7 : 1))
      selectedDate.value = d
    }

    function next() {
      const d = new Date(selectedDate.value)
      d.setDate(d.getDate() + (viewMode.value === 'week' ? 7 : 1))
      selectedDate.value = d
    }

    function goToday() {
      selectedDate.value = stripTime(new Date())
    }

    const isCurrent = computed(() => {
      const today = stripTime(new Date())
      if (viewMode.value === 'day') {
        return selectedDate.value.getTime() === today.getTime()
      }
      const selMonday = getMonday(selectedDate.value)
      const todayMonday = getMonday(today)
      return selMonday.getTime() === todayMonday.getTime()
    })

    const headerLabel = computed(() => {
      if (viewMode.value === 'day') {
        return selectedDate.value.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      }
      const monday = getMonday(selectedDate.value)
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      const opts = { month: 'short', day: 'numeric' }
      return monday.toLocaleDateString('en-US', opts) + ' – ' + sunday.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
    })

    // Day view helpers
    const dayHourLabels = computed(() => {
      const labels = []
      for (let h = dayStartHour.value; h <= dayEndHour.value; h++) labels.push(h)
      return labels
    })

    function hourPercent(h) {
      return ((h - dayStartHour.value) / (dayEndHour.value - dayStartHour.value)) * 100
    }

    function formatHourLabel(h) {
      const suffix = h >= 12 ? 'p' : 'a'
      const display = h > 12 ? h - 12 : h === 0 ? 12 : h
      return display + suffix
    }

    function userDayBlocks(userId) {
      return shifts.value.filter(s => s.user_id === userId)
    }

    function userDayHours(userId) {
      return round(userDayBlocks(userId).reduce((sum, s) => sum + shiftHours(s), 0))
    }

    function blockLeft(block) {
      const d = new Date(block.start_time)
      const hourDecimal = d.getHours() + d.getMinutes() / 60
      return Math.max(((hourDecimal - dayStartHour.value) / (dayEndHour.value - dayStartHour.value)) * 100, 0)
    }

    function blockWidth(block) {
      const hours = shiftHours(block)
      return Math.max((hours / (dayEndHour.value - dayStartHour.value)) * 100, 1)
    }

    function blockTooltip(block) {
      const name = projectName(block.project_id)
      const start = new Date(block.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const end = new Date(block.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      return `${name}: ${start} – ${end} (${shiftHours(block)}h)`
    }

    // Week view helpers
    const weekDays = computed(() => {
      const monday = getMonday(selectedDate.value)
      const today = stripTime(new Date())
      const days = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setDate(d.getDate() + i)
        days.push({
          key: fmtDate(d),
          short: d.toLocaleDateString('en-US', { weekday: 'short' }),
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          isToday: d.getTime() === today.getTime(),
        })
      }
      return days
    })

    function userDayShifts(userId, dayKey) {
      return shifts.value.filter(s => {
        if (s.user_id !== userId) return false
        const d = new Date(s.start_time)
        return fmtDate(d) === dayKey
      })
    }

    function userDayTotal(userId, dayKey) {
      return round(userDayShifts(userId, dayKey).reduce((sum, s) => sum + shiftHours(s), 0))
    }

    function userWeekTotal(userId) {
      return round(
        shifts.value
          .filter(s => s.user_id === userId)
          .reduce((sum, s) => sum + shiftHours(s), 0)
      )
    }

    function teamDayTotal(dayKey) {
      return round(
        users.value.reduce((sum, u) => sum + userDayTotal(u.id, dayKey), 0)
      )
    }

    const teamWeekTotal = computed(() =>
      round(shifts.value.reduce((sum, s) => sum + shiftHours(s), 0))
    )

    // Shared helpers
    function shiftHours(s) {
      return round((new Date(s.end_time) - new Date(s.start_time)) / 3600000)
    }

    function round(n) {
      return Math.round(n * 10) / 10
    }

    function projectColor(id) {
      return PALETTE[id % PALETTE.length]
    }

    function projectName(id) {
      const p = projectList.value.find(p => p.id === id)
      return p ? p.name : `#${id}`
    }

    function initials(name) {
      return name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    return {
      auth,
      settingsStore,
      viewMode,
      selectedDate,
      users,
      shifts,
      projectList,
      loading,
      prev,
      next,
      goToday,
      isCurrent,
      headerLabel,
      dayHourLabels,
      hourPercent,
      formatHourLabel,
      userDayBlocks,
      userDayHours,
      blockLeft,
      blockWidth,
      blockTooltip,
      weekDays,
      userDayShifts,
      userDayTotal,
      userWeekTotal,
      teamDayTotal,
      teamWeekTotal,
      shiftHours,
      projectColor,
      projectName,
      initials,
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
  max-width: 1200px;
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

.team-members-link {
  display: inline-block;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #60a5fa;
  text-decoration: none;
}

.team-members-link:hover {
  color: #93c5fd;
  text-decoration: underline;
}

/* Header controls */
.header-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

/* View toggle */
.view-toggle {
  display: flex;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  overflow: hidden;
}

.toggle-btn {
  padding: 0.4rem 1rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:not(:last-child) {
  border-right: 1px solid #334155;
}

.toggle-btn.active {
  background: #3b82f6;
  color: white;
}

.toggle-btn:hover:not(.active) {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.05);
}

/* Date nav */
.header-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-display {
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.95rem;
  min-width: 200px;
  text-align: center;
}

.date-btn {
  padding: 0.4rem 0.7rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #cbd5e1;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.date-btn:hover {
  background: #334155;
  color: #f1f5f9;
}

.today-btn {
  font-size: 0.8rem;
  color: #3b82f6;
  border-color: #3b82f6;
}

.today-btn:hover {
  background: rgba(59, 130, 246, 0.15);
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

/* User column shared */
.user-col {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 130px;
  padding: 0 0.6rem;
}

.user-col-header {
  min-width: 130px;
  padding: 0 0.6rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #334155;
  color: #e2e8f0;
  font-size: 0.6rem;
  font-weight: 700;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-hours {
  font-size: 0.65rem;
  color: #64748b;
}

/* =========================
   DAY VIEW
   ========================= */
.day-view {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
}

.timeline-header {
  display: flex;
  align-items: center;
  padding: 0.4rem 0;
  border-bottom: 1px solid #334155;
}

.user-row {
  display: flex;
  align-items: center;
  padding: 0.3rem 0;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
  transition: background 0.15s;
}

.user-row:last-child {
  border-bottom: none;
}

.user-row:hover {
  background: rgba(59, 130, 246, 0.04);
}

.hours-track {
  flex: 1;
  position: relative;
  height: 22px;
  margin: 0 0.5rem;
}

.track-bg {
  position: absolute;
  inset: 0;
  background: #0f172a;
  border-radius: 4px;
  border: 1px solid #334155;
}

.hour-label {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.55rem;
  color: #475569;
  pointer-events: none;
}

.shift-block {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  padding: 0 4px;
  overflow: hidden;
  cursor: default;
  transition: opacity 0.2s;
  z-index: 1;
}

.shift-block:hover {
  opacity: 0.85;
}

.shift-block-label {
  font-size: 0.58rem;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* =========================
   WEEK VIEW
   ========================= */
.week-view {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow-x: auto;
}

.week-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #334155;
  padding: 0.75rem 0;
}

.week-day-header {
  flex: 1;
  min-width: 100px;
  text-align: center;
  padding: 0 0.25rem;
}

.week-day-header.is-today {
  background: rgba(59, 130, 246, 0.08);
  border-radius: 8px;
}

.weekday-name {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.weekday-date {
  display: block;
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 2px;
}

.week-total-header {
  min-width: 70px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0 0.5rem;
}

.user-row-week {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
  min-height: 56px;
}

.user-row-week:last-child {
  border-bottom: none;
}

.user-row-week:hover {
  background: rgba(59, 130, 246, 0.04);
}

.user-row-week .user-col {
  padding-top: 0.65rem;
  padding-bottom: 0.65rem;
}

.week-cell {
  flex: 1;
  min-width: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.25rem;
  gap: 0.25rem;
  border-left: 1px solid rgba(51, 65, 85, 0.3);
}

.week-cell.is-today {
  background: rgba(59, 130, 246, 0.06);
}

.week-total-cell {
  min-width: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.5rem;
  border-left: 1px solid rgba(51, 65, 85, 0.3);
  color: #e2e8f0;
  font-size: 0.88rem;
}

.cell-blocks {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 0 4px;
}

.cell-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 3px 6px;
  border-radius: 4px;
  overflow: hidden;
}

.chip-name {
  font-size: 0.65rem;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.chip-hours {
  font-size: 0.6rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

.cell-empty {
  color: #334155;
  font-size: 0.85rem;
}

.cell-total {
  font-size: 0.68rem;
  color: #64748b;
  font-weight: 500;
}

/* Totals row */
.totals-row {
  background: rgba(15, 23, 42, 0.4);
}

.totals-row:hover {
  background: rgba(15, 23, 42, 0.4) !important;
}

.totals-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #94a3b8;
  padding-left: 0.75rem;
}

.team-day-total {
  font-size: 0.85rem;
  color: #cbd5e1;
}

.team-grand-total {
  font-size: 0.95rem;
  color: #3b82f6;
}

/* Legend */
.legend {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.legend-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.legend-items {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #94a3b8;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
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
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 800px) {
  .user-col {
    min-width: 100px;
  }
  .user-col-header {
    min-width: 100px;
  }
  .week-cell {
    min-width: 75px;
  }
  .date-display {
    min-width: 160px;
    font-size: 0.85rem;
  }
}
</style>
