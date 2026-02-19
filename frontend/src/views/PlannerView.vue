<template>
  <div class="page">
    <NavBar />
    <main class="page-content">
      <div class="page-header">
        <div>
          <h1>Day Planner</h1>
          <p>Drag {{ settingsStore.projectDescriptionPlural.toLowerCase() }} onto the timeline to plan your day.</p>
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
        Loading {{ settingsStore.projectDescriptionPlural.toLowerCase() }}...
      </div>

      <div v-else class="planner-layout">
        <!-- Project palette -->
        <aside class="palette">
          <h3>{{ settingsStore.projectDescriptionPlural }}</h3>
          <p class="palette-hint">Drag a {{ settingsStore.projectDescription.toLowerCase() }} onto the timeline</p>
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
            No {{ settingsStore.projectDescriptionPlural.toLowerCase() }} yet.
            <router-link to="/projects/new">Create one</router-link>
          </div>

          <div class="palette-divider"></div>
          <h3>Breaks</h3>
          <p class="palette-hint">Drag a break onto the timeline</p>
          <div
            v-for="bt in breakTypes"
            :key="bt.type"
            class="palette-card palette-card--break"
            draggable="true"
            @dragstart="onBreakDragStart($event, bt)"
          >
            <span class="palette-break-icon">{{ bt.icon }}</span>
            <span class="palette-name">{{ bt.type }}</span>
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
                :disabled="saving"
                @click="saveAll"
              >
                {{ saving ? 'Saving...' : (blocks.length === 0 ? 'Clear Shifts' : 'Save Shifts') }}
              </button>
            </div>
          </div>

          <div class="timeline-bar">
            <div class="timeline-bar-fill" :style="{ width: barPercent + '%' }"></div>
            <span class="timeline-bar-label">{{ totalPlannedHours.toFixed(1) }} / {{ dayHours }}h</span>
          </div>

          <div class="timeline-grid">
            <!-- Time ruler + slots -->
            <div class="time-ruler">
              <div
                v-for="slot in timeSlots"
                :key="slot.label"
                class="time-slot"
                :class="{ 'time-slot-hour': slot.isHour }"
              >
                <span class="time-slot-label">{{ slot.label }}</span>
                <div class="time-slot-line"></div>
              </div>
            </div>

            <!-- Blocks overlay -->
            <div
              ref="blocksAreaRef"
              class="timeline-blocks"
              :style="{ minHeight: timeSlots.length * 48 + 'px' }"
              @dragover.prevent="onGridDragOver"
              @dragleave="onGridDragLeave"
              @drop.prevent="onGridDrop"
            >
              <!-- Grid lines -->
              <div
                v-for="(slot, si) in timeSlots"
                :key="'line-' + si"
                class="grid-line"
                :class="{ 'grid-line-hour': slot.isHour }"
                :style="{ top: si * 48 + 'px' }"
              ></div>

              <!-- Drop indicator -->
              <div
                v-if="dropIndicatorSlot >= 0"
                class="drop-indicator"
                :style="{ top: dropIndicatorSlot * 48 + 'px' }"
              >
                <span class="drop-indicator-label">{{ slotLabel(dropIndicatorSlot) }}</span>
              </div>

              <div v-if="loadingShifts" class="drop-placeholder">
                <span class="spinner"></span> Loading shifts...
              </div>
              <div v-else-if="blocks.length === 0 && dropIndicatorSlot < 0" class="drop-placeholder">
                Drop a project here to start planning
              </div>

              <div class="blocks-positioned">
                <div
                  v-for="(block, idx) in blocks"
                  :key="block.key"
                  class="time-block"
                  :class="{ 'block-dragging': draggingBlockIdx === idx, 'time-block--break': block.isBreak }"
                  :style="{
                    borderLeftColor: block.isBreak ? '#f59e0b' : projectColor(block.project.id),
                    top: block.startSlot * 48 + 'px',
                    height: blockHeight(block.hours) + 'px',
                  }"
                  draggable="true"
                  @dragstart="onBlockDragStart($event, idx)"
                  @dragend="onBlockDragEnd"
                >
                  <div class="block-header">
                    <span v-if="block.isBreak" class="block-break-icon">{{ breakIcon(block.breakType) }}</span>
                    <span v-else class="block-dot" :style="{ background: projectColor(block.project.id) }"></span>
                    <span class="block-name">{{ block.isBreak ? block.breakType : block.project.name }}</span>
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
                </div>
              </div>
            </div>
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

