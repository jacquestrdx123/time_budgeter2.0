<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="page-header">
        <div>
          <h1>Day Planner</h1>
          <p>Drag projects onto the timeline to plan your day.</p>
        </div>
        <div class="header-controls">
          <div class="user-selector">
            <label class="selector-label">Planning for</label>
            <select
              class="selector-select"
              :value="selectedUserId"
              @change="onUserChange($event)"
              :disabled="loadingUsers"
            >
              <option v-if="loadingUsers" :value="null">Loading users...</option>
              <option
                v-for="u in users"
                :key="u.id"
                :value="u.id"
              >{{ u.name }}</option>
            </select>
          </div>
          <div class="header-date">
            <button class="date-btn" @click="prevDay">&larr;</button>
            <span class="date-display">{{ formattedDate }}</span>
            <button class="date-btn" @click="nextDay">&rarr;</button>
            <button v-if="!isToday" class="date-btn today-btn" @click="goToday">Today</button>
          </div>
        </div>
      </div>

      <div v-if="loadingProjects" class="loading-state">
        <span class="spinner"></span>
        Loading projects...
      </div>

      <div v-else class="planner-layout">
        <!-- Project palette -->
        <aside class="palette">
          <h3>Projects</h3>
          <p class="palette-hint">Drag a project onto the timeline</p>
          <div
            v-for="project in projects"
            :key="project.id"
            class="palette-card"
            draggable="true"
            @dragstart="onDragStart($event, project)"
          >
            <span class="palette-dot" :style="{ background: projectColor(project.id) }"></span>
            <span class="palette-name">{{ project.name }}</span>
          </div>
          <div v-if="projects.length === 0" class="palette-empty">
            No projects yet.
            <router-link to="/projects/new">Create one</router-link>
          </div>
        </aside>

        <!-- Timeline -->
        <section class="timeline-wrapper">
          <div class="timeline-summary">
            <span class="summary-total">
              {{ totalPlannedHours.toFixed(1) }}h planned
            </span>
            <span class="summary-remaining" :class="{ 'over-budget': remainingHours < 0 }">
              {{ remainingHours >= 0 ? remainingHours.toFixed(1) + 'h remaining' : Math.abs(remainingHours).toFixed(1) + 'h over' }}
            </span>
            <div class="summary-actions">
              <button
                class="btn-save"
                :disabled="blocks.length === 0 || saving"
                @click="saveAll"
              >
                {{ saving ? 'Saving...' : 'Save Shifts' }}
              </button>
            </div>
          </div>

          <div class="timeline-bar">
            <div class="timeline-bar-fill" :style="{ width: barPercent + '%' }"></div>
            <span class="timeline-bar-label">{{ totalPlannedHours.toFixed(1) }} / {{ dayHours }}h</span>
          </div>

          <div
            class="timeline-drop"
            @dragover.prevent="onDragOver"
            @drop.prevent="onDrop"
          >
            <div v-if="loadingShifts" class="drop-placeholder">
              <span class="spinner"></span> Loading shifts...
            </div>
            <div v-else-if="blocks.length === 0" class="drop-placeholder">
              Drop a project here to start planning
            </div>

            <TransitionGroup name="block-list" tag="div" class="blocks-container">
              <div
                v-for="(block, idx) in blocks"
                :key="block.key"
                class="time-block"
                :style="{ borderLeftColor: projectColor(block.project.id) }"
                draggable="true"
                @dragstart="onBlockDragStart($event, idx)"
                @dragover.prevent="onBlockDragOver($event, idx)"
                @drop.prevent="onBlockDrop($event, idx)"
              >
                <div class="block-header">
                  <span class="block-dot" :style="{ background: projectColor(block.project.id) }"></span>
                  <span class="block-name">{{ block.project.name }}</span>
                  <button class="block-remove" @click="removeBlock(idx)" title="Remove">&times;</button>
                </div>
                <div class="block-controls">
                  <label class="block-label">Hours</label>
                  <div class="stepper">
                    <button class="stepper-btn" @click="adjustHours(idx, -0.5)" :disabled="block.hours <= 0.5">
                      &minus;
                    </button>
                    <input
                      type="number"
                      class="stepper-input"
                      :value="block.hours"
                      min="0.5"
                      max="24"
                      step="0.5"
                      @change="setHours(idx, $event)"
                    />
                    <button class="stepper-btn" @click="adjustHours(idx, 0.5)">+</button>
                  </div>
                  <span class="block-time-range">{{ blockTimeRange(idx) }}</span>
                </div>
                <div class="block-bar">
                  <div
                    class="block-bar-fill"
                    :style="{
                      width: (block.hours / dayHours * 100) + '%',
                      background: projectColor(block.project.id),
                    }"
                  ></div>
                </div>
              </div>
            </TransitionGroup>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import NavBar from '@/components/NavBar.vue'