const BREAK_TYPES = [
  { type: 'Lunch', icon: '\u{1F35D}' },
  { type: 'Tea Break', icon: '\u2615' },
  { type: 'Coffee Break', icon: '\u2615' },
  { type: 'Rest Break', icon: '\u{1F4A4}' },
]

const SLOT_HEIGHT = 48
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
    const dayEndHour = computed(() => settingsStore.dayEndHour)

    const blocksAreaRef = ref(null)
    const dropIndicatorSlot = ref(-1)
    const draggingBlockIdx = ref(null)
    const dragSource = ref(null) // 'palette' or 'block'

    const totalSlots = computed(() => (dayEndHour.value - dayStartHour.value) * 2)

    const timeSlots = computed(() => {
      const slots = []
      const start = dayStartHour.value
      const end = dayEndHour.value
      for (let h = start; h <= end; h++) {
        slots.push({ label: formatHourLabel(h, 0), isHour: true })
        if (h < end) {
          slots.push({ label: formatHourLabel(h, 30), isHour: false })
        }
      }
      return slots
    })

    function formatHourLabel(hour, minute) {
      const h = hour % 12 || 12
      const ampm = hour < 12 ? 'AM' : 'PM'
      if (minute === 0) return `${h}:00 ${ampm}`
      return `${h}:${String(minute).padStart(2, '0')} ${ampm}`
    }

    function slotLabel(slotIdx) {
      const hour = dayStartHour.value + Math.floor(slotIdx / 2)
      const minute = (slotIdx % 2) * 30
      return formatHourLabel(hour, minute)
    }

    function blockHeight(hours) {
      return Math.max(hours * 2 * SLOT_HEIGHT, SLOT_HEIGHT * 1.6)
    }

    // --- Slot from mouse position ---
    function getSlotFromEvent(event) {
      if (!blocksAreaRef.value) return 0
      const rect = blocksAreaRef.value.getBoundingClientRect()
      const y = event.clientY - rect.top
      const slot = Math.floor(y / SLOT_HEIGHT)
      return Math.max(0, Math.min(slot, totalSlots.value - 1))
    }

    // --- Users ---
    const users = ref([])
    const selectedUserId = ref(auth.user?.id || null)

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
        const base = new Date(selectedDate.value)
        base.setHours(dayStartHour.value, 0, 0, 0)

        blocks.value = shifts.map(s => {
          const shiftStart = new Date(s.start_time)
          const diffMs = shiftStart.getTime() - base.getTime()
          const diffHours = diffMs / 3600000
          const startSlot = Math.round(diffHours * 2)
          const isBreak = s.is_break === 1 || s.is_break === true

          return {
            key: ++blockIdCounter,
            project: isBreak
              ? { id: null, name: s.break_type || 'Break' }
              : (projectMap[s.project_id] || { id: s.project_id, name: `Project #${s.project_id}` }),
            isBreak,
            breakType: isBreak ? (s.break_type || 'Break') : null,
            hours: Math.round((new Date(s.end_time) - shiftStart) / 3600000 * 10) / 10,
            startSlot: Math.max(0, startSlot),
            shiftId: s.id,
          }
        })
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

    const breakTypes = BREAK_TYPES

    function projectColor(id) {
      return PALETTE[id % PALETTE.length]
    }

    function breakIcon(breakType) {
      const bt = BREAK_TYPES.find(b => b.type === breakType)
      return bt ? bt.icon : '\u2615'
    }

    // --- Palette drag ---
    function onDragStart(event, project) {
      dragSource.value = 'palette'
      draggingBlockIdx.value = null
      event.dataTransfer.setData('application/json', JSON.stringify(project))
      event.dataTransfer.effectAllowed = 'copy'
    }

    function onBreakDragStart(event, breakType) {
      dragSource.value = 'palette'
      draggingBlockIdx.value = null
      event.dataTransfer.setData('application/json', JSON.stringify({ _isBreak: true, breakType: breakType.type }))
      event.dataTransfer.effectAllowed = 'copy'
    }

    // --- Block drag ---
    function onBlockDragStart(event, idx) {
      dragSource.value = 'block'
      draggingBlockIdx.value = idx
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', String(idx))
    }

    function onBlockDragEnd() {
      draggingBlockIdx.value = null
      dragSource.value = null
      dropIndicatorSlot.value = -1
    }

    // --- Grid drag events ---
    function onGridDragOver(event) {
      event.dataTransfer.dropEffect = dragSource.value === 'block' ? 'move' : 'copy'
      dropIndicatorSlot.value = getSlotFromEvent(event)
    }

    function onGridDragLeave() {
      dropIndicatorSlot.value = -1
    }

    function onGridDrop(event) {
      const targetSlot = getSlotFromEvent(event)
      dropIndicatorSlot.value = -1

      if (dragSource.value === 'block' && draggingBlockIdx.value !== null) {
        const clampedSlot = Math.max(0, Math.min(targetSlot, totalSlots.value - 1))
        blocks.value[draggingBlockIdx.value].startSlot = clampedSlot
        draggingBlockIdx.value = null
        dragSource.value = null
        return
      }

      const raw = event.dataTransfer.getData('application/json')
      if (!raw) return
      try {
        const data = JSON.parse(raw)
        const clampedSlot = Math.max(0, Math.min(targetSlot, totalSlots.value - 2))
        if (data._isBreak) {
          blocks.value.push({
            key: ++blockIdCounter,
            project: { id: null, name: data.breakType },
            isBreak: true,
            breakType: data.breakType,
            hours: 0.5,
            startSlot: clampedSlot,
          })
        } else {
          blocks.value.push({
            key: ++blockIdCounter,
            project: data,
            isBreak: false,
            hours: 1,
            startSlot: clampedSlot,
          })
        }
      } catch { /* ignore bad data */ }
      dragSource.value = null
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
      const block = blocks.value[idx]
      const base = new Date(selectedDate.value)
      base.setHours(dayStartHour.value, 0, 0, 0)
      const offsetMs = (block.startSlot * 0.5) * 3600000
      const start = new Date(base.getTime() + offsetMs)
      const end = new Date(start.getTime() + block.hours * 3600000)
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
      if (!selectedUserId.value) return
      saving.value = true
      const base = new Date(selectedDate.value)
      base.setHours(dayStartHour.value, 0, 0, 0)
      const dateStr = formatDateParam(selectedDate.value)

      // Delete all existing shifts for this user/date so removals are persisted
      let deleteOk = true
      try {
        const existingShifts = await shiftService.list({
          user_id: selectedUserId.value,
          date: dateStr,
        })
        for (const shift of existingShifts) {
          try {
            await shiftService.remove(shift.id)
          } catch {
            deleteOk = false
          }
        }
      } catch {
        deleteOk = false
      }

      let createOk = true
      for (const block of blocks.value) {
        const offsetMs = (block.startSlot * 0.5) * 3600000
        const start = new Date(base.getTime() + offsetMs)
        const end = new Date(start.getTime() + block.hours * 3600000)

        try {
          const shiftData = {
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            user_id: selectedUserId.value,
          }
          if (block.isBreak) {
            shiftData.is_break = true
            shiftData.break_type = block.breakType || null
            shiftData.project_id = null
          } else {
            shiftData.project_id = block.project.id
          }
          await shiftService.create(shiftData)
        } catch {
          createOk = false
        }
      }

      saving.value = false
      if (deleteOk && createOk) {
        toast.success(
          blocks.value.length === 0
            ? `Shifts cleared for ${selectedUserName.value}`
            : `${blocks.value.length} shift(s) saved for ${selectedUserName.value}!`
        )
        await loadExistingShifts()
      } else {
        toast.error('Some shifts failed to save')
      }
    }

    return {
      settingsStore,
      projects,
      blocks,
      breakTypes,
      loadingProjects,
      loadingUsers,
      loadingShifts,
      saving,
      dayHours,
      timeSlots,
      blocksAreaRef,
      dropIndicatorSlot,
      draggingBlockIdx,
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
      breakIcon,
      slotLabel,
      onDragStart,
      onBreakDragStart,
      onGridDragOver,
      onGridDragLeave,
      onGridDrop,
      onBlockDragStart,
      onBlockDragEnd,
      removeBlock,
      adjustHours,
      setHours,
      blockTimeRange,
      blockHeight,
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

.palette-divider {
  height: 1px;
  background: #334155;
  margin: 1rem 0;
}

.palette-card--break {
  border-color: rgba(245, 158, 11, 0.25);
  background: rgba(245, 158, 11, 0.05);
}

.palette-card--break:hover {
  border-color: #f59e0b;
}

.palette-break-icon {
  font-size: 1rem;
  flex-shrink: 0;
  width: 10px;
  text-align: center;
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

/* Time grid */
.timeline-grid {
  position: relative;
  display: grid;
  grid-template-columns: 80px 1fr;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
}

/* Time ruler */
.time-ruler {
  border-right: 1px solid #334155;
}

.time-slot {
  height: 48px;
  display: flex;
  align-items: flex-start;
  position: relative;
}

.time-slot-label {
  font-size: 0.7rem;
  color: #64748b;
  padding: 4px 8px 0;
  white-space: nowrap;
  line-height: 1;
}

.time-slot-hour .time-slot-label {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
}

.time-slot-line {
  position: absolute;
  top: 0;
  right: -1px;
  width: 12px;
  border-top: 1px solid #334155;
}

.time-slot-hour .time-slot-line {
  border-top-color: #475569;
  width: 16px;
}

/* Blocks area */
.timeline-blocks {
  position: relative;
  min-height: 200px;
  overflow: visible;
}

.grid-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 48px;
  border-top: 1px dashed #1e293b;
  pointer-events: none;
}

.grid-line-hour {
  border-top: 1px solid #334155;
}

/* Drop indicator */
.drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 48px;
  background: rgba(59, 130, 246, 0.12);
  border: 2px dashed rgba(59, 130, 246, 0.5);
  border-radius: 6px;
  z-index: 5;
  pointer-events: none;
  display: flex;
  align-items: center;
  padding-left: 12px;
  transition: top 0.1s ease;
}

.drop-indicator-label {
  font-size: 0.7rem;
  color: #3b82f6;
  font-weight: 600;
}

/* Dragging state */
.block-dragging {
  opacity: 0.35;
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

/* Positioned block wrapper */
.blocks-positioned {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

/* Block cards */
.time-block {
  position: absolute;
  left: 4px;
  right: 4px;
  background: #0f172a;
  border: 1px solid #334155;
  border-left: 4px solid;
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
  cursor: grab;
  overflow: hidden;
  transition: top 0.15s ease, height 0.15s ease, border-color 0.2s, box-shadow 0.2s;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.time-block:active {
  cursor: grabbing;
}

.time-block:hover {
  border-color: #475569;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  z-index: 2;
}

.time-block--break {
  background: rgba(245, 158, 11, 0.06);
  border-color: rgba(245, 158, 11, 0.2);
}

.time-block--break:hover {
  border-color: rgba(245, 158, 11, 0.4);
}

.block-break-icon {
  font-size: 0.9rem;
  flex-shrink: 0;
}

.block-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
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
  margin-bottom: 0;
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