import projectService from '@/services/projects'
import { shiftService } from '@/services/shifts'
import { userService } from '@/services/users'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'

const PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#f97316',
  '#6366f1', '#14b8a6', '#e11d48', '#84cc16',
]

let blockIdCounter = 0

export default {
  name: 'PlannerView',
  components: { NavBar },
  setup() {
    const auth = useAuthStore()
    const toast = useToastStore()
    const settingsStore = useSettingsStore()

    const projects = ref([])
    const blocks = ref([])
    const loadingProjects = ref(true)
    const loadingUsers = ref(true)
    const loadingShifts = ref(false)
    const saving = ref(false)
    const selectedDate = ref(stripTime(new Date()))
    const dayHours = computed(() => settingsStore.dayHours)
    const dayStartHour = computed(() => settingsStore.dayStartHour)

    const users = ref([])
    const selectedUserId = ref(auth.user?.id || null)

    let draggedBlockIdx = null

    onMounted(async () => {
      const [projectRes, userRes] = await Promise.allSettled([
        projectService.list(),
        userService.list(),
      ])

      if (projectRes.status === 'fulfilled') {
        projects.value = projectRes.value.data
      } else {
        toast.error('Failed to load projects')
      }
      loadingProjects.value = false

      if (userRes.status === 'fulfilled') {
        users.value = userRes.value
        if (!selectedUserId.value && users.value.length > 0) {
          selectedUserId.value = users.value[0].id
        }
      } else {
        toast.error('Failed to load users')
      }
      loadingUsers.value = false

      await loadExistingShifts()
    })

    function onUserChange(event) {
      selectedUserId.value = Number(event.target.value)
    }

    watch([selectedUserId, selectedDate], () => {
      loadExistingShifts()
    })

    async function loadExistingShifts() {
      if (!selectedUserId.value) return
      loadingShifts.value = true
      try {
        const dateStr = formatDateParam(selectedDate.value)
        const shifts = await shiftService.list({ user_id: selectedUserId.value, date: dateStr })
        const projectMap = {}
        for (const p of projects.value) {
          projectMap[p.id] = p
        }
        blocks.value = shifts.map(s => ({
          key: ++blockIdCounter,
          project: projectMap[s.project_id] || { id: s.project_id, name: `Project #${s.project_id}` },
          hours: Math.round((new Date(s.end_time) - new Date(s.start_time)) / 3600000 * 10) / 10,
          shiftId: s.id,
        }))
      } catch {
        toast.error('Failed to load shifts')
      } finally {
        loadingShifts.value = false
      }
    }

    function formatDateParam(d) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    function stripTime(d) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }

    const formattedDate = computed(() =>
      selectedDate.value.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    )

    const isToday = computed(() =>
      stripTime(new Date()).getTime() === selectedDate.value.getTime()
    )

    function prevDay() {
      const d = new Date(selectedDate.value)
      d.setDate(d.getDate() - 1)
      selectedDate.value = d
    }
    function nextDay() {
      const d = new Date(selectedDate.value)
      d.setDate(d.getDate() + 1)
      selectedDate.value = d
    }
    function goToday() {
      selectedDate.value = stripTime(new Date())
    }

    const totalPlannedHours = computed(() =>
      blocks.value.reduce((sum, b) => sum + b.hours, 0)
    )

    const remainingHours = computed(() => dayHours.value - totalPlannedHours.value)

    const barPercent = computed(() =>
      Math.min((totalPlannedHours.value / dayHours.value) * 100, 100)
    )

    function projectColor(id) {
      return PALETTE[id % PALETTE.length]
    }

    function onDragStart(event, project) {
      draggedBlockIdx = null
      event.dataTransfer.setData('application/json', JSON.stringify(project))
      event.dataTransfer.effectAllowed = 'copy'
    }

    function onDragOver() {
      // allow drop
    }

    function onDrop(event) {
      if (draggedBlockIdx !== null) return
      const raw = event.dataTransfer.getData('application/json')
      if (!raw) return
      try {
        const project = JSON.parse(raw)
        blocks.value.push({
          key: ++blockIdCounter,
          project,
          hours: 1,
        })
      } catch { /* ignore bad data */ }
    }

    function onBlockDragStart(event, idx) {
      draggedBlockIdx = idx
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(idx))
    }

    function onBlockDragOver(event, idx) {
      if (draggedBlockIdx === null || draggedBlockIdx === idx) return
      const dragged = blocks.value.splice(draggedBlockIdx, 1)[0]
      blocks.value.splice(idx, 0, dragged)
      draggedBlockIdx = idx
    }

    function onBlockDrop() {
      draggedBlockIdx = null
    }

    function removeBlock(idx) {
      blocks.value.splice(idx, 1)
    }

    function adjustHours(idx, delta) {
      const newVal = Math.round((blocks.value[idx].hours + delta) * 10) / 10
      if (newVal >= 0.5) blocks.value[idx].hours = newVal
    }

    function setHours(idx, event) {
      const val = parseFloat(event.target.value)
      if (!isNaN(val) && val >= 0.5) {
        blocks.value[idx].hours = Math.round(val * 2) / 2
      }
    }

    function blockTimeRange(idx) {
      const base = new Date(selectedDate.value)
      base.setHours(dayStartHour.value, 0, 0, 0)
      let offset = 0
      for (let i = 0; i < idx; i++) offset += blocks.value[i].hours
      const start = new Date(base.getTime() + offset * 3600000)
      const end = new Date(start.getTime() + blocks.value[idx].hours * 3600000)
      return formatTime(start) + ' – ' + formatTime(end)
    }

    function formatTime(d) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }

    const selectedUserName = computed(() => {
      const u = users.value.find(u => u.id === selectedUserId.value)
      return u ? u.name : ''
    })

    async function saveAll() {
      if (blocks.value.length === 0) return
      saving.value = true
      const base = new Date(selectedDate.value)
      base.setHours(dayStartHour.value, 0, 0, 0)

      // Delete existing shifts for this user+date first
      const existingBlocks = blocks.value.filter(b => b.shiftId)
      for (const block of existingBlocks) {
        try {
          await shiftService.remove(block.shiftId)
        } catch { /* ignore */ }
      }

      let offset = 0
      let allOk = true

      for (const block of blocks.value) {
        const start = new Date(base.getTime() + offset * 3600000)
        const end = new Date(start.getTime() + block.hours * 3600000)
        offset += block.hours

        try {
          await shiftService.create({
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            user_id: selectedUserId.value,
            project_id: block.project.id,
          })
        } catch {
          allOk = false
        }
      }

      saving.value = false
      if (allOk) {
        toast.success(`${blocks.value.length} shift(s) saved for ${selectedUserName.value}!`)
        await loadExistingShifts()
      } else {
        toast.error('Some shifts failed to save')
      }
    }

    return {
      projects,
      blocks,
      loadingProjects,
      loadingUsers,
      loadingShifts,
      saving,
      dayHours,
      users,
      selectedUserId,
      selectedUserName,
      onUserChange,
      formattedDate,
      isToday,
      prevDay,
      nextDay,
      goToday,
      totalPlannedHours,
      remainingHours,
      barPercent,
      projectColor,
      onDragStart,
      onDragOver,
      onDrop,
      onBlockDragStart,
      onBlockDragOver,
      onBlockDrop,
      removeBlock,
      adjustHours,
      setHours,
      blockTimeRange,
      saveAll,
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
  max-width: 1100px;
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

/* Header controls */
.header-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

/* User selector */
.user-selector {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.selector-label {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.selector-select {
  padding: 0.45rem 2rem 0.45rem 0.75rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.6rem center;
  transition: border-color 0.2s, background 0.2s;
  min-width: 160px;
}

.selector-select:hover {
  border-color: #3b82f6;
}

.selector-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.selector-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

/* Layout */
.planner-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 700px) {
  .planner-layout {
    grid-template-columns: 1fr;
  }
}

/* Palette */
.palette {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 1.25rem;
  position: sticky;
  top: 1rem;
}

.palette h3 {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0 0 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.palette-hint {
  font-size: 0.78rem;
  color: #64748b;
  margin: 0 0 1rem;
}

.palette-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.75rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  cursor: grab;
  transition: border-color 0.2s, transform 0.15s;
  user-select: none;
}

.palette-card:hover {
  border-color: #3b82f6;
  transform: translateY(-1px);
}

.palette-card:active {
  cursor: grabbing;
  transform: scale(0.97);
}

.palette-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.palette-name {
  font-size: 0.88rem;
  color: #e2e8f0;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette-empty {
  color: #64748b;
  font-size: 0.85rem;
  text-align: center;
  padding: 1rem 0;
}

.palette-empty a {
  color: #3b82f6;
  text-decoration: none;
}

.palette-empty a:hover {
  text-decoration: underline;
}

/* Timeline */
.timeline-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.timeline-summary {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.summary-total {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f1f5f9;
}

.summary-remaining {
  font-size: 0.9rem;
  color: #34d399;
  font-weight: 500;
}

.summary-remaining.over-budget {
  color: #f87171;
}

.summary-actions {
  margin-left: auto;
}

.btn-save {
  padding: 0.6rem 1.4rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-save:hover:not(:disabled) {
  background: #2563eb;
}

.btn-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Progress bar */
.timeline-bar {
  position: relative;
  height: 8px;
  background: #1e293b;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #334155;
}

.timeline-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.timeline-bar-label {
  position: absolute;
  right: 8px;
  top: -20px;
  font-size: 0.7rem;
  color: #64748b;
}

/* Drop zone */
.timeline-drop {
  min-height: 200px;
  background: #1e293b;
  border: 2px dashed #334155;
  border-radius: 12px;
  padding: 1rem;
  transition: border-color 0.2s, background 0.2s;
}

.timeline-drop:hover {
  border-color: #475569;
}

.drop-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 160px;
  color: #475569;
  font-size: 0.95rem;
  font-weight: 500;
}

/* Block cards */
.blocks-container {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.time-block {
  background: #0f172a;
  border: 1px solid #334155;
  border-left: 4px solid;
  border-radius: 10px;
  padding: 1rem 1.15rem;
  cursor: grab;
  transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
}

.time-block:active {
  cursor: grabbing;
}

.time-block:hover {
  border-color: #475569;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.block-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.block-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.block-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #f1f5f9;
  flex: 1;
}

.block-remove {
  background: none;
  border: none;
  color: #64748b;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.25rem;
  line-height: 1;
  transition: color 0.2s;
}

.block-remove:hover {
  color: #f87171;
}

/* Controls */
.block-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}

.block-label {
  font-size: 0.78rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid #334155;
  border-radius: 6px;
  overflow: hidden;
}

.stepper-btn {
  width: 32px;
  height: 32px;
  background: #1e293b;
  border: none;
  color: #cbd5e1;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.stepper-btn:hover:not(:disabled) {
  background: #334155;
}

.stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stepper-input {
  width: 50px;
  text-align: center;
  border: none;
  border-left: 1px solid #334155;
  border-right: 1px solid #334155;
  background: #0f172a;
  color: #f1f5f9;
  font-size: 0.9rem;
  font-weight: 600;
  height: 32px;
  -moz-appearance: textfield;
}

.stepper-input::-webkit-outer-spin-button,
.stepper-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.block-time-range {
  font-size: 0.8rem;
  color: #64748b;
  margin-left: auto;
}

/* Mini progress per block */
.block-bar {
  height: 4px;
  background: #1e293b;
  border-radius: 2px;
  overflow: hidden;
}

.block-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
  opacity: 0.7;
}

/* Transition group animation */
.block-list-enter-active,
.block-list-leave-active {
  transition: all 0.3s ease;
}

.block-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.block-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.block-list-move {
  transition: transform 0.3s ease;
}

/* Loading */
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
</style>
